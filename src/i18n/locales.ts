/** Supported player-facing locales (ISO 639-1). */
export const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'es', 'pt', 'nl', 'pl', 'it', 'ru', 'tr'] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: LocaleCode = 'en';

/** Native labels for language picker buttons. */
export const LOCALE_NATIVE_LABELS: Record<LocaleCode, string> = {
	en: 'English',
	de: 'Deutsch',
	fr: 'Français',
	es: 'Español',
	pt: 'Português',
	nl: 'Nederlands',
	pl: 'Polski',
	it: 'Italiano',
	ru: 'Русский',
	tr: 'Türkçe',
};

export function isLocaleCode(value: string | null | undefined): value is LocaleCode {
	return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): LocaleCode {
	return isLocaleCode(value) ? value : DEFAULT_LOCALE;
}
