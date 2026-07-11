import { t, type MessageKey, type TParams } from '../i18n';

/** HAL 9000 refusal — keep translations faithful, not Badgey-flavored. */
export function hal(locale: string | null | undefined, key: MessageKey, params?: TParams): string {
	return t(locale, key, params);
}

/** Badgey (Lower Decks) voice for helpful / procedural DM replies. */
export function badgey(locale: string | null | undefined, key: MessageKey, params?: TParams): string {
	return t(locale, key, params);
}

export function displayPlayerName(
	playerName: string | null | undefined,
	discordUsername: string,
): string {
	const trimmed = playerName?.trim();
	return trimmed || discordUsername || 'cadet';
}
