/**
 * Pure helpers for welcome DM attempt gating (unit-tested).
 */

/** Initial send + one automatic retry, then stop unless admin forces. */
export const WELCOME_DM_MAX_AUTO_ATTEMPTS = 2;

export type WelcomeDmGate =
	| { allow: true }
	| { allow: false; reason: 'skip' | 'already_sent' | 'max_attempts' };

export function gateWelcomeDmAttempt(opts: {
	sentAt: string | null | undefined;
	attempts: number;
	force?: boolean;
	skip?: boolean;
	maxAttempts?: number;
}): WelcomeDmGate {
	if (opts.skip) return { allow: false, reason: 'skip' };
	if (opts.sentAt && !opts.force) return { allow: false, reason: 'already_sent' };
	// Force bypasses attempt cap but still won't re-send if already stamped success
	// unless force is used after clearing sent_at — if sentAt set, only skip when !force above.
	if (opts.sentAt && opts.force) return { allow: false, reason: 'already_sent' };
	const max = opts.maxAttempts ?? WELCOME_DM_MAX_AUTO_ATTEMPTS;
	const attempts = Math.max(0, Math.floor(Number(opts.attempts) || 0));
	if (!opts.force && attempts >= max) return { allow: false, reason: 'max_attempts' };
	return { allow: true };
}
