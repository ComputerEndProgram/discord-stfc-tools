import { describe, expect, it } from 'vitest';
import { shouldUseAllianceRoster } from '../src/alliance-roster-sync';
import {
	allianceRosterDiffHasChanges,
	diffAllianceRosters,
	formatAllianceRosterChangeReport,
} from '../src/alliance-roster-diff';

describe('alliance roster multi-alliance safety', () => {
	it('enables roster only for single_alliance with a tag', () => {
		expect(
			shouldUseAllianceRoster({ mode: 'single_alliance', alliance_tag: 'KWSN' }),
		).toBe(true);
		expect(
			shouldUseAllianceRoster({ mode: 'single_alliance', alliance_tag: '  ' }),
		).toBe(false);
		expect(
			shouldUseAllianceRoster({ mode: 'single_alliance', alliance_tag: null }),
		).toBe(false);
	});

	it('never enables roster for multi_alliance (even with leftover tag)', () => {
		expect(
			shouldUseAllianceRoster({ mode: 'multi_alliance', alliance_tag: 'KWSN' }),
		).toBe(false);
		expect(
			shouldUseAllianceRoster({ mode: 'multi_alliance', alliance_tag: null }),
		).toBe(false);
	});
});

describe('alliance roster day-over-day diff', () => {
	const prev = [
		{ playerId: 1, playerName: 'Ada', allianceRank: 'Recruit', opsLevel: 40 },
		{ playerId: 2, playerName: 'Bob', allianceRank: 'Operative', opsLevel: 50 },
		{ playerId: 3, playerName: 'Cara', allianceRank: 'Agent', opsLevel: 55 },
	];

	it('treats empty previous as initial snapshot (no join spam)', () => {
		const diff = diffAllianceRosters([], prev);
		expect(diff.isInitial).toBe(true);
		expect(diff.joined).toHaveLength(0);
		expect(allianceRosterDiffHasChanges(diff)).toBe(false);
		const report = formatAllianceRosterChangeReport(diff, { allianceTag: 'KWSN' });
		expect(report.title).toMatch(/initial/i);
	});

	it('detects joins, leaves, ops, rank, and renames', () => {
		const next = [
			{ playerId: 2, playerName: 'Bobby', allianceRank: 'Agent', opsLevel: 52 },
			{ playerId: 3, playerName: 'Cara', allianceRank: 'Agent', opsLevel: 54 },
			{ playerId: 4, playerName: 'Dee', allianceRank: 'Recruit', opsLevel: 30 },
		];
		const diff = diffAllianceRosters(prev, next);
		expect(diff.isInitial).toBe(false);
		expect(diff.joined.map((m) => m.playerId)).toEqual([4]);
		expect(diff.left.map((m) => m.playerId)).toEqual([1]);
		expect(diff.opsUp).toHaveLength(1);
		expect(diff.opsUp[0]?.playerId).toBe(2);
		expect(diff.opsUp[0]?.delta).toBe(2);
		expect(diff.opsDown).toHaveLength(1);
		expect(diff.opsDown[0]?.playerId).toBe(3);
		expect(diff.rankChanged.map((m) => m.playerId)).toEqual([2]);
		expect(diff.renamed[0]?.previousName).toBe('Bob');
		expect(diff.renamed[0]?.playerName).toBe('Bobby');
		expect(allianceRosterDiffHasChanges(diff)).toBe(true);

		const report = formatAllianceRosterChangeReport(diff, {
			allianceTag: 'KWSN',
			allianceId: '2990767785',
		});
		expect(report.description).toContain('Joined');
		expect(report.description).toContain('Left');
		expect(report.description).toContain('Ops up');
		expect(report.description).toContain('Dee');
		expect(report.description).toContain('Ada');
	});

	it('reports no changes when identical', () => {
		const diff = diffAllianceRosters(prev, prev);
		expect(allianceRosterDiffHasChanges(diff)).toBe(false);
		const report = formatAllianceRosterChangeReport(diff, { allianceTag: 'KWSN' });
		expect(report.title).toMatch(/no changes/i);
	});
});
