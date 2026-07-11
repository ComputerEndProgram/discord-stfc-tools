import type { DiscordActionRow } from '../discord-api';
import { t } from '../i18n';
import { badgey } from './persona';

export const MENU_KEYWORDS = new Set(['help', 'menu', 'admin', 'badgey', 'commands']);

export function isMenuKeyword(content: string): boolean {
	const normalized = content.trim().toLowerCase().replace(/[!?.,]+$/g, '');
	return MENU_KEYWORDS.has(normalized);
}

export function buildAdminMenuComponents(locale: string): DiscordActionRow[] {
	return [
		{
			type: 1,
			components: [
				{
					type: 2,
					style: 1,
					label: t(locale, 'dm.wizard.btn.status'),
					custom_id: 'dma:menu:status',
				},
				{
					type: 2,
					style: 1,
					label: t(locale, 'dm.wizard.btn.setup'),
					custom_id: 'dma:menu:setup',
				},
				{
					type: 2,
					style: 1,
					label: t(locale, 'dm.wizard.btn.log'),
					custom_id: 'dma:menu:log',
				},
				{
					type: 2,
					style: 1,
					label: t(locale, 'dm.wizard.btn.audit'),
					custom_id: 'dma:menu:audit',
				},
			],
		},
		{
			type: 1,
			components: [
				{
					type: 2,
					style: 4,
					label: t(locale, 'dm.wizard.btn.cancel'),
					custom_id: 'dma:cancel',
				},
			],
		},
	];
}

export function adminMenuMessage(locale: string): string {
	return badgey(locale, 'dm.badgey.menu_intro');
}

export function buildGuildPickerComponents(
	guilds: Array<{ guildId: string; label: string }>,
): DiscordActionRow[] {
	const buttons = guilds.slice(0, 25).map((g, i) => ({
		type: 2 as const,
		style: 2,
		label: g.label.slice(0, 80) || g.guildId,
		custom_id: `dma:guild:${g.guildId}`,
	}));

	const rows: DiscordActionRow[] = [];
	for (let i = 0; i < buttons.length; i += 5) {
		rows.push({ type: 1, components: buttons.slice(i, i + 5) });
	}
	return rows;
}

export function buildChannelLogMenuComponents(
	locale: string,
	kind: 'log' | 'audit',
): DiscordActionRow[] {
	const prefix = kind === 'log' ? 'dma:log' : 'dma:audit';
	return [
		{
			type: 1,
			components: [
				{ type: 2, style: 3, label: t(locale, 'dm.wizard.btn.create'), custom_id: `${prefix}:create` },
				{ type: 2, style: 1, label: t(locale, 'dm.wizard.btn.link'), custom_id: `${prefix}:link` },
				{ type: 2, style: 4, label: t(locale, 'dm.wizard.btn.clear'), custom_id: `${prefix}:clear` },
			],
		},
		{
			type: 1,
			components: [
				{ type: 2, style: 2, label: t(locale, 'dm.wizard.btn.back'), custom_id: 'dma:menu:back' },
				{ type: 2, style: 4, label: t(locale, 'dm.wizard.btn.cancel'), custom_id: 'dma:cancel' },
			],
		},
	];
}

export function buildSetupModeComponents(locale: string): DiscordActionRow[] {
	return [
		{
			type: 1,
			components: [
				{
					type: 2,
					style: 1,
					label: t(locale, 'dm.wizard.setup.mode_single'),
					custom_id: 'dma:setup:mode:single_alliance',
				},
				{
					type: 2,
					style: 1,
					label: t(locale, 'dm.wizard.setup.mode_multi'),
					custom_id: 'dma:setup:mode:multi_alliance',
				},
			],
		},
		{
			type: 1,
			components: [
				{ type: 2, style: 4, label: t(locale, 'dm.wizard.btn.cancel'), custom_id: 'dma:cancel' },
			],
		},
	];
}

export function buildSetupRegionComponents(locale: string): DiscordActionRow[] {
	return [
		{
			type: 1,
			components: [
				{ type: 2, style: 1, label: 'US', custom_id: 'dma:setup:region:US' },
				{ type: 2, style: 1, label: 'EU', custom_id: 'dma:setup:region:EU' },
			],
		},
		{
			type: 1,
			components: [
				{ type: 2, style: 4, label: t(locale, 'dm.wizard.btn.cancel'), custom_id: 'dma:cancel' },
			],
		},
	];
}

export function buildSetupConfirmComponents(locale: string): DiscordActionRow[] {
	return [
		{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					label: t(locale, 'dm.wizard.btn.confirm'),
					custom_id: 'dma:setup:confirm',
				},
				{ type: 2, style: 4, label: t(locale, 'dm.wizard.btn.cancel'), custom_id: 'dma:cancel' },
			],
		},
	];
}

export function buildCancelRow(locale: string): DiscordActionRow[] {
	return [
		{
			type: 1,
			components: [
				{ type: 2, style: 4, label: t(locale, 'dm.wizard.btn.cancel'), custom_id: 'dma:cancel' },
			],
		},
	];
}
