/**
 * English (default) catalog for player-facing bot messages.
 * Keys use dot notation; placeholders are `{name}` style.
 */
export const en = {
	'locale.picker.prompt':
		'Please choose your preferred language for bot messages.\nWähle deine Sprache / Choisissez votre langue / Elige tu idioma',
	'locale.picker.confirm': '✅ Language set to **{label}**.',
	'locale.picker.already': 'Your language is already **{label}**.',
	'locale.changed': '✅ Preferred language updated to **{label}**.',

	'verify.invite.welcome':
		'Welcome! Please verify your STFC account to access member channels.\n\n' +
		'**Verify via DM (recommended):**\n' +
		'1. Send a **screenshot** of your in-game profile\n' +
		'2. Then send your **stfc.pro profile link**\n\n' +
		'**Or** use `/verify link:<url>` in the server.\n\n' +
		"We'll check your alliance on stfc.pro and assign roles automatically.",

	'verify.dm.no_pending':
		'No pending verification found. Join a configured server first, or use `/verify` there.',
	'verify.dm.multi_guild':
		'You have pending verification in multiple servers. Please use `/verify` in the Discord server you want to join.',
	'verify.dm.need_screenshot':
		'Please send a **screenshot of your in-game profile** first, then your stfc.pro link.\n\nYou can also use `/verify` in the server.',
	'verify.dm.screenshot_received':
		'✅ Screenshot received and archived. Now send your **stfc.pro profile link** (e.g. `https://stfc.pro/player/12345?region=US&server=42`).',
	'verify.dm.need_link': 'Please send your **stfc.pro profile link** to continue verification.',
	'verify.dm.need_locale': 'Please choose your preferred language first (use the buttons above, or run `/language`).',

	'verify.error.invalid_url':
		'Invalid stfc.pro URL. Example: https://stfc.pro/player/12345?region=US&server=1',
	'verify.error.no_server':
		'Could not determine STFC server. Include server in the URL or ask an admin to run `/server setup`.',
	'verify.error.no_player_id': 'Could not extract a player ID or name from that URL.',
	'verify.error.player_not_found': 'No player found on server {server} ({region}) for that link.',
	'verify.error.no_alliance': 'Player found but has no alliance — you must be in an alliance to verify.',
	'verify.error.lookup_failed': 'Player lookup failed.',

	'verify.result.not_configured':
		'❌ This server is not configured yet. An admin must run `/server setup` first.',
	'verify.result.verified_no_token':
		'✅ Verified **{name}** on stfc.pro, but bot token is not configured — roles were not updated.\n\n{summary}',
	'verify.result.active':
		'✅ Verified and activated **{name}** ({tag}, Ops {level}).\n{notes}\n\n{summary}',
	'verify.result.guest':
		'⏳ Verified **{name}** but alliance **{tag}** does not match **{expected}** — guest role assigned. We will re-check every {hours}h.\n\n{summary}',
	'verify.result.discord_failed':
		'✅ Verified on stfc.pro but failed to update Discord roles: {error}{nickHint}\n\n{summary}',

	'verify.note.roles_updated': 'Roles updated',
	'verify.note.nick': 'Nick: {nick}',
	'verify.note.nick_failed': 'Nick failed (hierarchy/owner?)',
	'verify.note.channel': 'Channel <#{channelId}>',
	'verify.note.diplomacy': 'Diplomacy <#{channelId}>',
	'verify.note.manual': 'Manual by <@{userId}>',

	'verify.hint.nickname_permissions':
		'\n↳ Usually: bot needs **Manage Nicknames**, its role must be **above** the member, and Discord cannot rename the **server owner**.',

	'verify.player_summary':
		'**{name}** (ID {id})\nAlliance: [{alliance}] · Rank: {rank}\nOps {ops} · Power {power}\nServer {server} ({region})',

	'exchange.dm.need_request':
		'📦 **{name}** (Ops {ops}) needs **{resource}**.\nAlliance: [{tag}]\nHit **Help** to claim (first wins), or **Ignore**.',
	'exchange.dm.claimed':
		'🤝 **{donorName}** (Ops {ops}, [{tag}]) claimed your **{resource}** request!\nDiscord: <@{donorId}>\n\nWhen done, tap **Completed**. If they can\'t help, tap **Ask again**.',
	'exchange.dm.request_cancelled':
		'ℹ️ <@{userId}> cancelled their **{resource}** request (#{id}) — no longer needed.',

	'exchange.btn.help': 'Help',
	'exchange.btn.ignore': 'Ignore',
	'exchange.btn.completed': 'Completed',
	'exchange.btn.ask_again': 'Ask again',

	'survey.delivery.body': '**Survey #{id}**\n{question}\n\nTap a button to respond:',
	'survey.delivery.test_prefix': '🧪 **Test delivery** (only you — votes while draft are not counted)\n\n',
	'survey.delivery.cta': 'Tap a button to respond:',
} as const;

export type MessageKey = keyof typeof en;
export type MessageCatalog = Record<MessageKey, string>;
