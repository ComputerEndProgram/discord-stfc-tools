/**
 * Admin preview DMs — send real-looking verification/follow-up messages without
 * mutating verification / agreement / welcome_dm_sent_at state.
 */
import {
	openUserDmChannel,
	sendDirectMessage,
	sendMessageWithComponents,
	updateMessageResponse,
} from './discord-api';
import { agreementDmContent } from './agreement';
import { dataConsentDmContent, buildDataConsentComponents } from './data-consent';
import { getVerifiedPlayer } from './guild-db';
import { resolveLocale, t } from './i18n';
import {
	buildLanguagePickerComponents,
	languagePickerPrompt,
} from './i18n/language-picker';
import { previewWelcomeDm, welcomeDmConfigured } from './welcome-dm';
import { sendGuestDemotionDm, type DemoteReason } from './verification-access';
import type { GuildConfig } from './types';

export type TestDmKind =
	| 'invite'
	| 'consent'
	| 'agreement'
	| 'welcome'
	| 'demote_mismatch'
	| 'demote_missing'
	| 'all';

export const TEST_DM_KINDS: TestDmKind[] = [
	'invite',
	'consent',
	'agreement',
	'welcome',
	'demote_mismatch',
	'demote_missing',
	'all',
];

const PREVIEW_PREFIX = '*[Admin preview — verification status is not changed by sending this.]*\n\n';

export const AGREE_PREVIEW_CUSTOM_ID_PREFIX = 'agree:preview:';
export const VERIFY_RESTART_PREVIEW_CUSTOM_ID_PREFIX = 'verify:restart-preview:';

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

export function isTestDmKind(value: string): value is TestDmKind {
	return (TEST_DM_KINDS as string[]).includes(value);
}

export async function sendInvitePreviewDm(
	token: string,
	guildId: string,
	userId: string,
	preferredLocale: string | null | undefined,
): Promise<string> {
	const locale = resolveLocale(preferredLocale);
	if (!preferredLocale) {
		const channelId = await openUserDmChannel(token, userId);
		await sendMessageWithComponents(token, channelId, {
			content: PREVIEW_PREFIX + languagePickerPrompt(),
			components: buildLanguagePickerComponents(guildId),
		});
		return 'invite (language picker)';
	}
	await sendDirectMessage(token, userId, PREVIEW_PREFIX + t(locale, 'verify.invite.welcome'));
	return 'invite (welcome text)';
}

export async function sendConsentPreviewDm(
	token: string,
	userId: string,
	config: GuildConfig,
	locale: string,
): Promise<string> {
	if (!config.data_consent_enabled) {
		throw new Error('Data consent is disabled — enable with `/server consent enabled:true`.');
	}
	const channelId = await openUserDmChannel(token, userId);
	await sendMessageWithComponents(token, channelId, {
		content:
			PREVIEW_PREFIX +
			dataConsentDmContent(config, locale) +
			'\n\n_Preview: buttons below do not record consent._',
		components: buildDataConsentComponents(config.guild_id, locale).map((row) => ({
			...row,
			components: row.components.map((btn) => ({
				...btn,
				custom_id: btn.custom_id.replace('consent:', 'consent-preview:'),
			})),
		})),
	});
	return 'consent';
}

export async function sendAgreementPreviewDm(
	token: string,
	userId: string,
	config: GuildConfig,
	locale: string,
): Promise<string> {
	if (!config.agreement_enabled) {
		throw new Error('Agreement is disabled — enable with `/server agreement enabled:true`.');
	}
	const channelId = await openUserDmChannel(token, userId);
	await sendMessageWithComponents(token, channelId, {
		content:
			PREVIEW_PREFIX +
			agreementDmContent(config, locale) +
			'\n\n_Preview: the button below does not record acceptance._',
		components: [
			{
				type: 1,
				components: [
					{
						type: 2,
						style: 3,
						label: t(locale, 'agree.btn.accept').slice(0, 80),
						custom_id: `${AGREE_PREVIEW_CUSTOM_ID_PREFIX}${config.guild_id}`,
					},
				],
			},
		],
	});
	return 'agreement';
}

export async function sendWelcomePreviewDm(
	token: string,
	config: GuildConfig,
	userId: string,
	locale: string,
	personalChannelId: string | null | undefined,
): Promise<string> {
	if (!welcomeDmConfigured(config)) {
		throw new Error(
			'Welcome DM is not configured — set `/server welcome enabled:true message_link:…`.',
		);
	}
	const preview = await previewWelcomeDm(token, config, locale, personalChannelId);
	if (!preview.ok) throw new Error(preview.error);
	const channelId = await openUserDmChannel(token, userId);
	await sendMessageWithComponents(token, channelId, {
		content: PREVIEW_PREFIX + (preview.content || '_(embeds only)_'),
		embeds: preview.embeds,
	});
	return 'welcome';
}

export async function sendDemotePreviewDm(
	token: string,
	config: GuildConfig,
	userId: string,
	preferredLocale: string | null | undefined,
	reason: Extract<DemoteReason, 'alliance_mismatch' | 'player_missing'>,
): Promise<string> {
	await sendGuestDemotionDm(
		token,
		config,
		userId,
		{ preferred_locale: preferredLocale ?? null },
		reason,
		{ preview: true },
	);
	return reason === 'player_missing' ? 'demote (missing)' : 'demote (mismatch)';
}

export async function sendTestDms(
	env: Env,
	config: GuildConfig,
	userId: string,
	kind: TestDmKind,
): Promise<{ sent: string[]; skipped: string[] }> {
	const token = env.DISCORD_BOT_TOKEN;
	if (!token) throw new Error('DISCORD_BOT_TOKEN not configured');

	const player = await getVerifiedPlayer(env.STFC_DB, config.guild_id, userId);
	const locale = resolveLocale(player?.preferred_locale);
	const sent: string[] = [];
	const skipped: string[] = [];

	const run = async (label: string, fn: () => Promise<string>): Promise<void> => {
		try {
			sent.push(await fn());
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			skipped.push(`${label}: ${msg}`);
		}
	};

	const kinds: Exclude<TestDmKind, 'all'>[] =
		kind === 'all'
			? ['invite', 'consent', 'agreement', 'welcome', 'demote_mismatch']
			: [kind];

	for (const k of kinds) {
		if (k === 'invite') {
			await run('invite', () =>
				sendInvitePreviewDm(token, config.guild_id, userId, player?.preferred_locale),
			);
		} else if (k === 'consent') {
			await run('consent', () => sendConsentPreviewDm(token, userId, config, locale));
		} else if (k === 'agreement') {
			await run('agreement', () => sendAgreementPreviewDm(token, userId, config, locale));
		} else if (k === 'welcome') {
			await run('welcome', () =>
				sendWelcomePreviewDm(token, config, userId, locale, player?.personal_channel_id),
			);
		} else if (k === 'demote_mismatch') {
			await run('demote_mismatch', () =>
				sendDemotePreviewDm(token, config, userId, player?.preferred_locale, 'alliance_mismatch'),
			);
		} else if (k === 'demote_missing') {
			await run('demote_missing', () =>
				sendDemotePreviewDm(token, config, userId, player?.preferred_locale, 'player_missing'),
			);
		}
		if (kind === 'all') await sleep(600);
	}

	return { sent, skipped };
}

export async function handleAgreePreviewComponent(
	env: Env,
	interaction: {
		member?: { user?: { id: string } };
		user?: { id: string };
		data?: { custom_id?: string };
	},
): Promise<Response> {
	const userId = interaction.member?.user?.id ?? interaction.user?.id;
	const guildId = (interaction.data?.custom_id ?? '').slice(AGREE_PREVIEW_CUSTOM_ID_PREFIX.length);
	const player =
		userId && /^\d{15,20}$/.test(guildId)
			? await getVerifiedPlayer(env.STFC_DB, guildId, userId)
			: null;
	const locale = resolveLocale(player?.preferred_locale);
	return updateMessageResponse(
		`✅ Preview only — agreement was **not** recorded. Status unchanged.\n_(${t(locale, 'agree.btn.accept')})_`,
		{ components: [] },
	);
}

export async function handleVerifyRestartPreviewComponent(
	env: Env,
	interaction: {
		member?: { user?: { id: string } };
		user?: { id: string };
		data?: { custom_id?: string };
	},
): Promise<Response> {
	const userId = interaction.member?.user?.id ?? interaction.user?.id;
	const guildId = (interaction.data?.custom_id ?? '').slice(
		VERIFY_RESTART_PREVIEW_CUSTOM_ID_PREFIX.length,
	);
	const player =
		userId && /^\d{15,20}$/.test(guildId)
			? await getVerifiedPlayer(env.STFC_DB, guildId, userId)
			: null;
	const locale = resolveLocale(player?.preferred_locale);
	return updateMessageResponse(
		`✅ Preview only — verification was **not** restarted. Status unchanged.\n\n` +
			`_(Real restart would look like: ${t(locale, 'verify.demote.btn.restart')})_`,
		{ components: [] },
	);
}
