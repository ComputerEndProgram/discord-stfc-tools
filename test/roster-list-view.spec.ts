import { describe, it, expect } from 'vitest';
import { parseRosterFormat, parseRosterSort, parseRosterVisibility } from '../src/roster-list-view';

describe('roster list view helpers', () => {
	it('parses format', () => {
		expect(parseRosterFormat('list')).toBe('list');
		expect(parseRosterFormat('table')).toBe('table');
		expect(parseRosterFormat(undefined)).toBe('table');
	});

	it('parses visibility', () => {
		expect(parseRosterVisibility('public')).toBe('public');
		expect(parseRosterVisibility('private')).toBe('private');
		expect(parseRosterVisibility(undefined)).toBe('private');
	});
});
