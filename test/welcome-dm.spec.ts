import { describe, expect, it } from 'vitest';
import {
	buildWelcomeDmContent,
	parseDiscordMessageLink,
	welcomeDmConfigured,
} from '../src/welcome-dm';
import type { GuildConfig } from '../src/types';

describe('parseDiscordMessageLink', () => {
	it('parses discord.com message links', () => {
		expect(
			parseDiscordMessageLink(
				'https://discord.com/channels/111111111111111111/222222222222222222/333333333333333333',
			),
		).toEqual({
			guildId: '111111111111111111',
			channelId: '222222222222222222',
			messageId: '333333333333333333',
		});
	});

	it('accepts discordapp.com and ptb/canary hosts', () => {
		expect(
			parseDiscordMessageLink(
				'https://ptb.discord.com/channels/111111111111111111/222222222222222222/333333333333333333/',
			)?.messageId,
		).toBe('333333333333333333');
		expect(
			parseDiscordMessageLink(
				'https://discordapp.com/channels/111111111111111111/222222222222222222/333333333333333333',
			)?.guildId,
		).toBe('111111111111111111');
	});

	it('rejects non-message URLs', () => {
		expect(parseDiscordMessageLink('https://discord.com/channels/1/2')).toBeNull();
		expect(parseDiscordMessageLink('not a url')).toBeNull();
		expect(parseDiscordMessageLink('https://example.com/channels/1/2/3')).toBeNull();
	});
});

describe('buildWelcomeDmContent', () => {
	it('appends personal channel line and substitutes placeholder', () => {
		const content = buildWelcomeDmContent({
			content: 'Welcome! Check {personal_channel} and #rules.',
			personalChannelId: '444444444444444444',
			locale: 'en',
		});
		expect(content).toContain('<#444444444444444444>');
		expect(content).toContain('Your personal member channel: <#444444444444444444>');
		expect(content).not.toContain('{personal_channel}');
	});

	it('works with empty body when personal channel exists', () => {
		const content = buildWelcomeDmContent({
			content: '',
			personalChannelId: '444444444444444444',
			locale: 'en',
		});
		expect(content).toBe('Your personal member channel: <#444444444444444444>');
	});

	it('strips placeholder when no personal channel', () => {
		const content = buildWelcomeDmContent({
			content: 'Hello {personal_channel}',
			personalChannelId: null,
			locale: 'en',
		});
		expect(content).toBe('Hello');
		expect(content).not.toContain('{personal_channel}');
	});
});

describe('welcomeDmConfigured', () => {
	it('requires enabled + valid channel and message ids', () => {
		const base = {
			welcome_dm_enabled: true,
			welcome_dm_channel_id: '222222222222222222',
			welcome_dm_message_id: '333333333333333333',
		} as Pick<GuildConfig, 'welcome_dm_enabled' | 'welcome_dm_channel_id' | 'welcome_dm_message_id'>;
		expect(welcomeDmConfigured(base)).toBe(true);
		expect(welcomeDmConfigured({ ...base, welcome_dm_enabled: false })).toBe(false);
		expect(welcomeDmConfigured({ ...base, welcome_dm_message_id: null })).toBe(false);
		expect(welcomeDmConfigured({ ...base, welcome_dm_channel_id: 'bad' })).toBe(false);
	});
});
