import { describe, expect, it } from 'vitest';
import {
	canReadAllianceRosterCache,
	collectTrackedAllianceTags,
	shouldUseAllianceRoster,
} from '../src/alliance-roster-sync';
import {
	allianceRosterDiffHasChanges,
	diffAllianceRosters,
	formatAllianceRosterChangeReport,
} from '../src/alliance-roster-diff';
import type { GuildConfig, VerifiedPlayer } from '../src/types';

describe('alliance roster mode gates', () => {
	it('enables single-alliance scrape only for single_alliance with a tag', () => {
		expect(
			shouldUseAllianceRoster({ mode: 'single_alliance', alliance_tag: 'KWSN' }),
		).toBe(true);
		expect(
			shouldUseAllianceRoster({ mode: 'single_alliance', alliance_tag: '  ' }),
		).toBe(false);
		expect(
			shouldUseAllianceRoster({ mode: 'multi_alliance', alliance_tag: 'KWSN' }),
		).toBe(false);
	});

	it('allows multi to read roster cache', () => {
		expect(canReadAllianceRosterCache({ mode: 'multi_alliance', alliance_tag: null })).toBe(
			true,
		);
		expect(canReadAllianceRosterCache({ mode: 'single_alliance', alliance_tag: 'KWSN' })).toBe(
			true,
		);
	});

	it('collects verified tags and diplomacy map tags', () => {
		const config = {
			mode: 'multi_alliance',
			diplomacy_channel_map: { BLUE: '111', gold: '222' },
		} as unknown as GuildConfig;
		const verified = [
			{ alliance_tag: 'KWSN' },
			{ alliance_tag: 'blue' },
			{ alliance_tag: null },
		] as VerifiedPlayer[];
		const tags = collectTrackedAllianceTags(config, verified);
		expect([...tags].sort()).toEqual(['BLUE', 'GOLD', 'KWSN']);
	});
});

describe('alliance roster day-over-day diff', () => {
	const prev = [
		{
			playerId: 1,
			playerName: 'Ada',
			allianceRank: 'Recruit',
			opsLevel: 40,
			allianceTag: 'KWSN',
		},
		{
			playerId: 2,
			playerName: 'Bob',
			allianceRank: 'Operative',
			opsLevel: 50,
			allianceTag: 'KWSN',
		},
		{
			playerId: 3,
			playerName: 'Cara',
			allianceRank: 'Agent',
			opsLevel: 55,
			allianceTag: 'BLUE',
		},
	];

	it('treats empty previous as initial snapshot (no join spam)', () => {
		const diff = diffAllianceRosters([], prev);
		expect(diff.isInitial).toBe(true);
		expect(diff.joined).toHaveLength(0);
		expect(diff.tagMoved).toHaveLength(0);
		expect(allianceRosterDiffHasChanges(diff)).toBe(false);
		const report = formatAllianceRosterChangeReport(diff, { allianceTag: 'KWSN' });
		expect(report.title).toMatch(/initial/i);
	});

	it('detects joins, leaves, ops, rank, renames, and tag moves', () => {
		const next = [
			{
				playerId: 2,
				playerName: 'Bobby',
				allianceRank: 'Agent',
				opsLevel: 52,
				allianceTag: 'BLUE',
			},
			{
				playerId: 3,
				playerName: 'Cara',
				allianceRank: 'Agent',
				opsLevel: 54,
				allianceTag: 'BLUE',
			},
			{
				playerId: 4,
				playerName: 'Dee',
				allianceRank: 'Recruit',
				opsLevel: 30,
				allianceTag: 'KWSN',
			},
		];
		const diff = diffAllianceRosters(prev, next);
		expect(diff.isInitial).toBe(false);
		expect(diff.joined.map((m) => m.playerId)).toEqual([4]);
		expect(diff.left.map((m) => m.playerId)).toEqual([1]);
		expect(diff.tagMoved).toHaveLength(1);
		expect(diff.tagMoved[0]?.playerId).toBe(2);
		expect(diff.tagMoved[0]?.previousTag).toBe('KWSN');
		expect(diff.tagMoved[0]?.allianceTag).toBe('BLUE');
		expect(allianceRosterDiffHasChanges(diff)).toBe(true);

		const report = formatAllianceRosterChangeReport(diff, {
			allianceTag: 'multi',
			mode: 'multi',
			alliancesScraped: 2,
		});
		expect(report.description).toContain('Alliance moves');
		expect(report.description).toContain('BLUE');
		expect(report.description).toContain('Joined');
	});

	it('reports no changes when identical', () => {
		const diff = diffAllianceRosters(prev, prev);
		expect(allianceRosterDiffHasChanges(diff)).toBe(false);
		const report = formatAllianceRosterChangeReport(diff, {
			allianceTag: 'multi',
			mode: 'multi',
		});
		expect(report.title).toMatch(/no changes/i);
	});
});
