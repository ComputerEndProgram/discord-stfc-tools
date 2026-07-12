import { describe, expect, it } from 'vitest';
import {
	editDistance,
	findNearestMatch,
	maxSuggestDistance,
} from '../src/player-name-match';

describe('player-name-match', () => {
	it('editDistance is 0 for equal names ignoring case', () => {
		expect(editDistance('Adam', 'adam')).toBe(0);
	});

	it('finds a one-character typo', () => {
		const nearest = findNearestMatch('Adamm', [
			{ name: 'Adam', payload: 1 },
			{ name: 'Bravo', payload: 2 },
		]);
		expect(nearest?.payload).toBe(1);
		expect(nearest?.distance).toBe(1);
	});

	it('rejects distant mismatches', () => {
		expect(
			findNearestMatch('zzzz', [
				{ name: 'Adam', payload: 1 },
				{ name: 'Bravo', payload: 2 },
			]),
		).toBeNull();
	});

	it('maxSuggestDistance scales with query length', () => {
		expect(maxSuggestDistance(2)).toBe(1);
		expect(maxSuggestDistance(5)).toBe(2);
		expect(maxSuggestDistance(12)).toBeGreaterThanOrEqual(2);
	});
});
