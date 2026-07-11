import type { MessageCatalog } from './en';

/** Hungarian */
export const hu: MessageCatalog = {
	'locale.picker.prompt':
		'Válaszd ki a botüzenetek preferált nyelvét.\nPlease choose your preferred language / Wähle deine Sprache',
	'locale.picker.confirm': '✅ Nyelv beállítva: **{label}**.',
	'locale.picker.already': 'A nyelved már **{label}**.',
	'locale.changed': '✅ Preferált nyelv frissítve: **{label}**.',

	'verify.invite.welcome':
		'Üdvözlünk! Igazold az STFC-fiókodat a tagcsatornák eléréséhez.\n\n' +
		'**Igazolás DM-ben (ajánlott):**\n' +
		'1. Küldj egy **képernyőképet** a játékbeli profilodról\n' +
		'2. Utána küldd el az **stfc.pro profil linked**\n\n' +
		'**Vagy** használd a `/verify link:<url>` parancsot a szerveren.\n\n' +
		'Ellenőrizzük a szövetségedet az stfc.pro-n, és automatikusan kiosztjuk a szerepeket.',

	'verify.dm.no_pending':
		'Nincs függőben lévő igazolás. Először csatlakozz egy beállított szerverhez, vagy használd ott a `/verify` parancsot.',
	'verify.dm.multi_guild':
		'Több szerveren is van függő igazolásod. Használd a `/verify` parancsot azon a Discord-szerveren, amelyhez csatlakozni szeretnél.',
	'verify.dm.need_screenshot':
		'Először küldj egy **képernyőképet a játékbeli profilodról**, majd az stfc.pro linked.\n\nA szerveren a `/verify` is használható.',
	'verify.dm.screenshot_received':
		'✅ Képernyőkép megérkezett és archiválva. Most küldd el az **stfc.pro profil linked** (pl. `https://stfc.pro/player/12345?region=US&server=42`).',
	'verify.dm.need_link': 'Küldd el az **stfc.pro profil linked** az igazolás folytatásához.',
	'verify.dm.need_locale':
		'Először válaszd ki a nyelved (a fenti gombokkal, vagy `/language`).',

	'verify.error.invalid_url':
		'Érvénytelen stfc.pro URL. Példa: https://stfc.pro/player/12345?region=US&server=1',
	'verify.error.no_server':
		'Nem sikerült meghatározni az STFC-szervert. Add meg a szervert az URL-ben, vagy kérj admin `/server setup`-ot.',
	'verify.error.no_player_id': 'Nem sikerült játékos-azonosítót vagy nevet kinyerni ebből az URL-ből.',
	'verify.error.player_not_found':
		'Nem található játékos a(z) {server} szerveren ({region}) ehhez a linkhez.',
	'verify.error.no_alliance':
		'Játékos megtalálva, de nincs szövetsége — az igazoláshoz szövetségben kell lenned.',
	'verify.error.lookup_failed': 'A játékos keresése sikertelen.',

	'verify.result.not_configured':
		'❌ Ez a szerver még nincs beállítva. Egy adminnak először futtatnia kell a `/server setup` parancsot.',
	'verify.result.verified_no_token':
		'✅ **{name}** igazolva az stfc.pro-n, de a bot token nincs beállítva — a szerepek nem frissültek.\n\n{summary}',
	'verify.result.active':
		'✅ Igazolva és aktiválva: **{name}** ({tag}, Ops {level}).\n{notes}\n\n{summary}',
	'verify.result.guest':
		'⏳ **{name}** igazolva, de a **{tag}** szövetség nem egyezik a várt **{expected}** értékkel — vendég szerep kiosztva. {hours} óránként újraellenőrizzük.\n\n{summary}',
	'verify.result.discord_failed':
		'✅ Igazolva az stfc.pro-n, de a Discord szerepek frissítése sikertelen: {error}{nickHint}\n\n{summary}',

	'verify.note.roles_updated': 'Szerepek frissítve',
	'verify.note.nick': 'Becenév: {nick}',
	'verify.note.nick_failed': 'Becenév sikertelen (hierarchia/tulajdonos?)',
	'verify.note.channel': 'Csatorna <#{channelId}>',
	'verify.note.diplomacy': 'Diplomácia <#{channelId}>',
	'verify.note.manual': 'Kézi: <@{userId}>',

	'verify.hint.nickname_permissions':
		'\n↳ Általában: a botnak kell a **Becenevek kezelése**, a szerepének **a tag felett** kell lennie, és a Discord nem tudja átnevezni a **szerver tulajdonosát**.',

	'verify.player_summary':
		'**{name}** (ID {id})\nSzövetség: [{alliance}] · Rang: {rank}\nOps {ops} · Power {power}\nSzerver {server} ({region})',

	'exchange.dm.need_request':
		'📦 **{name}** (Ops {ops}) **{resource}**-t kér.\nSzövetség: [{tag}]\nNyomj **Help**-et a foglaláshoz (aki előbb, az nyer), vagy **Ignore**.',
	'exchange.dm.claimed':
		'🤝 **{donorName}** (Ops {ops}, [{tag}]) elfogadta a **{resource}** kérésedet!\nDiscord: <@{donorId}>\n\nHa kész: **Completed**. Ha mégsem tud segíteni: **Ask again**.',
	'exchange.dm.request_cancelled':
		'ℹ️ <@{userId}> visszavonta a **{resource}** kérését (#{id}) — már nincs rá szükség.',

	'exchange.btn.help': 'Help',
	'exchange.btn.ignore': 'Ignore',
	'exchange.btn.completed': 'Completed',
	'exchange.btn.ask_again': 'Ask again',

	'survey.delivery.body': '**Felmérés #{id}**\n{question}\n\nNyomj egy gombot a válaszhoz:',
	'survey.delivery.test_prefix':
		'🧪 **Tesztküldés** (csak neked — a piszkozatban adott szavazatok nem számítanak)\n\n',
	'survey.delivery.cta': 'Nyomj egy gombot a válaszhoz:',
};
