import { describe, it, expect } from 'vitest';
import {
	isGuildAdministrator,
	resolveRequiredUserOption,
	resolveTargetUserId,
} from '../src/discord-admin';

describe('discord-admin', () => {
	it('detects administrator permission bit', () => {
		expect(isGuildAdministrator('8')).toBe(true);
		expect(isGuildAdministrator('0')).toBe(false);
	});

	it('resolveTargetUserId prefers user option, else invoker', () => {
		expect(
			resolveTargetUserId({ member: { user: { id: 'admin1' } } }, [
				{ name: 'user', value: 'member99' },
			]),
		).toBe('member99');
		expect(resolveTargetUserId({ member: { user: { id: 'admin1' } } }, [])).toBe('admin1');
	});

	it('resolveRequiredUserOption does not fall back to invoker', () => {
		expect(
			resolveRequiredUserOption([{ name: 'user', value: 'member99' }]),
		).toBe('member99');
		expect(resolveRequiredUserOption([{ name: 'link', value: 'https://stfc.pro/x' }])).toBeUndefined();
		expect(resolveRequiredUserOption([])).toBeUndefined();
		expect(resolveRequiredUserOption(undefined)).toBeUndefined();
	});
});
