import {
	getGuild,
	getGuildMember,
	listGuildRoles,
	type DiscordGuildMember,
} from '../discord-api';
import { ADMINISTRATOR, hasAdminOrManageGuild, MANAGE_GUILD } from '../discord-admin';
import type { GuildConfig } from '../types';

/** Compute effective guild permissions for a member from role bitfields. */
export function computeMemberPermissions(
	roles: Array<{ id: string; permissions?: string }>,
	member: DiscordGuildMember,
	guildId: string,
): bigint {
	const everyone = roles.find((r) => r.id === guildId);
	let perms = BigInt(everyone?.permissions ?? '0');
	const memberRoleSet = new Set(member.roles);
	for (const role of roles) {
		if (memberRoleSet.has(role.id)) {
			perms |= BigInt(role.permissions ?? '0');
		}
	}
	if ((perms & ADMINISTRATOR) !== 0n) {
		return ADMINISTRATOR | MANAGE_GUILD | perms;
	}
	return perms;
}

export async function memberIsGuildAdmin(
	token: string,
	guildId: string,
	userId: string,
): Promise<boolean> {
	const guild = await getGuild(token, guildId);
	if (guild?.owner_id === userId) return true;

	const member = await getGuildMember(token, guildId, userId);
	if (!member) return false;

	const roles = await listGuildRoles(token, guildId);
	const perms = computeMemberPermissions(roles, member, guildId);
	return hasAdminOrManageGuild(perms);
}

/** Admins always allowed; otherwise must hold one of dm_query_role_ids (empty = admins only). */
export async function memberCanAskDmQueries(
	token: string,
	guildId: string,
	userId: string,
	config: GuildConfig,
): Promise<boolean> {
	if (await memberIsGuildAdmin(token, guildId, userId)) return true;
	const allowed = config.dm_query_role_ids;
	if (!allowed.length) return false;

	const member = await getGuildMember(token, guildId, userId);
	if (!member) return false;
	const memberRoles = new Set(member.roles);
	return allowed.some((id) => memberRoles.has(id));
}
