import { en, type MessageCatalog, type MessageKey } from './en';
import { de } from './de';
import { fr } from './fr';
import { es } from './es';
import { pt } from './pt';
import { nl } from './nl';
import { pl } from './pl';
import { it } from './it';
import { ru } from './ru';
import { tr } from './tr';
import {
	DEFAULT_LOCALE,
	LOCALE_NATIVE_LABELS,
	SUPPORTED_LOCALES,
	isLocaleCode,
	resolveLocale,
	type LocaleCode,
} from './locales';

export {
	DEFAULT_LOCALE,
	LOCALE_NATIVE_LABELS,
	SUPPORTED_LOCALES,
	isLocaleCode,
	resolveLocale,
	type LocaleCode,
	type MessageKey,
};

const CATALOGS: Record<LocaleCode, MessageCatalog> = {
	en,
	de,
	fr,
	es,
	pt,
	nl,
	pl,
	it,
	ru,
	tr,
};

export type TParams = Record<string, string | number | undefined | null>;

/** Replace `{name}` placeholders; missing values become empty string. */
export function t(locale: string | null | undefined, key: MessageKey, params?: TParams): string {
	const code = resolveLocale(locale);
	const catalog = CATALOGS[code] ?? en;
	let text: string = catalog[key] ?? en[key] ?? key;
	if (params) {
		for (const [name, value] of Object.entries(params)) {
			text = text.replaceAll(`{${name}}`, value == null ? '' : String(value));
		}
	}
	return text;
}
