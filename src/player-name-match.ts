/**
 * Lightweight name matching for admin player lookups (exact + nearest).
 */

export function normalizePlayerName(name: string): string {
	return name.trim().toLowerCase();
}

/** Classic Levenshtein edit distance. */
export function editDistance(a: string, b: string): number {
	const s = normalizePlayerName(a);
	const t = normalizePlayerName(b);
	if (s === t) return 0;
	if (!s.length) return t.length;
	if (!t.length) return s.length;

	const prev = new Array<number>(t.length + 1);
	const cur = new Array<number>(t.length + 1);
	for (let j = 0; j <= t.length; j++) prev[j] = j;

	for (let i = 1; i <= s.length; i++) {
		cur[0] = i;
		for (let j = 1; j <= t.length; j++) {
			const cost = s[i - 1] === t[j - 1] ? 0 : 1;
			cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
		}
		for (let j = 0; j <= t.length; j++) prev[j] = cur[j]!;
	}
	return prev[t.length]!;
}

/** Max distance we still treat as a plausible typo. */
export function maxSuggestDistance(queryLen: number): number {
	const n = Math.max(0, Math.floor(queryLen));
	if (n <= 2) return 1;
	if (n <= 5) return 2;
	return Math.min(4, Math.floor(n / 3) + 1);
}

export type NameCandidate<T> = {
	name: string;
	payload: T;
};

export type NearestMatch<T> = {
	name: string;
	payload: T;
	distance: number;
};

/**
 * Pick the nearest candidate to `query`. Prefer lower edit distance; on ties prefer
 * starts-with / contains, then shorter names.
 */
export function findNearestMatch<T>(
	query: string,
	candidates: Array<NameCandidate<T>>,
): NearestMatch<T> | null {
	const q = normalizePlayerName(query);
	if (!q || candidates.length === 0) return null;

	const maxDist = maxSuggestDistance(q.length);
	let best: NearestMatch<T> | null = null;

	for (const c of candidates) {
		const name = c.name?.trim();
		if (!name) continue;
		const n = normalizePlayerName(name);
		if (!n) continue;

		let distance = editDistance(q, n);
		// Soft boost for prefix / substring typos (still ranked by distance first).
		if (n.startsWith(q) || q.startsWith(n)) {
			distance = Math.min(distance, Math.abs(n.length - q.length));
		} else if (n.includes(q) || q.includes(n)) {
			distance = Math.min(distance, Math.abs(n.length - q.length) + 1);
		}

		if (distance > maxDist) continue;

		if (
			!best ||
			distance < best.distance ||
			(distance === best.distance && name.length < best.name.length)
		) {
			best = { name, payload: c.payload, distance };
		}
	}

	return best;
}
