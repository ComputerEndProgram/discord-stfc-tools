import { describe, it, expect } from 'vitest';
import { parseRosterFormat, parseRosterSort } from '../src/roster-list-view';

describe('roster list view helpers', () => {
	it('parses format', () => {
		expect(parseRosterFormat('list')).toBe('list');
		expect(parseRosterFormat('table')).toBe('table');
		expect(parseRosterFormat(undefined)).toBe('table');
	});

	it('parses sort with fallback', () => {
		expect(parseRosterSort('streak', 'ops', ['ops', 'streak'])).toBe('streak');
		expect(parseRosterSort('nope', 'inactive', ['ops', 'inactive'])).toBe('inactive');
	});
});
