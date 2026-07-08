import {
	addGuildMemberRole,
	createGuildTextChannel,
	removeGuildMemberRole,
	sendDirectMessage,
	setChannelPermission,
	setGuildMemberNickname,
	type DiscordApiError,
} from './discord-api';
import { opsLevelToGrade } from './grade-utils';
import {
	getGuildConfig,
	getVerifiedPlayer,
	recordPlayerStats,
	recordScreenshot,
	upsertVerifiedPlayer,
} from './guild-db';
import { parseStfcProUrl, resolveSearchTerm } from './stfc-url';
import { findPlayerByIdOrName, formatPlayerSummary } from './stfc-utils';
import type { GuildConfig, PlayerData } from './types';

const VIEW_CHANNEL = '1024';
const SEND_MESSAGES = '2048';
const READ_HISTORY = '65536';

export const VERIFICATION_INVITE_MESSAGE = `Welcome! Please verify your STFC account to access member channels.

**Verify via DM (recommended):**
1. Send a **screenshot** of your in-game profile
2. Then send your **stfc.pro profile link**

**Or** use \`/verify link:<url>\` in the server.

We'll check your alliance on stfc.pro and assign roles automatically.`;

export type DmResult =
	| { ok: true }
	| { ok: false; errorMessage: string; status?: number };

export async function lookupPlayerFromUrl(
	url: string,
	config: GuildConfig,
): Promise<{ player: PlayerData | null; error?: string }> {
	const parsed = parseStfcProUrl(url);
	if (!parsed) {
		return { player: null, error: 'Invalid stfc.pro URL. Example: https://stfc.pro/player/12345?region=US&server=1' };
	}

	const server = parsed.server ?? config.stfc_server;
	const region = parsed.region ?? config.stfc_region;
	if (!server) {
		return { player: null, error: 'Could not determine STFC server. Include server in the URL or configure the guild with `/server setup`.' };
	}

	const searchTerm = resolveSearchTerm(parsed);
	if (!searchTerm) {
		return { player: null, error: 'Could not extract a player ID or name from that URL.' };
	}

	const player = await findPlayerByIdOrName(searchTerm, server, region);
	if (!player) {
		return { player: null, error: `No player found on server ${server} (${region}) for that link.` };
	}

	if (!player.allianceTag) {
		return { player: null, error: 'Player found but has no alliance — you must be in an alliance to verify.' };
	}

	return { player };
}

function categoryForPlayerName(config: GuildConfig, playerName: string): string | undefined {
	const letter = playerName.trim().charAt(0).toUpperCase();
	if (!letter) return undefined;

	for (const [range, categoryId] of Object.entries(config.channel_category_map)) {
		const parts = range.toUpperCase().split('-');
		if (parts.length === 2) {
			const [start, end] = parts;
			if (letter >= start && letter <= end) return categoryId;
		} else if (range.toUpperCase() === letter) {
			return categoryId;
		}
	}
	return undefined;
}

type AllianceRankKey = 'Operative' | 'Agent' | 'Premier' | 'Commodore' | 'Admiral';
function normalizeAllianceRank(rank: string | undefined): AllianceRankKey | null {
	if (!rank) return null;
	const r = rank.trim().toLowerCase();
	switch (r) {
		case 'operative':
			return 'Operative';
		case 'agent':
			return 'Agent';
		case 'premier':
			return 'Premier';
		case 'commodore':
			return 'Commodore';
		case 'admiral':
			return 'Admiral';
		default:
			return null;
	}
}

function getAllMemberRoleIds(config: GuildConfig): string[] {
	const overlayRoleIds = Object.values(config.overlay_buckets ?? {})
		.flatMap((b) => b.role_ids ?? []);

	return [
		...config.member_role_ids,
		...config.operative_role_ids,
		...config.agent_role_ids,
		...config.premier_role_ids,
		...config.commodore_role_ids,
		...config.admiral_role_ids,
		...overlayRoleIds,
	];
}

function getOverlayRoleIdsForRank(config: GuildConfig, playerRank: string | undefined): string[] {
	const rankKey = normalizeAllianceRank(playerRank);
	if (!rankKey) return [];

	const wanted = rankKey.toLowerCase();
	const out = new Set<string>();
	for (const bucket of Object.values(config.overlay_buckets ?? {})) {
		const ranks = bucket.ranks ?? [];
		const matches = ranks.some((r) => String(r).trim().toLowerCase() === wanted);
		if (!matches) continue;
		for (const id of bucket.role_ids ?? []) out.add(id);
	}
	return Array.from(out);
}

function getMemberRoleIdsForRank(config: GuildConfig, playerRank: string | undefined): string[] {
	const rankKey = normalizeAllianceRank(playerRank);
	const rankRoles =
		rankKey === 'Operative'
			? config.operative_role_ids
			: rankKey === 'Agent'
				? config.agent_role_ids
				: rankKey === 'Premier'
					? config.premier_role_ids
					: rankKey === 'Commodore'
						? config.commodore_role_ids
						: rankKey === 'Admiral'
							? config.admiral_role_ids
							: [];

	const all = new Set<string>();
	for (const id of config.member_role_ids) all.add(id);
	for (const id of rankRoles) all.add(id);
	for (const id of getOverlayRoleIdsForRank(config, playerRank)) all.add(id);
	return Array.from(all);
}

async function applyMemberRoles(
	token: string,
	config: GuildConfig,
	guildId: string,
	userId: string,
	playerRank: string | undefined,
): Promise<void> {
	const roleIds = getMemberRoleIdsForRank(config, playerRank).filter((id) => /^\d{15,20}$/.test(id));
	for (const roleId of roleIds) {
		await addGuildMemberRole(token, guildId, userId, roleId);
	}
	if (config.guest_role_id) {
		await removeGuildMemberRole(token, guildId, userId, config.guest_role_id);
	}
}

async function applyGuestRole(
	token: string,
	config: GuildConfig,
	guildId: string,
	userId: string,
): Promise<void> {
	if (!config.guest_role_id) return;
	await addGuildMemberRole(token, guildId, userId, config.guest_role_id);
	const memberRoleIds = getAllMemberRoleIds(config).filter((id) => /^\d{15,20}$/.test(id));
	for (const roleId of memberRoleIds) await removeGuildMemberRole(token, guildId, userId, roleId);
}

async function createPersonalChannel(
	token: string,
	config: GuildConfig,
	guildId: string,
	userId: string,
	playerName: string,
): Promise<string | null> {
	const categoryId = categoryForPlayerName(config, playerName);
	const channelName = playerName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 90) || `member-${userId}`;

	try {
		const channel = await createGuildTextChannel(token, guildId, channelName, categoryId);
		await setChannelPermission(token, channel.id, userId, VIEW_CHANNEL | SEND_MESSAGES | READ_HISTORY, '0', 1);
		for (const roleId of config.personal_channel_extra_roles) {
			await setChannelPermission(token, channel.id, roleId, VIEW_CHANNEL | SEND_MESSAGES | READ_HISTORY, '0', 0);
		}
		return channel.id;
	} catch (error) {
		console.error('Failed to create personal channel:', error);
		return null;
	}
}

export async function processVerification(
	env: Env,
	guildId: string,
	discordUserId: string,
	stfcProUrl: string,
	screenshotUrl?: string,
): Promise<string> {
	const config = await getGuildConfig(env.STFC_DB, guildId);
	if (!config) {
		return '❌ This server is not configured yet. An admin must run `/server setup` first.';
	}

	if (screenshotUrl) {
		let r2Key: string | undefined;
		if (env.VERIFICATION_ASSETS) {
			r2Key = `verifications/${guildId}/${discordUserId}/${Date.now()}.png`;
			const imageResponse = await fetch(screenshotUrl);
			if (imageResponse.ok) {
				await env.VERIFICATION_ASSETS.put(r2Key, await imageResponse.arrayBuffer(), {
					httpMetadata: { contentType: imageResponse.headers.get('content-type') ?? 'image/png' },
				});
			}
		}
		await recordScreenshot(env.STFC_DB, guildId, discordUserId, screenshotUrl, r2Key);
	}

	const { player, error } = await lookupPlayerFromUrl(stfcProUrl, config);
	if (!player || error) {
		await upsertVerifiedPlayer(env.STFC_DB, {
			guild_id: guildId,
			discord_user_id: discordUserId,
			stfc_pro_url: stfcProUrl,
			verification_status: 'failed',
		});
		return `❌ ${error ?? 'Player lookup failed.'}`;
	}

	const grade = opsLevelToGrade(player.level);
	const now = new Date().toISOString();
	const tagMatches =
		config.mode === 'multi_alliance' ||
		(config.alliance_tag && player.allianceTag.toUpperCase() === config.alliance_tag.toUpperCase());

	const status = tagMatches ? 'active' : 'guest';
	await upsertVerifiedPlayer(env.STFC_DB, {
		guild_id: guildId,
		discord_user_id: discordUserId,
		player_id: player.playerId,
		player_name: player.name,
		alliance_tag: player.allianceTag,
		ops_level: player.level,
		power: player.power,
		grade,
		stfc_pro_url: stfcProUrl,
		verification_status: status,
		verified_at: now,
		last_synced_at: now,
	});

	const verified = await getVerifiedPlayer(env.STFC_DB, guildId, discordUserId);
	if (verified) {
		await recordPlayerStats(env.STFC_DB, verified.id, player.level, player.power, player.allianceTag);
	}

	if (!env.DISCORD_BOT_TOKEN) {
		return `✅ Verified **${player.name}** on stfc.pro, but bot token is not configured — roles were not updated.\n\n${formatPlayerSummary(player)}`;
	}

	const token = env.DISCORD_BOT_TOKEN;

	try {
		if (tagMatches) {
			await applyMemberRoles(token, config, guildId, discordUserId, player.rank);
			await setGuildMemberNickname(token, guildId, discordUserId, player.name);

			if (config.mode === 'single_alliance' && Object.keys(config.channel_category_map).length > 0) {
				const channelId = await createPersonalChannel(token, config, guildId, discordUserId, player.name);
				if (channelId) {
					await upsertVerifiedPlayer(env.STFC_DB, {
						guild_id: guildId,
						discord_user_id: discordUserId,
						verification_status: 'active',
					});
				}
			}

			return `✅ Verified and activated **${player.name}** (${player.allianceTag}, Ops ${player.level}).\n\n${formatPlayerSummary(player)}`;
		}

		await applyGuestRole(token, config, guildId, discordUserId);
		const expected = config.alliance_tag ?? 'the configured alliance';
		return `⏳ Verified **${player.name}** but alliance **${player.allianceTag}** does not match **${expected}** — guest role assigned. We'll re-check every ${config.poll_interval_hours}h.\n\n${formatPlayerSummary(player)}`;
	} catch (err) {
		console.error('Discord role update failed:', err);
		const apiErr = err as unknown as { message?: string; status?: number; body?: string };
		const statusPart = typeof apiErr.status === 'number' ? ` (HTTP ${apiErr.status})` : '';
		const bodySnippet = typeof apiErr.body === 'string' && apiErr.body.trim() ? `\n\n${apiErr.body.trim().slice(0, 250)}${apiErr.body.trim().length > 250 ? '…' : ''}` : '';
		const msg = apiErr.message ?? (err instanceof Error ? err.message : 'unknown error');
		return `✅ Verified on stfc.pro but failed to update Discord roles: ${msg}${statusPart}${bodySnippet}\n\n${formatPlayerSummary(player)}`;
	}
}

export async function inviteNewMember(
	env: Env,
	guildId: string,
	userId: string,
	username: string,
): Promise<DmResult> {
	await upsertVerifiedPlayer(env.STFC_DB, {
		guild_id: guildId,
		discord_user_id: userId,
		verification_status: 'pending_screenshot',
	});

	if (!env.DISCORD_BOT_TOKEN) {
		console.warn('DISCORD_BOT_TOKEN not set — cannot send verification DM');
		return { ok: false, errorMessage: 'DISCORD_BOT_TOKEN not configured' };
	}

	try {
		await sendDirectMessage(env.DISCORD_BOT_TOKEN, userId, VERIFICATION_INVITE_MESSAGE);
		return { ok: true };
	} catch (error) {
		// sendDirectMessage ultimately throws DiscordApiError with status/body.
		const maybeDiscordErr = error as { status?: number; body?: string; message?: string };
		const status = typeof maybeDiscordErr.status === 'number' ? maybeDiscordErr.status : undefined;

		let errorMessage = error instanceof Error ? error.message : 'Unknown error';
		if (maybeDiscordErr.body) {
			// Keep it short so Discord responses aren't overly large.
			const body = String(maybeDiscordErr.body);
			errorMessage += `: ${body.slice(0, 180)}${body.length > 180 ? '…' : ''}`;
		}

		console.error(`Failed to DM ${userId}:`, errorMessage);
		return { ok: false, errorMessage, status };
	}
}

export async function syncVerifiedPlayer(
	env: Env,
	config: GuildConfig,
	guildId: string,
	discordUserId: string,
	player: PlayerData,
): Promise<void> {
	if (!env.DISCORD_BOT_TOKEN || !player.allianceTag) return;

	const token = env.DISCORD_BOT_TOKEN;
	const tagMatches =
		config.mode === 'multi_alliance' ||
		(config.alliance_tag && player.allianceTag.toUpperCase() === config.alliance_tag.toUpperCase());

	const grade = opsLevelToGrade(player.level);
	const now = new Date().toISOString();

	await upsertVerifiedPlayer(env.STFC_DB, {
		guild_id: guildId,
		discord_user_id: discordUserId,
		player_name: player.name,
		alliance_tag: player.allianceTag,
		ops_level: player.level,
		power: player.power,
		grade,
		last_synced_at: now,
		verification_status: tagMatches ? 'active' : 'guest',
	});

	if (tagMatches) {
		await applyMemberRoles(token, config, guildId, discordUserId, player.rank);
		await setGuildMemberNickname(token, guildId, discordUserId, player.name);
	} else {
		await applyGuestRole(token, config, guildId, discordUserId);
	}
}
