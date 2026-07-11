/**
 * Optional Workers AI intent helper — OFF by default.
 * Only runs when env.DM_AI_ENABLED=true, guild.dm_ai_enabled, and AI binding exists.
 * Hard-caps daily requests to stay within free-tier comfort (default 50/day).
 */

import { getDmAiUsage, incrementDmAiUsage } from '../guild-db';
import type { GuildConfig } from '../types';
import { matchRosterIntent, type RosterIntent } from './intents';

const DEFAULT_DAILY_LIMIT = 50;

function utcDay(): string {
	return new Date().toISOString().slice(0, 10);
}

function dailyLimit(env: Env): number {
	const raw = env.DM_AI_DAILY_LIMIT;
	const n = raw ? Number(raw) : DEFAULT_DAILY_LIMIT;
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_LIMIT;
}

export function isDmAiGloballyEnabled(env: Env): boolean {
	return String(env.DM_AI_ENABLED ?? '').toLowerCase() === 'true' && Boolean(env.AI);
}

export async function tryClassifyRosterIntentWithAi(
	env: Env,
	config: GuildConfig,
	userMessage: string,
): Promise<RosterIntent | null> {
	if (!isDmAiGloballyEnabled(env) || !config.dm_ai_enabled || !env.AI) return null;

	const day = utcDay();
	const used = await getDmAiUsage(env.STFC_DB, day);
	if (used >= dailyLimit(env)) {
		console.warn(`DM AI daily limit reached (${used}); skipping inference`);
		return null;
	}

	try {
		await incrementDmAiUsage(env.STFC_DB, day);

		const result = (await (env.AI as { run: (model: string, input: unknown) => Promise<unknown> }).run(
			'@cf/meta/llama-3.1-8b-instruct',
			{
				messages: [
					{
						role: 'system',
						content:
							'Classify STFC Discord roster questions. Reply with ONLY one JSON object, no markdown:\n' +
							'{"intent":"grade_count","grade":6} | {"intent":"grades_breakdown"} | ' +
							'{"intent":"alliance_breakdown"} | {"intent":"status_breakdown"} | {"intent":"none"}\n' +
							'Grades are 3-7 (G3-G7). Use none if not a roster analytics question.',
					},
					{ role: 'user', content: userMessage.slice(0, 500) },
				],
				max_tokens: 80,
			},
		)) as { response?: string };

		const text = (result.response ?? '').trim();
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return matchRosterIntent(userMessage);

		const parsed = JSON.parse(jsonMatch[0]) as {
			intent?: string;
			grade?: number;
		};

		switch (parsed.intent) {
			case 'grade_count': {
				const grade = Number(parsed.grade);
				if (grade >= 3 && grade <= 7) return { type: 'grade_count', grade };
				return null;
			}
			case 'grades_breakdown':
				return { type: 'grades_breakdown' };
			case 'alliance_breakdown':
				return { type: 'alliance_breakdown' };
			case 'status_breakdown':
				return { type: 'status_breakdown' };
			default:
				return null;
		}
	} catch (err) {
		console.error('DM AI classify failed:', err);
		return null;
	}
}
