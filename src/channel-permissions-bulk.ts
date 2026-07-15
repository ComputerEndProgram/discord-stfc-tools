/**
 * Bulk-add (or dry-run) permission overwrites across linked channels.
 * Does not wipe existing member/role overwrites — only PUTs the chosen target(s).
 */
import {
	fetchGuildChannel,
	getBotUserId,
	resolveBotManagedRoleId,
	setChannelPermission,
} from './discord-api';
import {
	DEFAULT_PERSONAL_CHANNEL_BOT_ALLOW,
	DEFAULT_PERSONAL_CHANNEL_MEMBER_ALLOW,
	effectivePersonalChannelPermTemplate,
} from './personal-channel-perm-template';
import { decodePermissionBits } from './channel-permission-audit';
import type { GuildConfig, VerifiedPlayer } from './types';

const VIEW = 0x400n;

export type BulkPermScope = 'personal' | 'diplomacy' | 'staff_logs' | 'survey_logs' | 'all';
export type BulkPermTarget = 'bot' | 'role' | 'extra_roles' | 'template_roles';
export type BulkPermPreset = 'bot' | 'member' | 'view_send';

export type BulkPermTargetSpec = {
	/** Role or user snowflake for the overwrite id */
	id: string;
	/** 0 = role, 1 = member */
	type: 0 | 1;
	label: string;
	allow: string;
	deny: string;
};

export type BulkPermChannelHit = {
	channelId: string;
	channelName: string;
	source: string;
	actions: Array<{
		targetId: string;
		label: string;
		status: 'would_apply' | 'applied' | 'skipped_has_view' | 'failed' | 'inaccessible';
		detail?: string;
	}>;
};

export type BulkPermReport = {
	guildId: string;
	dryRun: boolean;
	scope: BulkPermScope;
	target: BulkPermTarget;
	preset: BulkPermPreset;
	onlyMissing: boolean;
	targets: BulkPermTargetSpec[];
	channelCount: number;
	wouldApply: number;
	applied: number;
	skipped: number;
	failed: number;
	inaccessible: number;
	hits: BulkPermChannelHit[];
	summaryLines: string[];
};

function viewSendAllow(): string {
	return String(0x400 | 0x800 | 0x4000 | 0x8000 | 0x10000);
}

export function resolvePresetBits(
	preset: BulkPermPreset,
	config: GuildConfig,
): { allow: string; deny: string } {
	const tmpl = effectivePersonalChannelPermTemplate(config);
	if (preset === 'bot') return { allow: tmpl.bot.allow || DEFAULT_PERSONAL_CHANNEL_BOT_ALLOW, deny: tmpl.bot.deny || '0' };
	if (preset === 'view_send') return { allow: viewSendAllow(), deny: '0' };
	return { allow: tmpl.member.allow || DEFAULT_PERSONAL_CHANNEL_MEMBER_ALLOW, deny: tmpl.member.deny || '0' };
}

export async function resolveBulkPermTargets(
	token: string,
	guildId: string,
	config: GuildConfig,
	target: BulkPermTarget,
	preset: BulkPermPreset,
	roleId?: string | null,
): Promise<BulkPermTargetSpec[]> {
	const bits = resolvePresetBits(preset, config);
	const out: BulkPermTargetSpec[] = [];

	if (target === 'bot') {
		const botUserId = await getBotUserId(token);
		const botRoleId = await resolveBotManagedRoleId(token, guildId, botUserId);
		const id = botRoleId || botUserId;
		const type: 0 | 1 = botRoleId ? 0 : 1;
		const botBits = preset === 'member' || preset === 'view_send' ? bits : resolvePresetBits('bot', config);
		out.push({
			id,
			type,
			label: botRoleId ? `bot role <@&${botRoleId}>` : `bot user <@${botUserId}>`,
			allow: botBits.allow,
			deny: botBits.deny,
		});
		return out;
	}

	if (target === 'role') {
		if (!roleId || !/^\d{15,20}$/.test(roleId)) {
			throw new Error('Provide `role:` when target is role');
		}
		out.push({
			id: roleId,
			type: 0,
			label: `role <@&${roleId}>`,
			allow: bits.allow,
			deny: bits.deny,
		});
		return out;
	}

	if (target === 'extra_roles') {
		const ids = config.personal_channel_extra_roles ?? [];
		if (!ids.length) throw new Error('No personal_channel_extra_roles configured — use `/channels extra-roles` first');
		for (const id of ids) {
			out.push({ id, type: 0, label: `extra <@&${id}>`, allow: bits.allow, deny: bits.deny });
		}
		return out;
	}

	// template_roles
	const tmpl = effectivePersonalChannelPermTemplate(config);
	if (!tmpl.roles.length) {
		throw new Error('Permission template has no role overwrites — lock one with `/channels permissions-template-from` or use extra_roles');
	}
	for (const r of tmpl.roles) {
		const allow = preset === 'bot' || preset === 'view_send' ? bits.allow : r.allow;
		const deny = preset === 'bot' || preset === 'view_send' ? bits.deny : r.deny;
		out.push({
			id: r.role_id,
			type: 0,
			label: `template <@&${r.role_id}>`,
			allow,
			deny,
		});
	}
	return out;
}

export async function collectBulkPermChannelIds(
	db: D1Database,
	guildId: string,
	config: GuildConfig,
	scope: BulkPermScope,
	players: VerifiedPlayer[],
): Promise<Array<{ channelId: string; source: string }>> {
	const seen = new Set<string>();
	const list: Array<{ channelId: string; source: string }> = [];

	const add = (channelId: string | null | undefined, source: string) => {
		if (!channelId || !/^\d{15,20}$/.test(channelId) || seen.has(channelId)) return;
		seen.add(channelId);
		list.push({ channelId, source });
	};

	const wantPersonal = scope === 'personal' || scope === 'all';
	const wantDiplomacy = scope === 'diplomacy' || scope === 'all';
	const wantStaff = scope === 'staff_logs' || scope === 'all';
	const wantSurvey = scope === 'survey_logs' || scope === 'all';

	if (wantPersonal) {
		for (const p of players) {
			add(p.personal_channel_id, `personal:${p.player_name || p.discord_user_id}`);
		}
	}
	if (wantDiplomacy) {
		for (const [tag, id] of Object.entries(config.diplomacy_channel_map || {})) {
			add(id, `diplomacy:${tag}`);
		}
	}
	if (wantStaff) {
		add(config.verification_log_channel_id, 'staff:verification_log');
		add(config.audit_log_channel_id, 'staff:audit');
		add(config.urgent_notify_channel_id, 'staff:urgent');
	}
	if (wantSurvey) {
		const { results } = await db
			.prepare(
				`SELECT DISTINCT log_channel_id FROM surveys
				 WHERE guild_id = ? AND log_channel_id IS NOT NULL AND TRIM(log_channel_id) != ''`,
			)
			.bind(guildId)
			.all<{ log_channel_id: string }>();
		for (const row of results ?? []) {
			add(row.log_channel_id, 'survey_log');
		}
	}

	return list;
}

function overwriteHasView(
	overwrites: Array<{ id: string; type: number; allow: string }> | undefined,
	targetId: string,
): boolean {
	const ow = overwrites?.find((o) => o.id === targetId);
	if (!ow) return false;
	try {
		return (BigInt(ow.allow || '0') & VIEW) === VIEW;
	} catch {
		return false;
	}
}

export async function runBulkPermApply(opts: {
	token: string;
	db: D1Database;
	guildId: string;
	config: GuildConfig;
	players: VerifiedPlayer[];
	scope: BulkPermScope;
	target: BulkPermTarget;
	preset: BulkPermPreset;
	roleId?: string | null;
	dryRun: boolean;
	onlyMissing: boolean;
}): Promise<BulkPermReport> {
	const {
		token,
		db,
		guildId,
		config,
		players,
		scope,
		target,
		preset,
		roleId,
		dryRun,
		onlyMissing,
	} = opts;

	const targets = await resolveBulkPermTargets(token, guildId, config, target, preset, roleId);
	const channels = await collectBulkPermChannelIds(db, guildId, config, scope, players);

	const hits: BulkPermChannelHit[] = [];
	let wouldApply = 0;
	let applied = 0;
	let skipped = 0;
	let failed = 0;
	let inaccessible = 0;

	for (const { channelId, source } of channels) {
		const fetched = await fetchGuildChannel(token, channelId);
		if (!fetched.ok) {
			inaccessible += 1;
			hits.push({
				channelId,
				channelName: channelId,
				source,
				actions: targets.map((t) => ({
					targetId: t.id,
					label: t.label,
					status: 'inaccessible',
					detail: fetched.error,
				})),
			});
			continue;
		}

		const channel = fetched.channel;
		const hit: BulkPermChannelHit = {
			channelId,
			channelName: channel.name || channelId,
			source,
			actions: [],
		};

		for (const t of targets) {
			if (onlyMissing && overwriteHasView(channel.permission_overwrites, t.id)) {
				skipped += 1;
				hit.actions.push({
					targetId: t.id,
					label: t.label,
					status: 'skipped_has_view',
				});
				continue;
			}

			if (dryRun) {
				wouldApply += 1;
				hit.actions.push({
					targetId: t.id,
					label: t.label,
					status: 'would_apply',
					detail: `allow [${decodePermissionBits(t.allow).join('+') || '—'}]`,
				});
				continue;
			}

			try {
				await setChannelPermission(token, channelId, t.id, t.allow, t.deny, t.type);
				applied += 1;
				hit.actions.push({
					targetId: t.id,
					label: t.label,
					status: 'applied',
				});
			} catch (err) {
				failed += 1;
				hit.actions.push({
					targetId: t.id,
					label: t.label,
					status: 'failed',
					detail: err instanceof Error ? err.message : String(err),
				});
			}
			await new Promise((r) => setTimeout(r, 300));
		}

		hits.push(hit);
	}

	const mode = dryRun ? 'Dry-run' : 'Applied';
	const summaryLines = [
		`**${mode}** scope=\`${scope}\` target=\`${target}\` preset=\`${preset}\` only_missing=\`${onlyMissing}\``,
		`Channels: **${channels.length}** · would/applied **${dryRun ? wouldApply : applied}** · skipped **${skipped}** · failed **${failed}** · inaccessible **${inaccessible}**`,
		`Targets: ${targets.map((t) => t.label).join(', ')}`,
	];

	return {
		guildId,
		dryRun,
		scope,
		target,
		preset,
		onlyMissing,
		targets,
		channelCount: channels.length,
		wouldApply,
		applied,
		skipped,
		failed,
		inaccessible,
		hits,
		summaryLines,
	};
}

export function formatBulkPermSummary(report: BulkPermReport): string {
	const lines = [...report.summaryLines, ''];
	const interesting = report.hits.filter((h) =>
		h.actions.some((a) => a.status !== 'skipped_has_view'),
	);
	const show = interesting.slice(0, 15);
	for (const h of show) {
		const acts = h.actions
			.filter((a) => a.status !== 'skipped_has_view')
			.map((a) => `${a.status}${a.detail ? ` (${a.detail.slice(0, 60)})` : ''}`)
			.join('; ');
		lines.push(`• #${h.channelName} (${h.source}): ${acts || '—'}`);
	}
	if (interesting.length > show.length) {
		lines.push(`…and ${interesting.length - show.length} more (see audit log file if posted)`);
	}
	if (report.dryRun) {
		lines.push('', 'Re-run with `dry_run:false` to apply. Existing member overwrites are left alone.');
	}
	return lines.join('\n').slice(0, 1900);
}

export function formatBulkPermReportText(report: BulkPermReport): string {
	const lines = [
		`Bulk permissions ${report.dryRun ? 'dry-run' : 'apply'}`,
		`guild=${report.guildId} scope=${report.scope} target=${report.target} preset=${report.preset}`,
		`channels=${report.channelCount} would=${report.wouldApply} applied=${report.applied} skipped=${report.skipped} failed=${report.failed} inaccessible=${report.inaccessible}`,
		`targets=${report.targets.map((t) => `${t.label} allow=${t.allow}`).join(' | ')}`,
		'',
	];
	for (const h of report.hits) {
		for (const a of h.actions) {
			lines.push(
				`${h.channelId}\t#${h.channelName}\t${h.source}\t${a.label}\t${a.status}\t${a.detail || ''}`,
			);
		}
	}
	return lines.join('\n');
}
