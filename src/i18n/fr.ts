import type { MessageCatalog } from './en';

/** French */
export const fr: MessageCatalog = {
	'locale.picker.prompt':
		'Veuillez choisir votre langue préférée pour les messages du bot.\nPlease choose your preferred language / Wähle deine Sprache',
	'locale.picker.confirm': '✅ Langue définie sur **{label}**.',
	'locale.picker.already': 'Votre langue est déjà **{label}**.',
	'locale.changed': '✅ Langue préférée mise à jour : **{label}**.',

	'verify.invite.welcome':
		'Bienvenue ! Veuillez vérifier votre compte STFC pour accéder aux salons membres.\n\n' +
		'**Vérification par MP (recommandé) :**\n' +
		'1. Envoyez une **capture d’écran** de votre profil en jeu\n' +
		'2. Puis envoyez votre **lien de profil stfc.pro**\n\n' +
		'**Ou** utilisez `/verify link:<url>` sur le serveur.\n\n' +
		'Nous vérifierons votre alliance sur stfc.pro et attribuerons les rôles automatiquement.',

	'verify.dm.no_pending':
		'Aucune vérification en cours. Rejoignez d’abord un serveur configuré, ou utilisez `/verify` sur ce serveur.',
	'verify.dm.multi_guild':
		'Vous avez des vérifications en cours sur plusieurs serveurs. Utilisez `/verify` sur le serveur Discord que vous souhaitez rejoindre.',
	'verify.dm.need_screenshot':
		'Envoyez d’abord une **capture d’écran de votre profil en jeu**, puis votre lien stfc.pro.\n\nVous pouvez aussi utiliser `/verify` sur le serveur.',
	'verify.dm.screenshot_received':
		'✅ Capture reçue et archivée. Envoyez maintenant votre **lien de profil stfc.pro** (ex. `https://stfc.pro/player/12345?region=US&server=42`).',
	'verify.dm.need_link': 'Envoyez votre **lien de profil stfc.pro** pour continuer.',
	'verify.dm.need_locale':
		'Choisissez d’abord votre langue (boutons ci-dessus, ou `/language`).',

	'verify.error.invalid_url':
		'URL stfc.pro invalide. Exemple : https://stfc.pro/player/12345?region=US&server=1',
	'verify.error.no_server':
		'Impossible de déterminer le serveur STFC. Incluez le serveur dans l’URL ou demandez `/server setup`.',
	'verify.error.no_player_id': 'Impossible d’extraire un ID ou un nom de joueur de cette URL.',
	'verify.error.player_not_found': 'Aucun joueur trouvé sur le serveur {server} ({region}) pour ce lien.',
	'verify.error.no_alliance':
		'Joueur trouvé mais sans alliance — vous devez être dans une alliance pour vous vérifier.',
	'verify.error.lookup_failed': 'Échec de la recherche du joueur.',

	'verify.result.not_configured':
		'❌ Ce serveur n’est pas encore configuré. Un admin doit exécuter `/server setup`.',
	'verify.result.verified_no_token':
		'✅ **{name}** vérifié sur stfc.pro, mais le token du bot manque — rôles non mis à jour.\n\n{summary}',
	'verify.result.active':
		'✅ Vérifié et activé : **{name}** ({tag}, Ops {level}).\n{notes}\n\n{summary}',
	'verify.result.guest':
		'⏳ **{name}** vérifié, mais l’alliance **{tag}** ne correspond pas à **{expected}** — rôle invité attribué. Nouvelle vérif. toutes les {hours}h.\n\n{summary}',
	'verify.result.discord_failed':
		'✅ Vérifié sur stfc.pro, mais échec de la mise à jour Discord : {error}{nickHint}\n\n{summary}',

	'verify.note.roles_updated': 'Rôles mis à jour',
	'verify.note.nick': 'Pseudo : {nick}',
	'verify.note.nick_failed': 'Pseudo échoué (hiérarchie/propriétaire ?)',
	'verify.note.channel': 'Salon <#{channelId}>',
	'verify.note.diplomacy': 'Diplomatie <#{channelId}>',
	'verify.note.manual': 'Manuel par <@{userId}>',

	'verify.hint.nickname_permissions':
		'\n↳ Souvent : le bot a besoin de **Gérer les pseudos**, son rôle doit être **au-dessus** du membre, et Discord ne peut pas renommer le **propriétaire**.',

	'verify.player_summary':
		'**{name}** (ID {id})\nAlliance : [{alliance}] · Rang : {rank}\nOps {ops} · Power {power}\nServeur {server} ({region})',

	'exchange.dm.need_request':
		'📦 **{name}** (Ops {ops}) a besoin de **{resource}**.\nAlliance : [{tag}]\nAppuyez sur **Help** pour prendre en charge (premier arrivé), ou **Ignore**.',
	'exchange.dm.claimed':
		'🤝 **{donorName}** (Ops {ops}, [{tag}]) a pris en charge votre demande **{resource}** !\nDiscord : <@{donorId}>\n\nQuand c’est fait : **Completed**. Sinon : **Ask again**.',
	'exchange.dm.request_cancelled':
		'ℹ️ <@{userId}> a annulé sa demande **{resource}** (#{id}).',

	'exchange.btn.help': 'Help',
	'exchange.btn.ignore': 'Ignore',
	'exchange.btn.completed': 'Completed',
	'exchange.btn.ask_again': 'Ask again',

	'survey.delivery.body': '**Sondage #{id}**\n{question}\n\nAppuyez sur un bouton pour répondre :',
	'survey.delivery.test_prefix':
		'🧪 **Test** (vous seul — les votes en brouillon ne comptent pas)\n\n',
	'survey.delivery.cta': 'Appuyez sur un bouton pour répondre :',
};
