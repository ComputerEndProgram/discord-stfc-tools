import { listConfiguredGuilds, listActiveVerifiedPlayers, recordPlayerStats } from './guild-db';
import { findPlayerByIdOrName } from './stfc-utils';
import { syncVerifiedPlayer } from './verification';
import { syncGuildMembers } from './member-sync';
import { wakeDiscordGateway } from './discord-gateway/wake';
import { AuditColor, postAuditLog } from './audit-log';

export async function runMemberPoll(env: Env): Promise<void> {
	console.log('Cron: member poll starting');
	await wakeDiscordGateway(env);
	// REST poll remains as fallback when Gateway is disconnected
	await syncGuildMembers(env);
	console.log('Cron: member poll complete');
}

export async function runPendingVerificationPoll(env: Env): Promise<void> {
	console.log('Cron: pending verification poll starting');

	const guilds = await listConfiguredGuilds(env.STFC_DB);

	for (const config of guilds) {
		if (config.mode !== 'single_alliance' || !config.alliance_tag) continue;

		const players = await listActiveVerifiedPlayers(env.STFC_DB, config.guild_id);
		let promoted = 0;

		for (const record of players) {
			if (record.verification_status !== 'guest' || !record.player_id) continue;

			try {
				const player = await findPlayerByIdOrName(record.player_id, config.stfc_server, config.stfc_region);
				if (!player) continue;

				const matches = player.allianceTag.toUpperCase() === config.alliance_tag!.toUpperCase();
				if (matches) {
					await syncVerifiedPlayer(env, config, config.guild_id, record.discord_user_id, player);
					promoted++;
					console.log(`Guest ${record.discord_user_id} now matches alliance ${config.alliance_tag}`);
				}
			} catch (error) {
				console.error(`Pending verification check failed for ${record.discord_user_id}:`, error);
			}
		}

		if (promoted > 0) {
			await postAuditLog(env, config, {
				title: 'Guest re-check complete',
				description: `Promoted **${promoted}** guest(s) to active (alliance match).`,
				source: 'cron',
				color: AuditColor.success,
			});
		}
	}

	console.log('Cron: pending verification poll complete');
}

export async function runDailyPlayerSync(env: Env): Promise<void> {
	console.log('Cron: daily player sync starting');

	const guilds = await listConfiguredGuilds(env.STFC_DB);

	for (const config of guilds) {
		const players = await listActiveVerifiedPlayers(env.STFC_DB, config.guild_id);
		let synced = 0;
		let failed = 0;
		let tagChanges = 0;

		for (const record of players) {
			if (!record.player_id) continue;

			try {
				const player = await findPlayerByIdOrName(record.player_id, config.stfc_server, config.stfc_region);
				if (!player) continue;

				const prevTag = record.alliance_tag;
				const tagChanged = prevTag && player.allianceTag && prevTag !== player.allianceTag;

				await syncVerifiedPlayer(env, config, config.guild_id, record.discord_user_id, player);
				await recordPlayerStats(env.STFC_DB, record.id, player.level, player.power, player.allianceTag);
				synced++;

				if (tagChanged) {
					tagChanges++;
					console.log(
						`Alliance change: ${record.player_name} ${prevTag} → ${player.allianceTag} (guild ${config.guild_id})`,
					);
				}
			} catch (error) {
				failed++;
				console.error(`Daily sync failed for player ${record.player_id}:`, error);
			}
		}

		if (synced > 0 || failed > 0) {
			await postAuditLog(env, config, {
				title: 'Daily player sync complete',
				description: `Synced **${synced}** player(s)` +
					(failed ? ` · **${failed}** failed` : '') +
					(tagChanges ? ` · **${tagChanges}** alliance change(s)` : ''),
				source: 'cron',
				color: failed ? AuditColor.warn : AuditColor.info,
			});
		}
	}

	console.log('Cron: daily player sync complete');
}

export async function handleScheduledEvent(env: Env, cron: string): Promise<void> {
	await wakeDiscordGateway(env);

	switch (cron) {
		case '*/5 * * * *':
			await runMemberPoll(env);
			break;
		case '0 */6 * * *':
			await runPendingVerificationPoll(env);
			break;
		case '0 6 * * *':
			await runDailyPlayerSync(env);
			break;
		default:
			console.log(`Unknown cron: ${cron}`);
	}
}
