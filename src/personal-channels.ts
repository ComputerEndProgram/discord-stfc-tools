import {
	createGuildCategory,
	listGuildChannels,
	patchGuildChannel,
	createGuildTextChannel,
	getGuildChannel,
	setChannelPermission,
} from './discord-api';
import { categoryForPlayerName, personalChannelsEnabled, slugPersonalChannelName } from './channel-utils';
import {
	DEFAULT_CATEGORY_NAME_TEMPLATE,
	DEFAULT_SOFT_LIMIT,
	applyCategoryNameTemplate,
	buildLetterHistogram,
	formatCategoryPlan,
	letterKeyForName,
	planCategoryBuckets,
	sortedCategoryMapEntries,
	type CategoryPlan,
} from './personal-channel-plan';
import type { GuildConfig, VerifiedPlayer } from './types';

const VIEW_CHANNEL = '1024';
const MEMBER_PERMS = String(0x400 | 0x800 | 0x10000); // view + send + read history

export type PersonalChannelResult =
	| { ok: true; channelId: string; created: boolean; moved: boolean; renamed: boolean }
	| { ok: false; error: string };

async function applyPersonalChannelPermissions(
	token: string,
	guildId: string,
	channelId: string,
	userId: string,
	config: GuildConfig,
): Promise<void> {
	// Deny @everyone — guild snowflake doubles as the @everyone role ID.
	await setChannelPermission(token, channelId, guildId, '0', VIEW_CHANNEL, 0);
	await setChannelPermission(token, channelId, userId, MEMBER_PERMS, '0', 1);
	for (const roleId of config.personal_channel_extra_roles) {
		if (!/^\d{15,20}$/.test(roleId)) continue;
		await setChannelPermission(token, channelId, roleId, MEMBER_PERMS, '0', 0);
	}
}

/**
 * Create or update a verified member's personal channel.
 * Skips creation when personal channels are not configured.
 */
export async function ensurePersonalChannel(
	token: string,
	config: GuildConfig,
	guildId: string,
	userId: string,
	playerName: string,
	existingChannelId?: string | null,
): Promise<PersonalChannelResult> {
	if (config.mode !== 'single_alliance' || !personalChannelsEnabled(config)) {
		return { ok: false, error: 'Personal channels are not configured for this server.' };
	}

	const targetCategoryId = categoryForPlayerName(config, playerName);
	const channelName = slugPersonalChannelName(playerName, userId);

	try {
		if (existingChannelId) {
			const existing = await getGuildChannel(token, existingChannelId);
			if (existing && existing.type === 0) {
				let moved = false;
				let renamed = false;

				if (targetCategoryId && existing.parent_id !== targetCategoryId) {
					await patchGuildChannel(token, existingChannelId, { parent_id: targetCategoryId });
					moved = true;
				}
				if (existing.name !== channelName) {
					await patchGuildChannel(token, existingChannelId, { name: channelName });
					renamed = true;
				}

				await applyPersonalChannelPermissions(token, guildId, existingChannelId, userId, config);
				return { ok: true, channelId: existingChannelId, created: false, moved, renamed };
			}
		}

		const channel = await createGuildTextChannel(token, guildId, channelName, targetCategoryId);
		await applyPersonalChannelPermissions(token, guildId, channel.id, userId, config);
		return { ok: true, channelId: channel.id, created: true, moved: false, renamed: false };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unknown error';
		return { ok: false, error: message };
	}
}

/** Link an existing guild text channel to a member (optional permission rewrite). */
export async function linkExistingPersonalChannel(
	token: string,
	config: GuildConfig,
	guildId: string,
	userId: string,
	channelId: string,
	opts?: { applyPermissions?: boolean },
): Promise<PersonalChannelResult> {
	const channel = await getGuildChannel(token, channelId);
	if (!channel || channel.type !== 0) {
		return { ok: false, error: 'Channel not found or is not a text channel.' };
	}

	try {
		if (opts?.applyPermissions !== false) {
			await applyPersonalChannelPermissions(token, guildId, channelId, userId, config);
		}
		return { ok: true, channelId, created: false, moved: false, renamed: false };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unknown error';
		return { ok: false, error: message };
	}
}

export interface PlanPersonalChannelsOptions {
	softLimit?: number;
	/** Prefer linked channels; falls back to player_name for unlinked actives. */
	players: VerifiedPlayer[];
}

export interface PersonalChannelPlanResult {
	plan: CategoryPlan;
	namesUsed: number;
	currentMap: Record<string, string>;
	currentOccupancy: Array<{ range: string; categoryId: string; discordChildren: number }>;
	summary: string;
}

/** Build a dry-run plan from verified players (and optional Discord occupancy). */
export async function planPersonalChannels(
	token: string | null,
	guildId: string,
	config: GuildConfig,
	opts: PlanPersonalChannelsOptions,
): Promise<PersonalChannelPlanResult> {
	const softLimit = opts.softLimit ?? DEFAULT_SOFT_LIMIT;
	const names: string[] = [];
	for (const p of opts.players) {
		const name = p.player_name?.trim();
		if (name) names.push(name);
	}

	const plan = planCategoryBuckets(buildLetterHistogram(names), softLimit);

	const currentOccupancy: PersonalChannelPlanResult['currentOccupancy'] = [];
	if (token) {
		const channels = await listGuildChannels(token, guildId);
		const childCount = new Map<string, number>();
		for (const ch of channels) {
			if (ch.type !== 0 || !ch.parent_id) continue;
			childCount.set(ch.parent_id, (childCount.get(ch.parent_id) ?? 0) + 1);
		}
		for (const entry of sortedCategoryMapEntries(config.channel_category_map)) {
			currentOccupancy.push({
				range: entry.range,
				categoryId: entry.categoryId,
				discordChildren: childCount.get(entry.categoryId) ?? 0,
			});
		}
	}

	let summary = formatCategoryPlan(plan);
	if (currentOccupancy.length > 0) {
		const occLines = currentOccupancy.map((o) => {
			const mark = o.discordChildren >= softLimit ? ' ⚠' : '';
			return `• \`${o.range}\` → <#${o.categoryId}> — ${o.discordChildren}/${softLimit}${mark}`;
		});
		summary += `\n\n**Current map occupancy**\n${occLines.join('\n')}`;
	} else if (Object.keys(config.channel_category_map).length === 0) {
		summary += '\n\nNo category map set yet — rebalance will create categories.';
	}

	summary += `\n\nBased on ${names.length} verified player name${names.length === 1 ? '' : 's'}.`;
	return {
		plan,
		namesUsed: names.length,
		currentMap: config.channel_category_map,
		currentOccupancy,
		summary: summary.slice(0, 1900),
	};
}

export interface RebalancePersonalChannelsOptions {
	softLimit?: number;
	nameTemplate?: string;
	/** When false, only rename if category name differs (default true). */
	renameCategories?: boolean;
	createCategories?: boolean;
	players: VerifiedPlayer[];
	/** Small delay between Discord channel moves (ms). */
	moveDelayMs?: number;
}

export interface RebalancePersonalChannelsResult {
	ok: boolean;
	plan: CategoryPlan;
	newMap: Record<string, string>;
	categoriesCreated: number;
	categoriesRenamed: number;
	channelsMoved: number;
	channelsFailed: number;
	errors: string[];
	summary: string;
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * Apply a category plan: create/rename categories, update map, move personal channels.
 */
export async function rebalancePersonalChannels(
	token: string,
	guildId: string,
	config: GuildConfig,
	opts: RebalancePersonalChannelsOptions,
): Promise<RebalancePersonalChannelsResult> {
	const softLimit = opts.softLimit ?? DEFAULT_SOFT_LIMIT;
	const nameTemplate = opts.nameTemplate?.trim() || DEFAULT_CATEGORY_NAME_TEMPLATE;
	const renameCategories = opts.renameCategories !== false;
	const createCategories = opts.createCategories !== false;
	const moveDelayMs = opts.moveDelayMs ?? 350;

	const names: string[] = [];
	for (const p of opts.players) {
		if (p.player_name?.trim()) names.push(p.player_name.trim());
	}
	const plan = planCategoryBuckets(buildLetterHistogram(names), softLimit);

	const existing = sortedCategoryMapEntries(config.channel_category_map);
	const newMap: Record<string, string> = {};
	const errors: string[] = [];
	let categoriesCreated = 0;
	let categoriesRenamed = 0;

	for (let i = 0; i < plan.buckets.length; i++) {
		const bucket = plan.buckets[i];
		const desiredName = applyCategoryNameTemplate(nameTemplate, bucket.range);
		let categoryId = existing[i]?.categoryId;

		if (!categoryId) {
			if (!createCategories) {
				errors.push(`Missing category for \`${bucket.range}\` and create_categories is false.`);
				continue;
			}
			try {
				const created = await createGuildCategory(token, guildId, desiredName);
				categoryId = created.id;
				categoriesCreated++;
			} catch (error) {
				errors.push(
					`Failed to create category ${desiredName}: ${error instanceof Error ? error.message : 'unknown'}`,
				);
				continue;
			}
		} else if (renameCategories) {
			try {
				const ch = await getGuildChannel(token, categoryId);
				if (ch && ch.name !== desiredName) {
					await patchGuildChannel(token, categoryId, { name: desiredName });
					categoriesRenamed++;
				}
			} catch (error) {
				errors.push(
					`Failed to rename category ${categoryId}: ${error instanceof Error ? error.message : 'unknown'}`,
				);
			}
		}

		if (categoryId) newMap[bucket.range] = categoryId;
	}

	const configWithMap: GuildConfig = { ...config, channel_category_map: newMap };
	let channelsMoved = 0;
	let channelsFailed = 0;

	for (const player of opts.players) {
		if (!player.personal_channel_id || !player.player_name?.trim()) continue;
		const targetCategoryId = categoryForPlayerName(configWithMap, player.player_name);
		if (!targetCategoryId) {
			channelsFailed++;
			errors.push(`No category for ${player.player_name} (${letterKeyForName(player.player_name)})`);
			continue;
		}
		try {
			const existingCh = await getGuildChannel(token, player.personal_channel_id);
			if (!existingCh || existingCh.type !== 0) {
				channelsFailed++;
				errors.push(`Channel missing for ${player.player_name}`);
				continue;
			}
			if (existingCh.parent_id !== targetCategoryId) {
				await patchGuildChannel(token, player.personal_channel_id, { parent_id: targetCategoryId });
				channelsMoved++;
				if (moveDelayMs > 0) await sleep(moveDelayMs);
			}
		} catch (error) {
			channelsFailed++;
			errors.push(
				`Move failed for ${player.player_name}: ${error instanceof Error ? error.message : 'unknown'}`,
			);
		}
	}

	const orphaned = existing.slice(plan.buckets.length);
	const orphanNote =
		orphaned.length > 0
			? `\n• Unused old categories (not deleted): ${orphaned.map((o) => `<#${o.categoryId}>`).join(', ')}`
			: '';

	const mapComplete = Object.keys(newMap).length === plan.buckets.length;
	const summary = (
		`${formatCategoryPlan(plan, { title: mapComplete ? 'Rebalance complete' : 'Rebalance partial' })}\n\n` +
		`• Categories created: ${categoriesCreated}\n` +
		`• Categories renamed: ${categoriesRenamed}\n` +
		`• Channels moved: ${channelsMoved}\n` +
		`• Channels failed: ${channelsFailed}\n` +
		`• New map: ${Object.entries(newMap)
			.map(([r, id]) => `${r}→${id}`)
			.join(', ') || 'none'}` +
		orphanNote +
		(errors.length ? `\n\n⚠ Errors (${errors.length}):\n${errors.slice(0, 8).join('\n')}` : '')
	).slice(0, 1900);

	return {
		ok: mapComplete && channelsFailed === 0,
		plan,
		newMap,
		categoriesCreated,
		categoriesRenamed,
		channelsMoved,
		channelsFailed,
		errors,
		summary,
	};
}
