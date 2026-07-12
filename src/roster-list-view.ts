/**
 * Paginated /roster list replies: ASCII table or dense list + Prev/Next/Format buttons.
 */

import {
	interactionResponse,
	interactionResponseWithComponents,
	updateMessageResponse,
	type DiscordActionRow,
} from './discord-api';
import {
	countAllianceMembersMissingVerify,
	countRosterPlayers,
	createRosterListSession,
	getRosterListSession,
	listAllianceMembersMissingVerify,
	listRosterPlayers,
	updateRosterListSessionPayload,
	type AllianceRosterMemberRow,
	type RosterListSessionPayload,
	type RosterPlayerSort,
} from './guild-db';
import {
	formatReportTable,
	playerCell,
	ReportCols,
	tagCell,
} from './report-table';
import type { VerifiedPlayer } from './types';

const TABLE_PAGE_SIZE = 15;
const LIST_PAGE_SIZE = 80;
const CONTENT_BUDGET = 1850;

export type RosterListFormat = 'table' | 'list';

function sortLabel(sort: RosterListSessionPayload['sort']): string {
	switch (sort) {
		case 'name':
			return 'name ↑';
		case 'streak':
			return 'streak ↓';
		case 'inactive':
			return 'inactive ↓';
		case 'grade':
			return 'grade ↓';
		case 'rank':
			return 'rank ↑';
		case 'ops':
		default:
			return 'ops ↓';
	}
}

function pageSizeFor(format: RosterListFormat): number {
	return format === 'list' ? LIST_PAGE_SIZE : TABLE_PAGE_SIZE;
}

function verifiedDenseLine(p: VerifiedPlayer): string {
	const name = playerCell(p.player_name);
	const tag = tagCell(p.alliance_tag);
	const ops = p.ops_level != null ? String(p.ops_level) : '—';
	const grade = p.grade != null ? `G${p.grade}` : '—';
	const streak =
		p.days_inactive > 0
			? `inactive ${p.days_inactive}d`
			: p.activity_streak != null
				? `s${p.activity_streak}`
				: 's—';
	return `${name} · ${tag} · ${ops} · ${grade} · ${streak}`;
}

function missingDenseLine(m: AllianceRosterMemberRow): string {
	const name = playerCell(m.player_name, m.player_id);
	const tag = tagCell(m.alliance_tag);
	const ops = m.ops_level != null ? String(m.ops_level) : '—';
	const rank = m.alliance_rank || '—';
	return `${name} · ${tag} · ${ops} · ${rank} · \`${m.player_id}\``;
}

function verifiedTableBody(players: VerifiedPlayer[], maxRows: number, maxChars: number): string {
	return formatReportTable(
		players.map((p) => ({
			Player: playerCell(p.player_name),
			Tag: tagCell(p.alliance_tag),
			Ops: p.ops_level != null ? p.ops_level : '—',
			Grade: p.grade != null ? `G${p.grade}` : '—',
			Status: p.verification_status || '—',
			Streak: p.activity_streak != null ? p.activity_streak : '—',
			Inactive: p.days_inactive > 0 ? `${p.days_inactive}d` : '—',
		})),
		[
			ReportCols.player,
			ReportCols.tag,
			ReportCols.ops,
			ReportCols.grade,
			ReportCols.status,
			ReportCols.streak,
			ReportCols.inactive,
		],
		{ maxRows, maxChars, omitEmptyColumns: true },
	);
}

function missingTableBody(rows: AllianceRosterMemberRow[], maxRows: number, maxChars: number): string {
	return formatReportTable(
		rows.map((m) => ({
			Player: playerCell(m.player_name, m.player_id),
			Tag: tagCell(m.alliance_tag),
			Ops: m.ops_level != null ? m.ops_level : '—',
			Rank: m.alliance_rank || '—',
			Id: String(m.player_id),
		})),
		[
			ReportCols.player,
			ReportCols.tag,
			ReportCols.ops,
			ReportCols.rank,
			{ header: 'Id', width: 8, align: 'right' },
		],
		{ maxRows, maxChars, omitEmptyColumns: true },
	);
}

function packLines(lines: string[], maxChars: number): { text: string; shown: number } {
	const out: string[] = [];
	let used = 0;
	for (const line of lines) {
		const add = (out.length ? 1 : 0) + line.length;
		if (used + add > maxChars && out.length > 0) break;
		out.push(line);
		used += add;
	}
	return { text: out.join('\n'), shown: out.length };
}

function buildComponents(
	token: string,
	page: number,
	totalPages: number,
	format: RosterListFormat,
): DiscordActionRow[] {
	const prevDisabled = page <= 1;
	const nextDisabled = page >= totalPages;
	return [
		{
			type: 1,
			components: [
				{
					type: 2,
					style: 2,
					label: 'Previous',
					custom_id: `rst:${token}:prev`,
					disabled: prevDisabled,
				},
				{
					type: 2,
					style: 1,
					label: 'Next',
					custom_id: `rst:${token}:next`,
					disabled: nextDisabled,
				},
				{
					type: 2,
					style: format === 'list' ? 2 : 3,
					label: 'Full list',
					custom_id: `rst:${token}:list`,
					disabled: format === 'list',
				},
				{
					type: 2,
					style: format === 'table' ? 2 : 3,
					label: 'Table',
					custom_id: `rst:${token}:table`,
					disabled: format === 'table',
				},
			],
		},
	];
}

async function loadPage(
	db: D1Database,
	guildId: string,
	payload: RosterListSessionPayload,
): Promise<{ total: number; body: string; shown: number; pageSize: number }> {
	const format = payload.format;
	const pageSize = pageSizeFor(format);
	const page = Math.max(1, Math.floor(payload.page || 1));
	const offset = (page - 1) * pageSize;
	const headerBudget = Math.min(400, payload.title.length + 80);
	const bodyBudget = Math.max(400, CONTENT_BUDGET - headerBudget);

	if (payload.kind === 'missing-verify') {
		const total = await countAllianceMembersMissingVerify(db, guildId);
		const sort =
			payload.sort === 'name' || payload.sort === 'rank' || payload.sort === 'ops'
				? payload.sort
				: 'ops';
		const rows = await listAllianceMembersMissingVerify(db, guildId, {
			limit: pageSize,
			offset,
			sort,
		});
		if (format === 'list') {
			const packed = packLines(rows.map(missingDenseLine), bodyBudget);
			return { total, body: packed.text, shown: packed.shown, pageSize };
		}
		const body = missingTableBody(rows, pageSize, bodyBudget);
		return { total, body, shown: Math.min(rows.length, pageSize), pageSize };
	}

	const filters = {
		grade: payload.filters.grade,
		opsMin: payload.filters.opsMin,
		opsMax: payload.filters.opsMax,
		allianceRank: payload.filters.allianceRank,
		daysInactiveMin: payload.filters.daysInactiveMin,
	};
	const sort: RosterPlayerSort =
		payload.sort === 'rank' ? 'ops' : (payload.sort as RosterPlayerSort);
	const total = await countRosterPlayers(db, guildId, filters);
	const players = await listRosterPlayers(db, guildId, {
		...filters,
		sort,
		limit: pageSize,
		offset,
	});

	if (format === 'list') {
		const packed = packLines(players.map(verifiedDenseLine), bodyBudget);
		return { total, body: packed.text, shown: packed.shown, pageSize };
	}
	const body = verifiedTableBody(players, pageSize, bodyBudget);
	return { total, body, shown: Math.min(players.length, pageSize), pageSize };
}

export async function renderRosterListContent(
	db: D1Database,
	guildId: string,
	payload: RosterListSessionPayload,
): Promise<{ content: string; components: DiscordActionRow[]; payload: RosterListSessionPayload }> {
	let page = Math.max(1, Math.floor(payload.page || 1));
	let working = { ...payload, page };

	let loaded = await loadPage(db, guildId, working);
	const totalPages = Math.max(1, Math.ceil(loaded.total / loaded.pageSize) || 1);
	if (page > totalPages) {
		page = totalPages;
		working = { ...working, page };
		loaded = await loadPage(db, guildId, working);
	}

	const from = loaded.total === 0 ? 0 : (page - 1) * loaded.pageSize + 1;
	const to = loaded.total === 0 ? 0 : Math.min(loaded.total, from + loaded.shown - 1);
	const footer =
		`Showing **${from}–${to}** of **${loaded.total}**` +
		` · sorted by ${sortLabel(working.sort)}` +
		` · format **${working.format}**` +
		(totalPages > 1 ? ` · page **${page}/${totalPages}**` : '');

	const content = `${working.title}\n${loaded.body}\n\n_${footer}_`;
	return {
		content: content.length > 2000 ? content.slice(0, 1990) + '\n_…_' : content,
		components: [], // filled by caller with token
		payload: working,
	};
}

export async function startRosterListReply(
	env: Env,
	opts: {
		guildId: string;
		userId: string;
		payload: Omit<RosterListSessionPayload, 'page'> & { page?: number };
	},
): Promise<Response> {
	const initial: RosterListSessionPayload = {
		...opts.payload,
		page: Math.max(1, opts.payload.page ?? 1),
	};
	const total = await (initial.kind === 'missing-verify'
		? countAllianceMembersMissingVerify(env.STFC_DB, opts.guildId)
		: countRosterPlayers(env.STFC_DB, opts.guildId, initial.filters));
	if (total === 0) {
		return interactionResponse(`${initial.title}\n\nNo matching players.`, true);
	}

	const rendered = await renderRosterListContent(env.STFC_DB, opts.guildId, initial);
	const session = await createRosterListSession(env.STFC_DB, {
		guildId: opts.guildId,
		userId: opts.userId,
		payload: rendered.payload,
	});
	const pageSize = pageSizeFor(rendered.payload.format);
	const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

	return interactionResponseWithComponents(rendered.content, {
		ephemeral: true,
		components: buildComponents(
			session.token,
			rendered.payload.page,
			totalPages,
			rendered.payload.format,
		),
	});
}

export async function handleRosterListComponent(
	env: Env,
	interaction: {
		guild_id?: string;
		member?: { user?: { id: string } };
		user?: { id: string };
		data?: { custom_id?: string };
	},
): Promise<Response> {
	const customId = interaction.data?.custom_id ?? '';
	const m = /^rst:([a-f0-9]+):(prev|next|list|table)$/i.exec(customId);
	if (!m) {
		return interactionResponse('❌ Unknown roster button.', true);
	}
	const token = m[1]!;
	const action = m[2]!.toLowerCase() as 'prev' | 'next' | 'list' | 'table';
	const userId = interaction.member?.user?.id ?? interaction.user?.id;
	const guildId = interaction.guild_id;

	const session = await getRosterListSession(env.STFC_DB, token);
	if (!session || !guildId || session.guild_id !== guildId) {
		return interactionResponse('❌ This roster list expired. Run the `/roster` command again.', true);
	}
	if (!userId || session.user_id !== userId) {
		return interactionResponse('❌ Only the person who ran the command can use these buttons.', true);
	}

	const payload = { ...session.payload };
	if (action === 'prev') payload.page = Math.max(1, payload.page - 1);
	else if (action === 'next') payload.page = payload.page + 1;
	else if (action === 'list') {
		payload.format = 'list';
		payload.page = 1;
	} else if (action === 'table') {
		payload.format = 'table';
		payload.page = 1;
	}

	const rendered = await renderRosterListContent(env.STFC_DB, guildId, payload);
	await updateRosterListSessionPayload(env.STFC_DB, token, rendered.payload);

	const pageSize = pageSizeFor(rendered.payload.format);
	const total =
		rendered.payload.kind === 'missing-verify'
			? await countAllianceMembersMissingVerify(env.STFC_DB, guildId)
			: await countRosterPlayers(env.STFC_DB, guildId, rendered.payload.filters);
	const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

	return updateMessageResponse(rendered.content, {
		components: buildComponents(
			token,
			rendered.payload.page,
			totalPages,
			rendered.payload.format,
		),
	});
}

export function parseRosterSort(
	raw: unknown,
	fallback: RosterPlayerSort | 'rank',
	allowed: Array<RosterPlayerSort | 'rank'>,
): RosterPlayerSort | 'rank' {
	const s = String(raw ?? '').trim().toLowerCase();
	if (allowed.includes(s as RosterPlayerSort | 'rank')) return s as RosterPlayerSort | 'rank';
	return fallback;
}

export function parseRosterFormat(raw: unknown): RosterListFormat {
	return String(raw ?? '').trim().toLowerCase() === 'list' ? 'list' : 'table';
}
