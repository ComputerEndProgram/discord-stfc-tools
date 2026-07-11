import { sendChannelMessage, sendMessageWithComponents, getGuild } from '../discord-api';
import {
	clearDmSession,
	getAnyPlayerRecordForUser,
	getDmSession,
	getGuildConfig,
	listVerifiedGuildsForUser,
	upsertDmSession,
} from '../guild-db';
import { resolveLocale } from '../i18n';
import type { DiscordMessage } from '../discord-gateway/protocol';
import { tryClassifyRosterIntentWithAi } from './ai';
import { memberCanAskDmQueries, memberIsGuildAdmin } from './admin-auth';
import { looksLikeQuestion, matchRosterIntent } from './intents';
import {
	adminMenuMessage,
	buildAdminMenuComponents,
	buildGuildPickerComponents,
	isMenuKeyword,
} from './menu';
import { answerRosterIntent } from './roster';
import { badgey, displayPlayerName, hal } from './persona';
import {
	continueSetupWizardText,
	runServerStatusWizard,
	sendAdminMenu,
	startChannelLogWizard,
	startSetupWizard,
} from './wizards';

async function resolveLocaleForUser(env: Env, userId: string, guildId?: string | null): Promise<string> {
	if (guildId) {
		const { getVerifiedPlayer } = await import('../guild-db');
		const player = await getVerifiedPlayer(env.STFC_DB, guildId, userId);
		if (player?.preferred_locale) return resolveLocale(player.preferred_locale);
	}
	const any = await getAnyPlayerRecordForUser(env.STFC_DB, userId);
	return resolveLocale(any?.preferred_locale);
}

async function playerNameFor(env: Env, userId: string, username: string, guildId?: string | null): Promise<string> {
	if (guildId) {
		const { getVerifiedPlayer } = await import('../guild-db');
		const player = await getVerifiedPlayer(env.STFC_DB, guildId, userId);
		return displayPlayerName(player?.player_name, username);
	}
	const any = await getAnyPlayerRecordForUser(env.STFC_DB, userId);
	return displayPlayerName(any?.player_name, username);
}

/**
 * Handle inbound DMs that are not part of pending verification.
 * Returns true if the message was handled.
 */
export async function handleDmAssistantMessage(
	env: Env,
	message: DiscordMessage,
): Promise<boolean> {
	const token = env.DISCORD_BOT_TOKEN;
	if (!token) return false;

	const userId = message.author.id;
	const channelId = message.channel_id;
	const content = (message.content ?? '').trim();
	const username = message.author.username;

	const session = await getDmSession(env.STFC_DB, userId);

	// Active wizard text steps
	if (session && (session.flow === 'server_setup' || session.flow === 'channels_log' || session.flow === 'channels_audit')) {
		const locale = await resolveLocaleForUser(env, userId, session.guild_id);
		const handled = await continueSetupWizardText(env, token, channelId, userId, locale, session, content);
		if (handled) return true;
	}

	const verified = await listVerifiedGuildsForUser(env.STFC_DB, userId);
	let guildId = session?.guild_id ?? null;

	// Prefer session guild; else single verified guild; else need picker / no guild
	if (!guildId) {
		if (verified.length === 1) {
			guildId = verified[0].guild_id;
		} else if (verified.length > 1 && !isMenuKeyword(content)) {
			// If asking something without guild context, ask to pick
			const locale = await resolveLocaleForUser(env, userId);
			const labels: Array<{ guildId: string; label: string }> = [];
			for (const v of verified.slice(0, 25)) {
				const g = await getGuild(token, v.guild_id);
				labels.push({
					guildId: v.guild_id,
					label: g?.name ?? v.alliance_tag ?? v.guild_id.slice(-6),
				});
			}
			await upsertDmSession(env.STFC_DB, {
				discord_user_id: userId,
				guild_id: null,
				flow: 'pick_guild',
				step: 'pick',
				payload: {},
			});
			await sendMessageWithComponents(token, channelId, {
				content: badgey(locale, 'dm.badgey.pick_guild'),
				components: buildGuildPickerComponents(labels),
			});
			return true;
		}
	}

	if (!guildId && verified.length === 0) {
		// May still be admin of a configured guild without verification — we don't enumerate those.
		const locale = await resolveLocaleForUser(env, userId);
		if (isMenuKeyword(content)) {
			await sendChannelMessage(token, channelId, badgey(locale, 'dm.badgey.no_guild'));
			return true;
		}
		await sendChannelMessage(token, channelId, badgey(locale, 'dm.badgey.no_guild'));
		return true;
	}

	if (!guildId) {
		const locale = await resolveLocaleForUser(env, userId);
		await sendChannelMessage(token, channelId, badgey(locale, 'dm.badgey.no_guild'));
		return true;
	}

	const locale = await resolveLocaleForUser(env, userId, guildId);
	const name = await playerNameFor(env, userId, username, guildId);

	if (isMenuKeyword(content)) {
		const isAdmin = await memberIsGuildAdmin(token, guildId, userId);
		if (!isAdmin) {
			await sendChannelMessage(token, channelId, badgey(locale, 'dm.badgey.menu_denied'));
			return true;
		}
		await sendAdminMenu(env, token, channelId, userId, guildId, locale);
		return true;
	}

	// Roster Q&A
	let intent = matchRosterIntent(content);
	if (!intent) {
		const config = await getGuildConfig(env.STFC_DB, guildId);
		if (config) {
			intent = await tryClassifyRosterIntentWithAi(env, config, content);
		}
	}

	if (intent) {
		const config = await getGuildConfig(env.STFC_DB, guildId);
		if (!config) {
			await sendChannelMessage(token, channelId, badgey(locale, 'dm.wizard.not_configured'));
			return true;
		}
		const allowed = await memberCanAskDmQueries(token, guildId, userId, config);
		if (!allowed) {
			await sendChannelMessage(token, channelId, badgey(locale, 'dm.roster.denied'));
			return true;
		}
		const answer = await answerRosterIntent(env.STFC_DB, guildId, locale, intent);
		await sendChannelMessage(token, channelId, answer);
		return true;
	}

	// HAL for known users with unrecognized requests
	const isAdmin = await memberIsGuildAdmin(token, guildId, userId);
	const hint = isAdmin ? `\n\n${badgey(locale, 'dm.badgey.hal_admin_hint')}` : '';
	if (looksLikeQuestion(content) || content.length > 0) {
		await sendChannelMessage(
			token,
			channelId,
			hal(locale, 'dm.hal.cant_do_that', { player_name: name }) + hint,
		);
		return true;
	}

	return false;
}

export async function handleDmAssistantComponent(
	env: Env,
	interaction: {
		data?: { custom_id?: string };
		user?: { id: string; username?: string };
		member?: { user?: { id: string; username?: string } };
		channel_id?: string;
		message?: { channel_id?: string };
	},
): Promise<Response> {
	const { interactionResponse, updateMessageResponse } = await import('../discord-api');
	const customId = interaction.data?.custom_id ?? '';
	if (!customId.startsWith('dma:')) {
		return interactionResponse('❌ Unknown button.', true);
	}

	const token = env.DISCORD_BOT_TOKEN;
	if (!token) return interactionResponse('❌ Bot token missing.', true);

	const userId = interaction.user?.id ?? interaction.member?.user?.id;
	if (!userId) return interactionResponse('❌ No user.', true);

	const channelId =
		interaction.channel_id ?? interaction.message?.channel_id ?? '';
	if (!channelId) return interactionResponse('❌ No channel.', true);

	const parts = customId.split(':');
	// dma:cancel | dma:guild:ID | dma:menu:ACTION | dma:setup:ACTION:VALUE | dma:log:ACTION | dma:audit:ACTION

	const locale = await resolveLocaleForUser(env, userId);

	if (parts[1] === 'cancel') {
		await clearDmSession(env.STFC_DB, userId);
		return updateMessageResponse(badgey(locale, 'dm.badgey.cancelled'), { components: [] });
	}

	if (parts[1] === 'guild' && parts[2]) {
		const guildId = parts[2];
		const g = await getGuild(token, guildId);
		await upsertDmSession(env.STFC_DB, {
			discord_user_id: userId,
			guild_id: guildId,
			flow: 'admin_menu',
			step: 'menu',
			payload: {},
		});
		const loc = await resolveLocaleForUser(env, userId, guildId);
		await sendMessageWithComponents(token, channelId, {
			content: `${badgey(loc, 'dm.badgey.guild_selected', { guild: g?.name ?? guildId })}\n\n${adminMenuMessage(loc)}`,
			components: buildAdminMenuComponents(loc),
		});
		return updateMessageResponse(badgey(loc, 'dm.badgey.guild_selected', { guild: g?.name ?? guildId }), {
			components: [],
		});
	}

	const session = await getDmSession(env.STFC_DB, userId);
	let guildId = session?.guild_id;
	if (!guildId) {
		const verified = await listVerifiedGuildsForUser(env.STFC_DB, userId);
		if (verified.length === 1) guildId = verified[0].guild_id;
	}
	if (!guildId) {
		return updateMessageResponse(badgey(locale, 'dm.badgey.no_guild'), { components: [] });
	}

	const loc = await resolveLocaleForUser(env, userId, guildId);
	const isAdmin = await memberIsGuildAdmin(token, guildId, userId);
	if (!isAdmin) {
		return updateMessageResponse(badgey(loc, 'dm.badgey.menu_denied'), { components: [] });
	}

	if (parts[1] === 'menu') {
		const action = parts[2];
		if (action === 'back' || action === 'status' || action === 'setup' || action === 'log' || action === 'audit') {
			if (action === 'back') {
				await sendAdminMenu(env, token, channelId, userId, guildId, loc);
				return updateMessageResponse(adminMenuMessage(loc), { components: [] });
			}
			if (action === 'status') {
				await runServerStatusWizard(env, token, channelId, guildId, loc);
				await sendAdminMenu(env, token, channelId, userId, guildId, loc);
				return updateMessageResponse(badgey(loc, 'dm.wizard.status_intro'), { components: [] });
			}
			if (action === 'setup') {
				await startSetupWizard(env, token, channelId, userId, guildId, loc);
				return updateMessageResponse(badgey(loc, 'dm.wizard.setup.ask_mode'), { components: [] });
			}
			if (action === 'log') {
				await startChannelLogWizard(env, token, channelId, userId, guildId, loc, 'log');
				return updateMessageResponse(badgey(loc, 'dm.wizard.channel.log_intro', { current: '…' }), {
					components: [],
				});
			}
			if (action === 'audit') {
				await startChannelLogWizard(env, token, channelId, userId, guildId, loc, 'audit');
				return updateMessageResponse(badgey(loc, 'dm.wizard.channel.audit_intro', { current: '…' }), {
					components: [],
				});
			}
		}
	}

	if (parts[1] === 'setup') {
		const action = parts[2];
		const value = parts[3];
		const payload = session?.payload ?? {};
		const { handleSetupButton } = await import('./wizards');
		await handleSetupButton(env, token, channelId, userId, loc, guildId, action, value, payload);
		return updateMessageResponse('✅', { components: [] });
	}

	if (parts[1] === 'log' || parts[1] === 'audit') {
		const kind = parts[1] as 'log' | 'audit';
		const action = parts[2];
		const { handleChannelLogButton } = await import('./wizards');
		await handleChannelLogButton(env, token, channelId, userId, loc, guildId, kind, action);
		return updateMessageResponse('✅', { components: [] });
	}

	return updateMessageResponse('❌ Unknown DM assistant button.', { components: [] });
}
