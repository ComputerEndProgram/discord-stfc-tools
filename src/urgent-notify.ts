import {
	createGuildTextChannel,
	getBotUserId,
	sendChannelMessageWithEmbed,
	type ChannelPermissionOverwrite,
	type DiscordEmbed,
} from './discord-api';
import { AuditColor, type AuditColorValue } from './audit-log';
import type { GuildConfig } from './types';

/** VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | ATTACH_FILES | READ_MESSAGE_HISTORY */
const STAFF_CHANNEL_ALLOW = String(0x400 | 0x800 | 0x4000 | 0x8000 | 0x10000);
const VIEW_CHANNEL_DENY = String(0x400);

export async function createUrgentNotifyChannel(
	token: string,
	guildId: string,
	config: GuildConfig,
	name = 'bot-urgent',
): Promise<string> {
	const botUserId = await getBotUserId(token);
	const overwrites: ChannelPermissionOverwrite[] = [
		{ id: guildId, type: 0, allow: '0', deny: VIEW_CHANNEL_DENY },
		{ id: botUserId, type: 1, allow: STAFF_CHANNEL_ALLOW, deny: '0' },
	];

	for (const roleId of config.personal_channel_extra_roles) {
		if (/^\d{15,20}$/.test(roleId)) {
			overwrites.push({ id: roleId, type: 0, allow: STAFF_CHANNEL_ALLOW, deny: '0' });
		}
	}

	const channel = await createGuildTextChannel(token, guildId, name, {
		topic:
			'Urgent bot alerts (DM blocked, action needed) — staff only. Quieter than the full audit log.',
		permissionOverwrites: overwrites,
	});
	return channel.id;
}

export interface UrgentNotifyOpts {
	/** Plain Badgey / staff-facing message (shown as message content). */
	content: string;
	title?: string;
	description?: string;
	actorId?: string | null;
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
	color?: AuditColorValue;
}

/**
 * High-signal staff alert. No-ops when channel unset; never throws.
 * Still pair with postAuditLog when you want the full trail.
 */
export async function postUrgentNotify(
	env: { DISCORD_BOT_TOKEN?: string },
	config: GuildConfig | null | undefined,
	opts: UrgentNotifyOpts,
): Promise<void> {
	const channelId = config?.urgent_notify_channel_id;
	const token = env.DISCORD_BOT_TOKEN;
	if (!channelId || !token) return;

	const fields = [...(opts.fields ?? [])];
	if (opts.actorId) {
		fields.unshift({ name: 'Member', value: `<@${opts.actorId}>`, inline: true });
	}

	const embed: DiscordEmbed | undefined =
		opts.title || opts.description || fields.length
			? {
					title: (opts.title ?? 'Urgent').slice(0, 256),
					description: opts.description?.slice(0, 4000),
					color: opts.color ?? AuditColor.danger,
					fields: fields.slice(0, 25).map((f) => ({
						name: f.name.slice(0, 256),
						value: f.value.slice(0, 1024),
						inline: f.inline,
					})),
					timestamp: new Date().toISOString(),
				}
			: undefined;

	try {
		await sendChannelMessageWithEmbed(token, channelId, {
			content: opts.content.slice(0, 2000),
			embeds: embed ? [embed] : undefined,
		});
	} catch (err) {
		console.error('Urgent notify post failed:', err);
	}
}
