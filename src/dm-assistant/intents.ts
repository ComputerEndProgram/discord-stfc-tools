export type RosterIntent =
	| { type: 'grade_count'; grade: number }
	| { type: 'grades_breakdown' }
	| { type: 'alliance_breakdown' }
	| { type: 'status_breakdown' };

const GRADE_RE =
	/\b(?:how\s+many|count|number\s+of|сколько|wie\s+viele|combien|cu[aá]ntos?)\b[\s\S]*?\bg\s*([3-7])\b/i;
const GRADE_ALT_RE = /\bg\s*([3-7])\b[\s\S]*?\b(?:players?|members?|count|how\s+many)\b/i;
const GRADES_BREAKDOWN_RE =
	/\b(?:grade\s+(?:break\s*down|breakdown|distribution|counts?)|how\s+many\s+per\s+grade|grades?\s+summary)\b/i;
const ALLIANCE_RE =
	/\b(?:alliance\s+(?:break\s*down|breakdown|counts?|tags?)|by\s+alliance|alliances?\s+summary)\b/i;
const STATUS_RE =
	/\b(?:guest\s+(?:vs|versus|and)\s+active|active\s+vs\s+guest|status\s+(?:break\s*down|breakdown|counts?)|how\s+many\s+guests?)\b/i;

/** Deterministic roster intent matching (no LLM). */
export function matchRosterIntent(content: string): RosterIntent | null {
	const text = content.trim();
	if (!text) return null;

	const gradeMatch = text.match(GRADE_RE) || text.match(GRADE_ALT_RE);
	if (gradeMatch) {
		const grade = Number(gradeMatch[1]);
		if (grade >= 3 && grade <= 7) return { type: 'grade_count', grade };
	}

	if (GRADES_BREAKDOWN_RE.test(text)) return { type: 'grades_breakdown' };
	if (ALLIANCE_RE.test(text)) return { type: 'alliance_breakdown' };
	if (STATUS_RE.test(text)) return { type: 'status_breakdown' };

	return null;
}

/** Heuristic: looks like a question we might answer or refuse with HAL. */
export function looksLikeQuestion(content: string): boolean {
	const t = content.trim();
	if (!t) return false;
	if (t.includes('?')) return true;
	return /^(how|what|who|where|when|why|can|do|does|is|are|count|list|show|tell)\b/i.test(t);
}
