import {
	createGuildTextChannel,
	getBotUserId,
	sendChannelMessageWithEmbed,
	type ChannelPermissionOverwrite,
} from './discord-api';
import type { GuildConfig, PlayerData } from './types';

/** VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | ATTACH_FILES | READ_MESSAGE_HISTORY */
const STAFF_CHANNEL_ALLOW = String(0x400 | 0x800 | 0x4000 | 0x8000 | 0x10000);
const VIEW_CHANNEL_DENY = String(0x400);

const COLOR_ACTIVE = 0x57f287; // green
const COLOR_GUEST = 0xfee75c; // yellow

export async function createVerificationLogChannel(
	token: string,
	guildId: string,
	config: GuildConfig,
	name = 'verification-log',
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
		topic: 'Verification audit archive — screenshots and player summaries (staff only).',
		permissionOverwrites: overwrites,
	});
	return channel.id;
}

export async function postVerificationLog(
	env: Env,
	config: GuildConfig,
	opts: {
		guildId: string;
		discordUserId: string;
		player: PlayerData;
		stfcProUrl: string;
		status: 'active' | 'guest';
		screenshotUrl?: string;
		r2Key?: string;
		notes?: string[];
	},
): Promise<void> {
	const channelId = config.verification_log_channel_id;
	const token = env.DISCORD_BOT_TOKEN;
	if (!channelId || !token) return;

	const power = opts.player.power
		? opts.player.power.toLocaleString()
		: opts.player.rss || '—';
	const rank = opts.player.rank?.trim() || '—';

	const embed = {
		title: opts.status === 'active' ? '✅ Verification successful' : '⏳ Verified as guest',
		description: `<@${opts.discordUserId}> verified as **${opts.player.name}**`,
		color: opts.status === 'active' ? COLOR_ACTIVE : COLOR_GUEST,
		fields: [
			{ name: 'Player', value: opts.player.name, inline: true },
			{ name: 'Rank', value: rank, inline: true },
			{ name: 'Alliance', value: opts.player.allianceTag || '—', inline: true },
			{ name: 'Ops', value: String(opts.player.level), inline: true },
			{ name: 'Power', value: power, inline: true },
			{
				name: 'Server',
				value: `${opts.player.server} (${opts.player.region})`,
				inline: true,
			},
			{ name: 'Player ID', value: String(opts.player.playerId), inline: true },
			{ name: 'stfc.pro', value: opts.stfcProUrl.slice(0, 200), inline: false },
		],
		footer: opts.notes?.length
			? { text: opts.notes.join(' · ').slice(0, 200) }
			: undefined,
		timestamp: new Date().toISOString(),
	};

	let file: { bytes: Uint8Array; filename: string; contentType: string } | undefined;

	try {
		if (opts.r2Key && env.VERIFICATION_ASSETS) {
			const obj = await env.VERIFICATION_ASSETS.get(opts.r2Key);
			if (obj) {
				const buf = new Uint8Array(await obj.arrayBuffer());
				file = {
					bytes: buf,
					filename: 'verification.png',
					contentType: obj.httpMetadata?.contentType ?? 'image/png',
				};
			}
		}
		if (!file && opts.screenshotUrl) {
			const res = await fetch(opts.screenshotUrl);
			if (res.ok) {
				file = {
					bytes: new Uint8Array(await res.arrayBuffer()),
					filename: 'verification.png',
					contentType: res.headers.get('content-type') ?? 'image/png',
				};
			}
		}
	} catch (err) {
		console.error('Verification log screenshot fetch failed:', err);
	}

	try {
		await sendChannelMessageWithEmbed(token, channelId, {
			embeds: [embed],
			file,
		});
	} catch (err) {
		console.error('Verification log post failed:', err);
	}
}
