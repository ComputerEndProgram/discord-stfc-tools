/**
 * Discord-safe compact ASCII tables for cron audit embeds and /roster lists.
 * Mentions do not render inside code fences — use player names in cells.
 */

import {
	generateAsciiTable,
	type TableColumn,
	type TableData,
} from './tableUtils';

export const ReportCols = {
	player: { header: 'Player', width: 12 },
	tag: { header: 'Tag', width: 4 },
	ops: { header: 'Ops', width: 3, align: 'right' as const },
	rank: { header: 'Rank', width: 6 },
	from: { header: 'From', width: 4 },
	to: { header: 'To', width: 4 },
	delta: { header: 'Δ', width: 3, align: 'right' as const },
	grade: { header: 'Grade', width: 5 },
	status: { header: 'Status', width: 6 },
	streak: { header: 'Streak', width: 6, align: 'right' as const },
	inactive: { header: 'Inactive', width: 8, align: 'right' as const },
	prevOps: { header: 'Was', width: 3, align: 'right' as const },
	prevName: { header: 'Was', width: 12 },
	/** yes = linked on Discord; no = alliance cache only */
	discord: { header: 'DC', width: 3 },
} satisfies Record<string, TableColumn>;

export type FormatReportTableOpts = {
	/** Max data rows to render (extra become “…and N more”). Default 20. */
	maxRows?: number;
	/** Soft cap on fenced table length; drop rows until under. Default 3500. */
	maxChars?: number;
	/** When true, omit columns that are empty/— for every shown row. */
	omitEmptyColumns?: boolean;
};

function cellStr(v: string | number | undefined | null): string {
	if (v == null) return '—';
	const s = String(v).trim();
	return s.length ? s : '—';
}

/** Drop columns where every row is blank / em dash. */
export function omitBlankColumns(rows: TableData[], columns: TableColumn[]): TableColumn[] {
	return columns.filter((col) =>
		rows.some((row) => {
			const v = cellStr(row[col.header]);
			return v !== '—' && v !== '';
		}),
	);
}

/**
 * Build a fenced compact ASCII table for Discord.
 * Returns empty string when there are no rows.
 */
export function formatReportTable(
	rows: TableData[],
	columns: TableColumn[],
	opts?: FormatReportTableOpts,
): string {
	if (!rows.length || !columns.length) return '';

	const maxRows = opts?.maxRows ?? 20;
	const maxChars = opts?.maxChars ?? 3500;
	let shown = rows.slice(0, maxRows);
	let hidden = Math.max(0, rows.length - shown.length);

	let cols = columns;
	if (opts?.omitEmptyColumns) {
		cols = omitBlankColumns(shown, columns);
		if (!cols.length) cols = columns;
	}

	const build = (data: TableData[], extraHidden: number): string => {
		const table = generateAsciiTable(data, cols, { compact: true });
		const more =
			extraHidden > 0 ? `\n_…and ${extraHidden} more_` : '';
		return `\`\`\`\n${table}\n\`\`\`${more}`;
	};

	let out = build(shown, hidden);
	while (out.length > maxChars && shown.length > 1) {
		shown = shown.slice(0, -1);
		hidden = rows.length - shown.length;
		out = build(shown, hidden);
	}

	return out;
}

/** Section heading + fenced table (or nothing if empty). */
export function formatReportSection(
	heading: string,
	rows: TableData[],
	columns: TableColumn[],
	opts?: FormatReportTableOpts,
): string {
	const table = formatReportTable(rows, columns, opts);
	if (!table) return '';
	return `**${heading} (${rows.length})**\n${table}`;
}

export function playerCell(name: string | null | undefined, fallbackId?: number | string): string {
	const n = (name ?? '').trim();
	if (n) return n;
	if (fallbackId != null && String(fallbackId).length) return String(fallbackId);
	return '—';
}

export function tagCell(tag: string | null | undefined): string {
	const t = (tag ?? '').trim();
	return t ? t.replace(/^\[|\]$/g, '') : '—';
}
