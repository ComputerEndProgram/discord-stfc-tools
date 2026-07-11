import type { MessageCatalog } from './en';

/** German */
export const de: MessageCatalog = {
	'locale.picker.prompt':
		'Bitte wähle deine bevorzugte Sprache für Bot-Nachrichten.\nPlease choose your preferred language / Choisissez votre langue',
	'locale.picker.confirm': '✅ Sprache auf **{label}** gesetzt.',
	'locale.picker.already': 'Deine Sprache ist bereits **{label}**.',
	'locale.changed': '✅ Bevorzugte Sprache auf **{label}** aktualisiert.',

	'verify.invite.welcome':
		'Willkommen! Bitte verifiziere dein STFC-Konto, um Zugang zu den Mitgliederkanälen zu erhalten.\n\n' +
		'**Verifizierung per DM (empfohlen):**\n' +
		'1. Sende einen **Screenshot** deines Ingame-Profils\n' +
		'2. Sende danach deinen **stfc.pro-Profil-Link**\n\n' +
		'**Oder** nutze `/verify link:<url>` im Server.\n\n' +
		'Wir prüfen deine Allianz auf stfc.pro und weisen Rollen automatisch zu.',

	'verify.dm.no_pending':
		'Keine ausstehende Verifizierung gefunden. Tritt zuerst einem konfigurierten Server bei oder nutze dort `/verify`.',
	'verify.dm.multi_guild':
		'Du hast ausstehende Verifizierungen in mehreren Servern. Bitte nutze `/verify` in dem Discord-Server, dem du beitreten möchtest.',
	'verify.dm.need_screenshot':
		'Bitte sende zuerst einen **Screenshot deines Ingame-Profils**, danach deinen stfc.pro-Link.\n\nDu kannst auch `/verify` im Server nutzen.',
	'verify.dm.screenshot_received':
		'✅ Screenshot empfangen und archiviert. Sende jetzt deinen **stfc.pro-Profil-Link** (z. B. `https://stfc.pro/player/12345?region=US&server=42`).',
	'verify.dm.need_link': 'Bitte sende deinen **stfc.pro-Profil-Link**, um fortzufahren.',
	'verify.dm.need_locale':
		'Bitte wähle zuerst deine Sprache (nutze die Buttons oben oder `/language`).',

	'verify.error.invalid_url':
		'Ungültige stfc.pro-URL. Beispiel: https://stfc.pro/player/12345?region=US&server=1',
	'verify.error.no_server':
		'STFC-Server konnte nicht ermittelt werden. Server in der URL angeben oder Admin `/server setup` ausführen lassen.',
	'verify.error.no_player_id': 'Aus dieser URL konnte keine Spieler-ID oder kein Name gelesen werden.',
	'verify.error.player_not_found': 'Kein Spieler auf Server {server} ({region}) für diesen Link gefunden.',
	'verify.error.no_alliance':
		'Spieler gefunden, aber ohne Allianz — du musst in einer Allianz sein, um dich zu verifizieren.',
	'verify.error.lookup_failed': 'Spielersuche fehlgeschlagen.',

	'verify.result.not_configured':
		'❌ Dieser Server ist noch nicht konfiguriert. Ein Admin muss zuerst `/server setup` ausführen.',
	'verify.result.verified_no_token':
		'✅ **{name}** auf stfc.pro verifiziert, aber Bot-Token fehlt — Rollen wurden nicht aktualisiert.\n\n{summary}',
	'verify.result.active':
		'✅ Verifiziert und aktiviert: **{name}** ({tag}, Ops {level}).\n{notes}\n\n{summary}',
	'verify.result.guest':
		'⏳ **{name}** verifiziert, aber Allianz **{tag}** stimmt nicht mit **{expected}** überein — Gastrolle zugewiesen. Wir prüfen alle {hours}h erneut.\n\n{summary}',
	'verify.result.discord_failed':
		'✅ Auf stfc.pro verifiziert, aber Discord-Rollen-Update fehlgeschlagen: {error}{nickHint}\n\n{summary}',

	'verify.note.roles_updated': 'Rollen aktualisiert',
	'verify.note.nick': 'Nick: {nick}',
	'verify.note.nick_failed': 'Nick fehlgeschlagen (Hierarchie/Owner?)',
	'verify.note.channel': 'Kanal <#{channelId}>',
	'verify.note.diplomacy': 'Diplomatie <#{channelId}>',
	'verify.note.manual': 'Manuell von <@{userId}>',

	'verify.hint.nickname_permissions':
		'\n↳ Meist: Bot braucht **Nicknames verwalten**, seine Rolle muss **über** dem Mitglied stehen, und Discord kann den **Server-Owner** nicht umbenennen.',

	'verify.player_summary':
		'**{name}** (ID {id})\nAllianz: [{alliance}] · Rang: {rank}\nOps {ops} · Power {power}\nServer {server} ({region})',

	'exchange.dm.need_request':
		'📦 **{name}** (Ops {ops}) braucht **{resource}**.\nAllianz: [{tag}]\nTippe **Help**, um zu übernehmen (Wer zuerst kommt), oder **Ignore**.',
	'exchange.dm.claimed':
		'🤝 **{donorName}** (Ops {ops}, [{tag}]) hat deine Anfrage für **{resource}** übernommen!\nDiscord: <@{donorId}>\n\nWenn fertig: **Completed**. Wenn nicht möglich: **Ask again**.',
	'exchange.dm.request_cancelled':
		'ℹ️ <@{userId}> hat die Anfrage für **{resource}** (#{id}) abgebrochen.',

	'exchange.btn.help': 'Help',
	'exchange.btn.ignore': 'Ignore',
	'exchange.btn.completed': 'Completed',
	'exchange.btn.ask_again': 'Ask again',

	'survey.delivery.body': '**Umfrage #{id}**\n{question}\n\nTippe einen Button zum Antworten:',
	'survey.delivery.test_prefix':
		'🧪 **Testzustellung** (nur du — Stimmen im Entwurf zählen nicht)\n\n',
	'survey.delivery.cta': 'Tippe einen Button zum Antworten:',
};
