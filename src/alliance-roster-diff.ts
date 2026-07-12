/** Slim roster row used for day-over-day diffs (ids are stable; names/ranks/ops change). */
export type RosterDiffMember = {
	playerId: number;
	playerName: string;
	allianceRank: string;
	opsLevel: number;
};

export type RosterJoined = RosterDiffMember;
export type RosterLeft = RosterDiffMember;

export type RosterOpsChange = RosterDiffMember & {
	previousOps: number;
	delta: number;
};

export type RosterRankChange = RosterDiffMember & {
	previousRank: string;
};

export type RosterRename = RosterDiffMember & {
	previousName: string;
};

export type AllianceRosterDiff = {
	/** True when there was no previous snapshot to compare. */
	isInitial: boolean;
	previousCount: number;
	currentCount: number;
	joined: RosterJoined[];
	left: RosterLeft[];
	opsUp: RosterOpsChange[];
	opsDown: RosterOpsChange[];
	rankChanged: RosterRankChange[];
	renamed: RosterRename[];
};

function normName(s: string | null | undefined): string {
	return (s ?? '').trim();
}

function normRank(s: string | null | undefined): string {
	return (s ?? '').trim();
}

function toDiffMember(m: {
	playerId: number;
	playerName?: string | null;
	allianceRank?: string | null;
	opsLevel?: number | null;
}): RosterDiffMember {
	return {
		playerId: m.playerId,
		playerName: normName(m.playerName),
		allianceRank: normRank(m.allianceRank),
		opsLevel: Number(m.opsLevel ?? 0) || 0,
	};
}

export function diffAllianceRosters(
	previous: Array<{
		playerId: number;
		playerName?: string | null;
		allianceRank?: string | null;
		opsLevel?: number | null;
	}>,
	current: Array<{
		playerId: number;
		playerName?: string | null;
		allianceRank?: string | null;
		opsLevel?: number | null;
	}>,
): AllianceRosterDiff {
	const prevMap = new Map(previous.map((m) => [m.playerId, toDiffMember(m)]));
	const currMap = new Map(current.map((m) => [m.playerId, toDiffMember(m)]));

	if (previous.length === 0) {
		return {
			isInitial: true,
			previousCount: 0,
			currentCount: current.length,
			joined: [],
			left: [],
			opsUp: [],
			opsDown: [],
			rankChanged: [],
			renamed: [],
		};
	}

	const joined: RosterJoined[] = [];
	const left: RosterLeft[] = [];
	const opsUp: RosterOpsChange[] = [];
	const opsDown: RosterOpsChange[] = [];
	const rankChanged: RosterRankChange[] = [];
	const renamed: RosterRename[] = [];

	for (const [id, curr] of currMap) {
		const prev = prevMap.get(id);
		if (!prev) {
			joined.push(curr);
			continue;
		}
		if (curr.opsLevel > prev.opsLevel) {
			opsUp.push({
				...curr,
				previousOps: prev.opsLevel,
				delta: curr.opsLevel - prev.opsLevel,
			});
		} else if (curr.opsLevel < prev.opsLevel) {
			opsDown.push({
				...curr,
				previousOps: prev.opsLevel,
				delta: curr.opsLevel - prev.opsLevel,
			});
		}
		if (curr.allianceRank !== prev.allianceRank) {
			rankChanged.push({ ...curr, previousRank: prev.allianceRank });
		}
		if (curr.playerName && prev.playerName && curr.playerName !== prev.playerName) {
			renamed.push({ ...curr, previousName: prev.playerName });
		}
	}

	for (const [id, prev] of prevMap) {
		if (!currMap.has(id)) left.push(prev);
	}

	const byName = (a: RosterDiffMember, b: RosterDiffMember) =>
		a.playerName.localeCompare(b.playerName, undefined, { sensitivity: 'base' });
	joined.sort(byName);
	left.sort(byName);
	opsUp.sort((a, b) => b.delta - a.delta || byName(a, b));
	opsDown.sort((a, b) => a.delta - b.delta || byName(a, b));
	rankChanged.sort(byName);
	renamed.sort(byName);

	return {
		isInitial: false,
		previousCount: previous.length,
		currentCount: current.length,
		joined,
		left,
		opsUp,
		opsDown,
		rankChanged,
		renamed,
	};
}

export function allianceRosterDiffHasChanges(diff: AllianceRosterDiff): boolean {
	if (diff.isInitial) return false;
	return (
		diff.joined.length > 0 ||
		diff.left.length > 0 ||
		diff.opsUp.length > 0 ||
		diff.opsDown.length > 0 ||
		diff.rankChanged.length > 0 ||
		diff.renamed.length > 0
	);
}

function formatList(lines: string[], limit = 20): string {
	if (lines.length === 0) return '_None_';
	const shown = lines.slice(0, limit);
	const extra = lines.length - shown.length;
	return shown.join('\n') + (extra > 0 ? `\n_…and ${extra} more_` : '');
}

/** Discord-friendly markdown body for the morning roster report. */
export function formatAllianceRosterChangeReport(
	diff: AllianceRosterDiff,
	opts: { allianceTag: string; allianceId?: string | null },
): { title: string; description: string } {
	const tag = opts.allianceTag || 'alliance';
	const idBit = opts.allianceId ? ` (id \`${opts.allianceId}\`)` : '';

	if (diff.isInitial) {
		return {
			title: 'Alliance roster — initial snapshot',
			description:
				`Cached **${diff.currentCount}** members for **${tag}**${idBit}.\n` +
				`Day-over-day joins/leaves/ops/rank will appear on the next morning scrape.`,
		};
	}

	const title = allianceRosterDiffHasChanges(diff)
		? 'Alliance roster — daily changes'
		: 'Alliance roster — no changes';

	const summary =
		`**${tag}**${idBit}: **${diff.previousCount}** → **${diff.currentCount}** members\n` +
		`Joined **${diff.joined.length}** · Left **${diff.left.length}** · ` +
		`Ops↑ **${diff.opsUp.length}** · Ops↓ **${diff.opsDown.length}** · ` +
		`Rank **${diff.rankChanged.length}** · Rename **${diff.renamed.length}**`;

	if (!allianceRosterDiffHasChanges(diff)) {
		return { title, description: summary };
	}

	const sections: string[] = [summary, ''];

	if (diff.joined.length) {
		sections.push(
			'**Joined**',
			formatList(
				diff.joined.map(
					(m) =>
						`• **${m.playerName || m.playerId}** — Ops ${m.opsLevel}` +
						(m.allianceRank ? ` · ${m.allianceRank}` : ''),
				),
			),
			'',
		);
	}
	if (diff.left.length) {
		sections.push(
			'**Left**',
			formatList(
				diff.left.map(
					(m) =>
						`• **${m.playerName || m.playerId}** — Ops ${m.opsLevel}` +
						(m.allianceRank ? ` · ${m.allianceRank}` : ''),
				),
			),
			'',
		);
	}
	if (diff.opsUp.length) {
		sections.push(
			'**Ops up**',
			formatList(
				diff.opsUp.map(
					(m) =>
						`• **${m.playerName || m.playerId}** — ${m.previousOps} → **${m.opsLevel}** (+${m.delta})`,
				),
			),
			'',
		);
	}
	if (diff.opsDown.length) {
		sections.push(
			'**Ops down**',
			formatList(
				diff.opsDown.map(
					(m) =>
						`• **${m.playerName || m.playerId}** — ${m.previousOps} → **${m.opsLevel}** (${m.delta})`,
				),
			),
			'',
		);
	}
	if (diff.rankChanged.length) {
		sections.push(
			'**Rank changes**',
			formatList(
				diff.rankChanged.map(
					(m) =>
						`• **${m.playerName || m.playerId}** — ${m.previousRank || '—'} → **${m.allianceRank || '—'}**`,
				),
			),
			'',
		);
	}
	if (diff.renamed.length) {
		sections.push(
			'**Renames**',
			formatList(
				diff.renamed.map(
					(m) => `• **${m.previousName}** → **${m.playerName}**`,
				),
			),
			'',
		);
	}

	let description = sections.join('\n').trim();
	if (description.length > 3900) {
		description = description.slice(0, 3890) + '\n_…truncated_';
	}
	return { title, description };
}
