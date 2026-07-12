/**
 * Admin activity backfill: Discord user and/or STFC player (name/id),
 * with Did-you-mean confirm buttons for near misses.
 */

import {
	interactionResponse,
	interactionResponseWithComponents,
	updateMessageResponse,
	type DiscordActionRow,
} from './discord-api';
import { isGuildAdministrator } from './discord-admin';
import { AuditColor, postAuditLog } from './audit-log';
import {
	getAllianceRosterMember,
	getAllianceRosterMemberByName,
	getGuildConfig,
	getVerifiedPlayer,
	listPlayerActivityCandidates,
	setAllianceRosterMemberActivity,
	setVerifiedPlayerActivity,
	type PlayerActivityCandidate,
} from './guild-db';
import { findNearestMatch, normalizePlayerName } from './player-name-match';
import { formatActivityBits } from './activity-utils';

export type ActivityField = 'streak' | 'inactive';

export type ActivityTarget = {
	playerId: number | null;
	discordUserId: string | null;
	playerName: string | null;
	allianceTag: string | null;
	activityStreak: number | null;
	daysInactive: number;
	source: 'discord' | 'alliance' | 'both';
};

function labelFor(t: ActivityTarget): string {
	const name = t.playerName?.trim() || '—';
	const tag = t.allianceTag ? ` [${t.allianceTag}]` : '';
	const id = t.playerId != null ? ` · id ${t.playerId}` : '';
	const dc = t.discordUserId ? ` · <@${t.discordUserId}>` : ' · no Discord';
	return `**${name}**${tag}${id}${dc}`;
}

function candidateToTarget(c: PlayerActivityCandidate): ActivityTarget {
	const hasDiscord = Boolean(c.discord_user_id);
	const hasAlliance = c.player_id != null;
	return {
		playerId: c.player_id,
		discordUserId: c.discord_user_id,
		playerName: c.player_name,
		allianceTag: c.alliance_tag,
		activityStreak: c.activity_streak,
		daysInactive: c.days_inactive,
		source: hasDiscord && hasAlliance ? 'both' : hasDiscord ? 'discord' : 'alliance',
	};
}

function mergeTargets(a: ActivityTarget, b: ActivityTarget): ActivityTarget {
	return {
		playerId: a.playerId ?? b.playerId,
		discordUserId: a.discordUserId ?? b.discordUserId,
		playerName: a.playerName ?? b.playerName,
		allianceTag: a.allianceTag ?? b.allianceTag,
		activityStreak: a.activityStreak ?? b.activityStreak,
		daysInactive: Math.max(a.daysInactive, b.daysInactive),
		source:
			(a.discordUserId || b.discordUserId) && (a.playerId != null || b.playerId != null)
				? 'both'
				: a.discordUserId || b.discordUserId
					? 'discord'
					: 'alliance',
	};
}

async function targetFromDiscordUser(
	db: D1Database,
	guildId: string,
	discordUserId: string,
): Promise<ActivityTarget | null> {
	const vp = await getVerifiedPlayer(db, guildId, discordUserId);
	if (!vp) return null;
	let t: ActivityTarget = {
		playerId: vp.player_id,
		discordUserId: vp.discord_user_id,
		playerName: vp.player_name,
		allianceTag: vp.alliance_tag,
		activityStreak: vp.activity_streak,
		daysInactive: vp.days_inactive,
		source: vp.player_id != null ? 'both' : 'discord',
	};
	if (vp.player_id != null) {
		const arm = await getAllianceRosterMember(db, guildId, vp.player_id);
		if (arm) {
			t = mergeTargets(t, {
				playerId: arm.player_id,
				discordUserId: null,
				playerName: arm.player_name,
				allianceTag: arm.alliance_tag,
				activityStreak: arm.activity_streak,
				daysInactive: arm.days_inactive,
				source: 'alliance',
			});
		}
	}
	return t;
}

async function targetFromPlayerId(
	db: D1Database,
	guildId: string,
	playerId: number,
): Promise<ActivityTarget | null> {
	const arm = await getAllianceRosterMember(db, guildId, playerId);
	const candidates = await listPlayerActivityCandidates(db, guildId);
	const linked = candidates.find((c) => c.player_id === playerId && c.discord_user_id);
	if (!arm && !linked) return null;
	let t: ActivityTarget | null = arm
		? {
				playerId: arm.player_id,
				discordUserId: linked?.discord_user_id ?? null,
				playerName: arm.player_name,
				allianceTag: arm.alliance_tag,
				activityStreak: arm.activity_streak,
				daysInactive: arm.days_inactive,
				source: linked?.discord_user_id ? 'both' : 'alliance',
			}
		: null;
	if (linked) {
		const fromVp = candidateToTarget(linked);
		t = t ? mergeTargets(t, fromVp) : fromVp;
	}
	return t;
}

export type ResolveActivityTargetResult =
	| { status: 'exact'; target: ActivityTarget }
	| { status: 'suggest'; target: ActivityTarget; query: string; distance: number }
	| { status: 'none'; query: string };

export async function resolveActivityTarget(
	db: D1Database,
	guildId: string,
	opts: { discordUserId?: string; playerQuery?: string },
): Promise<ResolveActivityTargetResult> {
	const userId = opts.discordUserId?.trim();
	const query = opts.playerQuery?.trim();

	if (userId) {
		const t = await targetFromDiscordUser(db, guildId, userId);
		if (!t) return { status: 'none', query: `<@${userId}>` };
		return { status: 'exact', target: t };
	}

	if (!query) return { status: 'none', query: '' };

	if (/^\d+$/.test(query)) {
		const t = await targetFromPlayerId(db, guildId, Number(query));
		if (!t) return { status: 'none', query };
		return { status: 'exact', target: t };
	}

	const armExact = await getAllianceRosterMemberByName(db, guildId, query);
	if (armExact) {
		const t = await targetFromPlayerId(db, guildId, armExact.player_id);
		if (t) return { status: 'exact', target: t };
	}

	const candidates = await listPlayerActivityCandidates(db, guildId);
	const exactName = candidates.filter(
		(c) => c.player_name && normalizePlayerName(c.player_name) === normalizePlayerName(query),
	);
	if (exactName.length === 1) {
		return { status: 'exact', target: candidateToTarget(exactName[0]!) };
	}
	if (exactName.length > 1) {
		// Prefer row that has both Discord + alliance, else first.
		const both = exactName.find((c) => c.discord_user_id && c.player_id != null);
		return { status: 'exact', target: candidateToTarget(both ?? exactName[0]!) };
	}

	const nearest = findNearestMatch(
		query,
		candidates
			.filter((c) => c.player_name?.trim())
			.map((c) => ({ name: c.player_name!.trim(), payload: c })),
	);
	if (!nearest) return { status: 'none', query };

	return {
		status: 'suggest',
		target: candidateToTarget(nearest.payload),
		query,
		distance: nearest.distance,
	};
}

export async function applyActivityAdjust(
	db: D1Database,
	guildId: string,
	target: ActivityTarget,
	field: ActivityField,
	value: number,
): Promise<{ streak: number | null; daysInactive: number }> {
	const v = Math.max(0, Math.floor(value));
	let streak = target.activityStreak;
	let daysInactive = target.daysInactive;

	if (field === 'streak') {
		streak = v;
		if (v > 0) daysInactive = 0;
	} else {
		daysInactive = v;
		if (v > 0) streak = 0;
	}

	if (target.discordUserId) {
		await setVerifiedPlayerActivity(db, guildId, target.discordUserId, {
			activity_streak: streak,
			days_inactive: daysInactive,
		});
	}
	if (target.playerId != null) {
		await setAllianceRosterMemberActivity(db, guildId, target.playerId, {
			activity_streak: streak,
			days_inactive: daysInactive,
		});
	}

	return { streak, daysInactive };
}

function confirmComponents(field: ActivityField, playerId: number, value: number): DiscordActionRow[] {
	const kind = field === 'streak' ? 's' : 'i';
	return [
		{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					label: 'Yes, use this player',
					custom_id: `actc:ok:${kind}:${playerId}:${value}`,
				},
				{
					type: 2,
					style: 4,
					label: 'No',
					custom_id: 'actc:no',
				},
			],
		},
	];
}

export function formatActivityTargetSummary(target: ActivityTarget): string {
	const bits = formatActivityBits({
		activityStreak: target.activityStreak,
		daysInactive: target.daysInactive,
	});
	return (
		`${labelFor(target)}\n` +
		`• Streak: **${target.activityStreak ?? '—'}**\n` +
		`• Days inactive: **${target.daysInactive}**` +
		(bits ? `\n• Summary: ${bits}` : '')
	);
}

export async function handleSetActivityCommand(opts: {
	env: Env;
	guildId: string;
	actorId?: string;
	field: ActivityField;
	value: number;
	discordUserId?: string;
	playerQuery?: string;
}): Promise<Response> {
	const { env, guildId, field, value } = opts;
	const resolved = await resolveActivityTarget(env.STFC_DB, guildId, {
		discordUserId: opts.discordUserId,
		playerQuery: opts.playerQuery,
	});

	if (resolved.status === 'none') {
		const what = opts.playerQuery?.trim()
			? `player \`${opts.playerQuery.trim()}\``
			: opts.discordUserId
				? `<@${opts.discordUserId}>`
				: 'that target';
		return interactionResponse(
			`❌ No match for ${what}. Use a Discord \`user:\`, STFC player id, or in-game name from the alliance roster / verified list.`,
			true,
		);
	}

	if (resolved.status === 'suggest') {
		const { target, query, distance } = resolved;
		if (target.playerId == null) {
			// Suggestion only on Discord row without player_id — apply needs user: instead.
			return interactionResponse(
				`❓ Did you mean ${labelFor(target)}? That row has no STFC player id — use \`user:@Member\` instead.`,
				true,
			);
		}
		const fieldLabel = field === 'streak' ? 'streak' : 'days inactive';
		return interactionResponseWithComponents(
			`❓ No exact match for \`${query}\`.\n` +
				`Did you mean ${labelFor(target)}? (edit distance ${distance})\n` +
				`Set **${fieldLabel}** → **${value}**?`,
			{
				ephemeral: true,
				components: confirmComponents(field, target.playerId, value),
			},
		);
	}

	const target = resolved.target;
	if (!target.discordUserId && target.playerId == null) {
		return interactionResponse('❌ Resolved target has neither Discord user nor player id.', true);
	}

	const before = { streak: target.activityStreak, inactive: target.daysInactive };
	const after = await applyActivityAdjust(env.STFC_DB, guildId, target, field, value);

	const config = await getGuildConfig(env.STFC_DB, guildId);
	if (config) {
		const title = field === 'streak' ? 'Activity streak adjusted' : 'Days inactive adjusted';
		const desc =
			field === 'streak'
				? `${labelFor(target)} streak **${before.streak ?? '—'}** → **${after.streak}**` +
					(value > 0 ? ' (days inactive cleared)' : '')
				: `${labelFor(target)} days inactive **${before.inactive}** → **${after.daysInactive}**` +
					(value > 0 ? ' (streak set to 0)' : '');
		await postAuditLog(env, config, {
			title,
			description: desc,
			actorId: opts.actorId,
			source: 'admin',
			color: AuditColor.info,
		});
	}

	if (field === 'streak') {
		return interactionResponse(
			`✅ ${labelFor(target)} streak set to **${after.streak}**` +
				(value > 0
					? ' · days inactive reset to **0**'
					: ` · days inactive left at **${after.daysInactive}**`),
			true,
		);
	}
	return interactionResponse(
		`✅ ${labelFor(target)} days inactive set to **${after.daysInactive}**` +
			(value > 0 ? ' · streak set to **0**' : ''),
		true,
	);
}

export async function handleActivityConfirmComponent(
	env: Env,
	interaction: {
		guild_id?: string;
		member?: { permissions?: string; user?: { id: string } };
		data?: { custom_id?: string };
	},
): Promise<Response> {
	const customId = interaction.data?.custom_id ?? '';
	if (customId === 'actc:no') {
		return updateMessageResponse('❌ Cancelled — no changes made.', { components: [] });
	}

	const match = customId.match(/^actc:ok:([si]):(\d+):(\d+)$/);
	if (!match) {
		return interactionResponse('❌ Unknown activity confirm button.', true);
	}

	if (!isGuildAdministrator(interaction.member?.permissions)) {
		return interactionResponse('❌ Administrator required.', true);
	}

	const guildId = interaction.guild_id;
	if (!guildId) {
		return interactionResponse('❌ Run this inside the server.', true);
	}

	const field: ActivityField = match[1] === 's' ? 'streak' : 'inactive';
	const playerId = Number(match[2]);
	const value = Number(match[3]);

	const target = await targetFromPlayerId(env.STFC_DB, guildId, playerId);
	if (!target) {
		return updateMessageResponse('❌ That player is no longer on the roster cache.', {
			components: [],
		});
	}

	const before = { streak: target.activityStreak, inactive: target.daysInactive };
	const after = await applyActivityAdjust(env.STFC_DB, guildId, target, field, value);

	const config = await getGuildConfig(env.STFC_DB, guildId);
	const actorId = interaction.member?.user?.id;
	if (config) {
		await postAuditLog(env, config, {
			title: field === 'streak' ? 'Activity streak adjusted' : 'Days inactive adjusted',
			description:
				field === 'streak'
					? `${labelFor(target)} streak **${before.streak ?? '—'}** → **${after.streak}** (Did you mean?)`
					: `${labelFor(target)} days inactive **${before.inactive}** → **${after.daysInactive}** (Did you mean?)`,
			actorId,
			source: 'admin',
			color: AuditColor.info,
		});
	}

	const ok =
		field === 'streak'
			? `✅ ${labelFor(target)} streak set to **${after.streak}**` +
				(value > 0
					? ' · days inactive reset to **0**'
					: ` · days inactive left at **${after.daysInactive}**`)
			: `✅ ${labelFor(target)} days inactive set to **${after.daysInactive}**` +
				(value > 0 ? ' · streak set to **0**' : '');

	return updateMessageResponse(ok, { components: [] });
}
