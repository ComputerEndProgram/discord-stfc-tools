import {
	countPlayersByAlliance,
	countPlayersByGrade,
	countPlayersByStatus,
	countPlayersForGrade,
} from '../guild-db';
import { badgey } from './persona';
import type { RosterIntent } from './intents';

export async function answerRosterIntent(
	db: D1Database,
	guildId: string,
	locale: string,
	intent: RosterIntent,
): Promise<string> {
	switch (intent.type) {
		case 'grade_count': {
			const count = await countPlayersForGrade(db, guildId, intent.grade);
			return badgey(locale, 'dm.roster.grade_count', { grade: intent.grade, count });
		}
		case 'grades_breakdown': {
			const rows = await countPlayersByGrade(db, guildId);
			if (rows.length === 0) return badgey(locale, 'dm.roster.empty');
			const lines = rows.map((r) => `• G${r.grade}: **${r.count}**`).join('\n');
			return badgey(locale, 'dm.roster.grades_breakdown', { lines });
		}
		case 'alliance_breakdown': {
			const rows = await countPlayersByAlliance(db, guildId);
			if (rows.length === 0) return badgey(locale, 'dm.roster.empty');
			const lines = rows
				.slice(0, 25)
				.map((r) => `• [${r.alliance_tag}]: **${r.count}**`)
				.join('\n');
			return badgey(locale, 'dm.roster.alliance_breakdown', { lines });
		}
		case 'status_breakdown': {
			const rows = await countPlayersByStatus(db, guildId);
			if (rows.length === 0) return badgey(locale, 'dm.roster.empty');
			const lines = rows.map((r) => `• ${r.verification_status}: **${r.count}**`).join('\n');
			return badgey(locale, 'dm.roster.status_breakdown', { lines });
		}
		default:
			return badgey(locale, 'dm.roster.empty');
	}
}
