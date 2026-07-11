import {
	listGuildChannels,
	modifyGuildChannelPositions,
	isLinkableGuildTextChannel,
	type DiscordChannel,
} from './discord-api';

/** Stable A–Z order for Discord channel names within a category. */
export function compareChannelNamesAlpha(a: string, b: string): number {
	return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

/**
 * Discord's actual sibling order: position ascending, then snowflake id.
 * (Equal positions are NOT sorted by name — that was our bug.)
 */
export function compareDiscordSiblingOrder(a: DiscordChannel, b: DiscordChannel): number {
	const posDiff = (a.position ?? 0) - (b.position ?? 0);
	if (posDiff !== 0) return posDiff;
	if (a.id < b.id) return -1;
	if (a.id > b.id) return 1;
	return 0;
}

/** Whether text/announcement children already appear in A–Z name order in the client. */
export function categoryChannelsNeedAlphaSort(children: DiscordChannel[]): boolean {
	if (children.length <= 1) return false;
	const desired = [...children].sort((a, b) => compareChannelNamesAlpha(a.name, b.name));
	const current = [...children].sort(compareDiscordSiblingOrder);
	return desired.some((ch, i) => ch.id !== current[i].id);
}

/**
 * Reorder text/announcement channels under a category alphabetically by name.
 */
export async function sortCategoryChannelsAlphabetically(
	token: string,
	guildId: string,
	categoryId: string,
	allChannels?: DiscordChannel[],
): Promise<{ sorted: number; changed: boolean }> {
	const channels = allChannels ?? (await listGuildChannels(token, guildId));
	const children = channels.filter(
		(ch) => ch.parent_id === categoryId && isLinkableGuildTextChannel(ch.type),
	);

	if (children.length <= 1) return { sorted: children.length, changed: false };
	if (!categoryChannelsNeedAlphaSort(children)) {
		return { sorted: children.length, changed: false };
	}

	const desired = [...children].sort((a, b) => compareChannelNamesAlpha(a.name, b.name));

	// Unique sequential positions among siblings. Do not send parent_id (already correct) —
	// re-sending parent can no-op or reshuffle oddly. Do not use category.position+i as a base:
	// after moves, siblings often share the same position and Discord then orders by id.
	await modifyGuildChannelPositions(
		token,
		guildId,
		desired.map((ch, i) => ({
			id: ch.id,
			position: i,
		})),
	);
	return { sorted: desired.length, changed: true };
}

/** Sort every unique category id in a map (personal letter buckets or similar). */
export async function sortCategoryIdMapAlphabetically(
	token: string,
	guildId: string,
	categoryIds: Iterable<string>,
	allChannels?: DiscordChannel[],
): Promise<{ categoriesSorted: number; channelsTouched: number; errors: string[] }> {
	const channels = allChannels ?? (await listGuildChannels(token, guildId));
	let categoriesSorted = 0;
	let channelsTouched = 0;
	const errors: string[] = [];
	const seen = new Set<string>();
	for (const categoryId of categoryIds) {
		if (!/^\d{15,20}$/.test(categoryId) || seen.has(categoryId)) continue;
		seen.add(categoryId);
		try {
			const result = await sortCategoryChannelsAlphabetically(
				token,
				guildId,
				categoryId,
				channels,
			);
			if (result.changed) {
				categoriesSorted++;
				channelsTouched += result.sorted;
			}
		} catch (error) {
			errors.push(
				`Sort failed for category ${categoryId}: ${error instanceof Error ? error.message : 'unknown'}`,
			);
		}
	}
	return { categoriesSorted, channelsTouched, errors };
}

export async function sortMemberCategoryMapsAlphabetically(
	token: string,
	guildId: string,
	categoryMap: Record<string, string>,
	allChannels?: DiscordChannel[],
): Promise<{ categoriesSorted: number; channelsTouched: number; errors: string[] }> {
	return sortCategoryIdMapAlphabetically(
		token,
		guildId,
		Object.values(categoryMap),
		allChannels,
	);
}
