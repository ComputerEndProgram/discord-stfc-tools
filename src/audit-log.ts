import {
	createGuildTextChannel,
	getBotUserId,
	sendChannelMessageWithEmbed,
	type ChannelPermissionOverwrite,
	type DiscordEmbed,
} from './discord-api';
import type { GuildConfig } from './types';

/** VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | ATTACH_FILES | READ_MESSAGE_HISTORY */
const STAFF_CHANNEL_ALLOW = String(0x400 | 0x800 | 0x4000 | 0x8000 | 0x10000);
const VIEW_CHANNEL_DENY = String(0x400);

export const AuditColor = {
	info: 0x5865f2, // blurple
	success: 0x57f287, // green
	warn: 0xfee75c, // yellow
	danger: 0xed4245, // red
	neutral: 0x99aab5, // grey
} as const;

export type AuditColorValue = (typeof AuditColor)[keyof typeof AuditColor];

export interface AuditLogOpts {
	title: string;
	description?: string;
	/** Discord user who triggered the action (admin or member). */
	actorId?: string | null;
	/** automated | admin | member | cron */
	source?: 'automated' | 'admin' | 'member' | 'cron' | 'system' | 'web';
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
	color?: AuditColorValue;
}

export async function createAuditLogChannel(
	token: string,
	guildId: string,
	config: GuildConfig,
	name = 'bot-audit-log',
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
		topic: 'Bot audit log — admin commands and automated actions (staff only). Separate from verification archive.',
		permissionOverwrites: overwrites,
	});
	return channel.id;
}

/**
 * Post an audit event. No-ops when unset; never throws (logs errors only).
 */
export async function postAuditLog(
	env: { DISCORD_BOT_TOKEN?: string },
	config: GuildConfig | null | undefined,
	opts: AuditLogOpts,
): Promise<void> {
	const channelId = config?.audit_log_channel_id;
	const token = env.DISCORD_BOT_TOKEN;
	if (!channelId || !token) return;

	const source = opts.source ?? 'system';
	const fields = [...(opts.fields ?? [])];
	if (opts.actorId) {
		fields.unshift({ name: 'Actor', value: `<@${opts.actorId}>`, inline: true });
	}
	fields.push({ name: 'Source', value: source, inline: true });

	const embed: DiscordEmbed = {
		title: opts.title.slice(0, 256),
		description: opts.description?.slice(0, 4000),
		color: opts.color ?? AuditColor.info,
		fields: fields.slice(0, 25).map((f) => ({
			name: f.name.slice(0, 256),
			value: f.value.slice(0, 1024),
			inline: f.inline,
		})),
		timestamp: new Date().toISOString(),
	};

	try {
		await sendChannelMessageWithEmbed(token, channelId, { embeds: [embed] });
	} catch (err) {
		console.error('Audit log post failed:', err);
	}
}
