import { describe, expect, it } from 'vitest';
import {
	capturePersonalChannelPermTemplate,
	DEFAULT_PERSONAL_CHANNEL_BOT_ALLOW,
	DEFAULT_PERSONAL_CHANNEL_MEMBER_ALLOW,
	defaultPersonalChannelPermTemplate,
	effectivePersonalChannelPermTemplate,
	parsePersonalChannelPermTemplate,
	withExtraRolesOnPersonalChannelPermTemplate,
} from '../src/personal-channel-perm-template';

describe('personal-channel-perm-template', () => {
	const guildId = '111111111111111111';
	const botId = '222222222222222222';
	const memberId = '333333333333333333';
	const officerRole = '444444444444444444';
	const diplomatRole = '555555555555555555';

	it('default member allow includes embed and attach; bot also has manage + administrator', () => {
		const t = defaultPersonalChannelPermTemplate();
		expect(t.member.allow).toBe(DEFAULT_PERSONAL_CHANNEL_MEMBER_ALLOW);
		expect(t.bot.allow).toBe(DEFAULT_PERSONAL_CHANNEL_BOT_ALLOW);
		expect(Number(t.member.allow)).toBe(0x400 | 0x800 | 0x4000 | 0x8000 | 0x10000);
		expect(Number(t.bot.allow)).toBe(
			0x400 | 0x800 | 0x4000 | 0x8000 | 0x10000 | 0x8 | 0x10 | 0x10000000,
		);
	});

	it('withExtraRolesOnPersonalChannelPermTemplate fills default without a sample lock', () => {
		const t = withExtraRolesOnPersonalChannelPermTemplate([officerRole, diplomatRole, officerRole]);
		expect(t.source_channel_id).toBeNull();
		expect(t.roles).toEqual([
			{ role_id: officerRole, allow: DEFAULT_PERSONAL_CHANNEL_MEMBER_ALLOW, deny: '0' },
			{ role_id: diplomatRole, allow: DEFAULT_PERSONAL_CHANNEL_MEMBER_ALLOW, deny: '0' },
		]);
	});

	it('effectivePersonalChannelPermTemplate uses extra-roles on built-in default', () => {
		const t = effectivePersonalChannelPermTemplate({
			personal_channel_perm_template: null,
			personal_channel_extra_roles: [officerRole],
		});
		expect(t.roles).toEqual([
			{ role_id: officerRole, allow: DEFAULT_PERSONAL_CHANNEL_MEMBER_ALLOW, deny: '0' },
		]);
	});

	it('effectivePersonalChannelPermTemplate keeps locked roles when present', () => {
		const locked = defaultPersonalChannelPermTemplate();
		locked.source_channel_id = '999999999999999999';
		locked.roles = [{ role_id: diplomatRole, allow: '3072', deny: '0' }];
		const t = effectivePersonalChannelPermTemplate({
			personal_channel_perm_template: locked,
			personal_channel_extra_roles: [officerRole],
		});
		expect(t.roles).toEqual([{ role_id: diplomatRole, allow: '3072', deny: '0' }]);
	});

	it('captures slots from overwrites and keeps bot role out of staff roles', () => {
		const template = capturePersonalChannelPermTemplate({
			guildId,
			botUserId: botId,
			memberUserId: memberId,
			channelId: '999999999999999999',
			overwrites: [
				{ id: guildId, type: 0, allow: '0', deny: '1024' },
				{ id: botId, type: 1, allow: '59392', deny: '0' },
				{ id: botId, type: 0, allow: '59392', deny: '0' },
				{ id: memberId, type: 1, allow: '3072', deny: '0' },
				{ id: officerRole, type: 0, allow: '3072', deny: '0' },
			],
			capturedBy: '555555555555555555',
		});
		expect(template.everyone.deny).toBe('1024');
		expect(template.bot.allow).toBe('59392');
		expect(template.member.allow).toBe('3072');
		expect(template.roles).toEqual([{ role_id: officerRole, allow: '3072', deny: '0' }]);
		expect(template.source_channel_id).toBe('999999999999999999');
	});

	it('round-trips JSON', () => {
		const t = defaultPersonalChannelPermTemplate();
		t.roles = [{ role_id: officerRole, allow: '3072', deny: '0' }];
		const parsed = parsePersonalChannelPermTemplate(JSON.stringify(t));
		expect(parsed?.roles[0]?.role_id).toBe(officerRole);
	});
});
