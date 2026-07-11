import { interactionResponse, listAllGuildMembers } from './discord-api';
import {
	countPlayersByAlliance,
	countPlayersByGrade,
	countPlayersByStatus,
	getExcludedUserIds,
	getGuildConfig,
	getVerifiedDiscordUserIds,
	listRosterPlayers,
} from './guild-db';
import { isGuildAdministrator } from './discord-admin';
import type { GuildConfig, VerifiedPlayer } from './types';

const LIST_CAP = 40;

function canUseRoster(
	interaction: { member?: { permissions?: string; roles?: string[] } },
	config: GuildConfig,
): boolean {
	if (isGuildAdministrator(interaction.member?.permissions)) return true;
	const allowed = config.dm_query_role_ids;
	if (!allowed.length) return false;
	const roles = new Set(interaction.member?.roles ?? []);
	return allowed.some((id) => roles.has(id));
}

function formatPlayerLine(p: VerifiedPlayer): string {
	const name = p.player_name ?? '—';
	const tag = p.alliance_tag ? `[${p.alliance_tag}]` : '';
	const ops = p.ops_level != null ? `Ops ${p.ops_level}` : 'Ops —';
	const grade = p.grade != null ? `G${p.grade}` : 'G—';
	const status = p.verification_status;
	return `• <@${p.discord_user_id}> **${name}** ${tag} · ${ops} · ${grade} · ${status}`;
}

function truncateLines(lines: string[], cap = LIST_CAP): string {
	if (lines.length <= cap) return lines.join('\n');
	const shown = lines.slice(0, cap);
	return `${shown.join('\n')}\n…and **${lines.length - cap}** more`;
}

function getOptionValue(
	options: Array<{ name: string; value?: unknown }> | undefined,
	name: string,
): unknown {
	return options?.find((o) => o.name === name)?.value;
}

export async function handleRosterCommand(
	env: Env,
	interaction: {
		guild_id?: string;
		member?: { permissions?: string; roles?: string[]; user?: { id: string } };
	},
	data: {
		options?: Array<{
			name: string;
			type?: number;
			value?: unknown;
			options?: Array<{ name: string; value?: unknown; type?: number }>;
		}>;
	},
): Promise<Response> {
	const guildId = interaction.guild_id;
	if (!guildId) {
		return interactionResponse('❌ Run this command inside your server.', true);
	}

	const config = await getGuildConfig(env.STFC_DB, guildId);
	if (!config) {
		return interactionResponse('❌ Server not configured. An admin must run `/server setup` first.', true);
	}

	if (!canUseRoster(interaction, config)) {
		return interactionResponse(
			'❌ Roster queries require Administrator, or a role from `/server assistant roles`.',
			true,
		);
	}

	const sub = data.options?.[0];
	if (!sub) {
		return interactionResponse(
			'Use `/roster grades`, `/roster grade`, `/roster ops`, `/roster unverified`, `/roster status`, or `/roster alliances`.',
			true,
		);
	}

	const opts = sub.options;

	switch (sub.name) {
		case 'grades': {
			const rows = await countPlayersByGrade(env.STFC_DB, guildId);
			if (rows.length === 0) {
				return interactionResponse('No verified players yet.', true);
			}
			const lines = rows.map((r) => `• **G${r.grade}**: ${r.count}`);
			const total = rows.reduce((n, r) => n + r.count, 0);
			return interactionResponse(`📊 **Grade breakdown** (${total} verified)\n${lines.join('\n')}`, true);
		}
		case 'grade': {
			const gradeRaw = getOptionValue(opts, 'grade');
			const grade = Number(gradeRaw);
			if (!Number.isFinite(grade) || grade < 3 || grade > 7) {
				return interactionResponse('❌ Provide `grade:` 3–7 (e.g. `6` for G6).', true);
			}
			const players = await listRosterPlayers(env.STFC_DB, guildId, { grade, limit: 80 });
			if (players.length === 0) {
				return interactionResponse(`No verified players at **G${grade}**.`, true);
			}
			return interactionResponse(
				`📋 **G${grade}** (${players.length}${players.length >= 80 ? '+' : ''})\n` +
					truncateLines(players.map(formatPlayerLine)),
				true,
			);
		}
		case 'ops': {
			const minRaw = getOptionValue(opts, 'min');
			const maxRaw = getOptionValue(opts, 'max');
			const opsMin = minRaw != null && minRaw !== '' ? Number(minRaw) : undefined;
			const opsMax = maxRaw != null && maxRaw !== '' ? Number(maxRaw) : undefined;
			if (opsMin != null && !Number.isFinite(opsMin)) {
				return interactionResponse('❌ `min` must be a number.', true);
			}
			if (opsMax != null && !Number.isFinite(opsMax)) {
				return interactionResponse('❌ `max` must be a number.', true);
			}
			if (opsMin == null && opsMax == null) {
				return interactionResponse('❌ Provide at least `min:` or `max:` ops level.', true);
			}
			const players = await listRosterPlayers(env.STFC_DB, guildId, {
				opsMin,
				opsMax,
				limit: 80,
			});
			if (players.length === 0) {
				return interactionResponse('No verified players in that ops range.', true);
			}
			const range =
				opsMin != null && opsMax != null
					? `${opsMin}–${opsMax}`
					: opsMin != null
						? `≥ ${opsMin}`
						: `≤ ${opsMax}`;
			return interactionResponse(
				`📋 **Ops ${range}** (${players.length}${players.length >= 80 ? '+' : ''})\n` +
					truncateLines(players.map(formatPlayerLine)),
				true,
			);
		}
		case 'status': {
			const rows = await countPlayersByStatus(env.STFC_DB, guildId);
			if (rows.length === 0) {
				return interactionResponse('No verified players yet.', true);
			}
			const lines = rows.map((r) => `• **${r.verification_status}**: ${r.count}`);
			return interactionResponse(`📊 **Verification status**\n${lines.join('\n')}`, true);
		}
		case 'alliances': {
			const rows = await countPlayersByAlliance(env.STFC_DB, guildId);
			if (rows.length === 0) {
				return interactionResponse('No verified players yet.', true);
			}
			const lines = rows.slice(0, 40).map((r) => `• **[${r.alliance_tag}]**: ${r.count}`);
			const extra = rows.length > 40 ? `\n…and ${rows.length - 40} more alliances` : '';
			return interactionResponse(`📊 **Alliance breakdown**\n${lines.join('\n')}${extra}`, true);
		}
		case 'unverified': {
			if (!env.DISCORD_BOT_TOKEN) {
				return interactionResponse('❌ DISCORD_BOT_TOKEN not configured.', true);
			}
			const [members, verifiedIds, excludedIds] = await Promise.all([
				listAllGuildMembers(env.DISCORD_BOT_TOKEN, guildId),
				getVerifiedDiscordUserIds(env.STFC_DB, guildId),
				getExcludedUserIds(env.STFC_DB, guildId),
			]);

			const unverified = members.filter((m) => {
				if (m.user.bot) return false;
				if (verifiedIds.has(m.user.id)) return false;
				if (excludedIds.has(m.user.id)) return false;
				return true;
			});

			const botCount = members.filter((m) => m.user.bot).length;
			const header =
				`👤 **Unverified Discord members** (${unverified.length})\n` +
				`_Excluded from this list: verified players, \`/server exclude\` list (${excludedIds.size}), Discord bots (${botCount})._\n\n`;

			if (unverified.length === 0) {
				return interactionResponse(`${header}Everyone else is verified or excluded.`, true);
			}

			const lines = unverified.map((m) => {
				const nick = m.nick ? ` (${m.nick})` : '';
				return `• <@${m.user.id}> \`${m.user.username}\`${nick}`;
			});
			return interactionResponse(header + truncateLines(lines, 50), true);
		}
		default:
			return interactionResponse('❌ Unknown `/roster` subcommand.', true);
	}
}
