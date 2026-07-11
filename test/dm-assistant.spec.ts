import { describe, expect, it } from 'vitest';
import { looksLikeQuestion, matchRosterIntent } from '../src/dm-assistant/intents';
import { computeMemberPermissions } from '../src/dm-assistant/admin-auth';
import { ADMINISTRATOR, MANAGE_GUILD, hasAdminOrManageGuild } from '../src/discord-admin';
import { displayPlayerName } from '../src/dm-assistant/persona';
import { isMenuKeyword } from '../src/dm-assistant/menu';

describe('matchRosterIntent', () => {
	it('matches how many G6 players', () => {
		expect(matchRosterIntent('how many G6 players do we have?')).toEqual({
			type: 'grade_count',
			grade: 6,
		});
	});

	it('matches grade breakdown', () => {
		expect(matchRosterIntent('grade breakdown please')).toEqual({ type: 'grades_breakdown' });
	});

	it('matches alliance breakdown', () => {
		expect(matchRosterIntent('alliance breakdown')).toEqual({ type: 'alliance_breakdown' });
	});

	it('matches status / guests', () => {
		expect(matchRosterIntent('how many guests?')).toEqual({ type: 'status_breakdown' });
	});

	it('returns null for unrelated text', () => {
		expect(matchRosterIntent('what is the meaning of life')).toBeNull();
	});
});

describe('looksLikeQuestion / menu keywords', () => {
	it('detects questions', () => {
		expect(looksLikeQuestion('how are you?')).toBe(true);
		expect(looksLikeQuestion('hello')).toBe(false);
	});

	it('detects menu keywords', () => {
		expect(isMenuKeyword('menu')).toBe(true);
		expect(isMenuKeyword('Admin!')).toBe(true);
		expect(isMenuKeyword('hello')).toBe(false);
	});
});

describe('admin permission helpers', () => {
	it('hasAdminOrManageGuild', () => {
		expect(hasAdminOrManageGuild(ADMINISTRATOR)).toBe(true);
		expect(hasAdminOrManageGuild(MANAGE_GUILD)).toBe(true);
		expect(hasAdminOrManageGuild(0n)).toBe(false);
	});

	it('computeMemberPermissions includes role bits', () => {
		const guildId = 'g1';
		const roles = [
			{ id: guildId, permissions: '0' },
			{ id: 'r1', permissions: String(MANAGE_GUILD) },
		];
		const member = {
			user: { id: 'u1', username: 'x' },
			nick: null,
			roles: ['r1'],
			joined_at: '',
		};
		const perms = computeMemberPermissions(roles, member, guildId);
		expect(hasAdminOrManageGuild(perms)).toBe(true);
	});
});

describe('displayPlayerName', () => {
	it('prefers in-game name', () => {
		expect(displayPlayerName('Adam', 'discorduser')).toBe('Adam');
		expect(displayPlayerName(null, 'discorduser')).toBe('discorduser');
	});
});
