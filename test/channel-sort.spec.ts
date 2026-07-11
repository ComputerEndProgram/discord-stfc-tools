import { describe, expect, it } from 'vitest';
import {
	categoryChannelsNeedAlphaSort,
	compareChannelNamesAlpha,
	compareDiscordSiblingOrder,
} from '../src/channel-sort';
import type { DiscordChannel } from '../src/discord-api';

function ch(
	id: string,
	name: string,
	position: number,
	parent_id = 'cat1',
): DiscordChannel {
	return { id, name, type: 0, position, parent_id, guild_id: 'g1' };
}

describe('compareChannelNamesAlpha', () => {
	it('orders case-insensitively with numeric awareness', () => {
		const names = ['zeta', 'Adam', 'bob2', 'bob10', 'ålice'];
		const sorted = [...names].sort(compareChannelNamesAlpha);
		expect(sorted).toEqual(['Adam', 'ålice', 'bob2', 'bob10', 'zeta']);
	});
});

describe('compareDiscordSiblingOrder', () => {
	it('orders by position then snowflake id (not name)', () => {
		const a = ch('100', 'zeta', 0);
		const b = ch('200', 'adam', 0);
		const c = ch('150', 'mid', 1);
		expect([a, b, c].sort(compareDiscordSiblingOrder).map((x) => x.id)).toEqual([
			'100',
			'200',
			'150',
		]);
	});
});

describe('categoryChannelsNeedAlphaSort', () => {
	it('is false when Discord order already matches A–Z names', () => {
		const children = [ch('1', 'adam', 0), ch('2', 'bob', 1), ch('3', 'zoe', 2)];
		expect(categoryChannelsNeedAlphaSort(children)).toBe(false);
	});

	it('is true when positions match name order but ties would show wrong in Discord', () => {
		// All position 0: Discord shows by id (100 before 200), names want adam before zeta
		const children = [ch('200', 'adam', 0), ch('100', 'zeta', 0)];
		expect(categoryChannelsNeedAlphaSort(children)).toBe(true);
	});

	it('is true when positions are out of name order', () => {
		const children = [ch('1', 'zoe', 0), ch('2', 'adam', 1)];
		expect(categoryChannelsNeedAlphaSort(children)).toBe(true);
	});

	it('is false for 0–1 channels', () => {
		expect(categoryChannelsNeedAlphaSort([])).toBe(false);
		expect(categoryChannelsNeedAlphaSort([ch('1', 'only', 0)])).toBe(false);
	});
});
