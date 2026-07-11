import { sendChannelMessage, sendMessageWithComponents } from '../discord-api';
import { getGuildConfig, getPendingVerificationsForUser, getVerifiedPlayer, upsertVerifiedPlayer } from '../guild-db';
import { processVerification } from '../verification';
import { resolveLocale, t } from '../i18n';
import {
	buildLanguagePickerComponents,
	languagePickerPrompt,
	sendLanguagePickerDm,
} from '../i18n/language-picker';
import { handleDmAssistantMessage } from '../dm-assistant';
import { extractStfcProUrls, pickImageAttachmentUrl } from './dm-handler';
import type { DiscordMessage } from './protocol';
import type { VerificationStatus } from '../types';

export async function handleDirectMessage(env: Env, message: DiscordMessage): Promise<void> {
	if (message.author.bot) return;

	const userId = message.author.id;
	const token = env.DISCORD_BOT_TOKEN;
	if (!token) {
		console.warn('DISCORD_BOT_TOKEN missing — cannot handle DM');
		return;
	}

	const pending = await getPendingVerificationsForUser(env.STFC_DB, userId);
	if (pending.length === 0) {
		await handleDmAssistantMessage(env, message);
		return;
	}

	if (pending.length > 1) {
		const player = await getVerifiedPlayer(env.STFC_DB, pending[0].guild_id, userId);
		const locale = resolveLocale(player?.preferred_locale);
		await sendChannelMessage(token, message.channel_id, t(locale, 'verify.dm.multi_guild'));
		return;
	}

	const record = pending[0];
	const config = await getGuildConfig(env.STFC_DB, record.guild_id);
	if (!config) return;

	const locale = resolveLocale(record.preferred_locale);
	if (!record.preferred_locale) {
		await sendMessageWithComponents(token, message.channel_id, {
			content: languagePickerPrompt(),
			components: buildLanguagePickerComponents(record.guild_id),
		});
		return;
	}

	const status = record.verification_status as VerificationStatus;
	const imageUrl = pickImageAttachmentUrl(message.attachments);
	const stfcUrls = extractStfcProUrls(message.content);

	if (status === 'pending_invite' || status === 'pending_screenshot') {
		if (imageUrl) {
			await upsertVerifiedPlayer(env.STFC_DB, {
				guild_id: record.guild_id,
				discord_user_id: userId,
				verification_status: 'pending_link',
			});

			if (stfcUrls.length > 0) {
				const result = await processVerification(env, record.guild_id, userId, stfcUrls[0], imageUrl);
				await sendChannelMessage(token, message.channel_id, result);
				return;
			}

			await sendChannelMessage(token, message.channel_id, t(locale, 'verify.dm.screenshot_received'));
			return;
		}

		if (stfcUrls.length > 0) {
			const result = await processVerification(env, record.guild_id, userId, stfcUrls[0]);
			await sendChannelMessage(token, message.channel_id, result);
			return;
		}

		await sendChannelMessage(token, message.channel_id, t(locale, 'verify.dm.need_screenshot'));
		return;
	}

	if (status === 'pending_link') {
		if (stfcUrls.length > 0) {
			const screenshotUrl = imageUrl;
			const result = await processVerification(env, record.guild_id, userId, stfcUrls[0], screenshotUrl);
			await sendChannelMessage(token, message.channel_id, result);
			return;
		}

		await sendChannelMessage(token, message.channel_id, t(locale, 'verify.dm.need_link'));
	}
}

/** Re-send language picker to a user who still has no locale (optional helper). */
export async function promptLocaleIfMissing(
	env: Env,
	guildId: string,
	userId: string,
): Promise<void> {
	const player = await getVerifiedPlayer(env.STFC_DB, guildId, userId);
	if (player?.preferred_locale || !env.DISCORD_BOT_TOKEN) return;
	await sendLanguagePickerDm(env.DISCORD_BOT_TOKEN, userId, guildId);
}
