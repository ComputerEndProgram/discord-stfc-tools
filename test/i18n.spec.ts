import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES, t, resolveLocale, isLocaleCode } from '../src/i18n';
import { en, type MessageKey } from '../src/i18n/en';
import { parseLocaleCustomId, localeCustomId } from '../src/i18n/language-picker';

describe('i18n', () => {
	it('resolves unknown locale to en', () => {
		expect(resolveLocale(null)).toBe('en');
		expect(resolveLocale('xx')).toBe('en');
		expect(isLocaleCode('de')).toBe(true);
	});

	it('interpolates placeholders', () => {
		expect(t('en', 'verify.note.nick', { nick: 'Adam' })).toContain('Adam');
		expect(t('de', 'locale.picker.confirm', { label: 'Deutsch' })).toContain('Deutsch');
	});

	it('every supported locale has all English keys', async () => {
		const keys = Object.keys(en) as MessageKey[];
		for (const code of SUPPORTED_LOCALES) {
			const mod = await import(`../src/i18n/${code}`);
			const catalog = mod[code] as Record<string, string>;
			for (const key of keys) {
				expect(catalog[key], `${code}.${key}`).toBeTypeOf('string');
				expect(catalog[key].length).toBeGreaterThan(0);
			}
		}
	});

	it('parses locale custom ids', () => {
		const id = localeCustomId('123456789012345678', 'fr');
		expect(parseLocaleCustomId(id)).toEqual({ guildId: '123456789012345678', locale: 'fr' });
		expect(parseLocaleCustomId('nope')).toBeNull();
	});
});
