/** Discord permission bit: Administrator */
export const ADMINISTRATOR = 0x8n;

export function isGuildAdministrator(permissions: string | undefined): boolean {
	return (BigInt(permissions ?? '0') & ADMINISTRATOR) !== 0n;
}

export function requireGuildAdmin(
	interaction: { guild_id?: string; member?: { permissions?: string } },
): Response | null {
	if (!interaction.guild_id) {
		return Response.json({
			type: 4,
			data: { content: '❌ Run this command inside your server.', flags: 64 },
		});
	}
	if (!isGuildAdministrator(interaction.member?.permissions)) {
		return Response.json({
			type: 4,
			data: { content: '❌ You need Administrator permission.', flags: 64 },
		});
	}
	return null;
}

/** Resolve @user option or default to the command invoker. */
export function resolveTargetUserId(
	interaction: { member?: { user?: { id: string } } },
	subcommandOptions?: Array<{ name: string; value?: unknown; type?: number }>,
): string | undefined {
	const userOption = subcommandOptions?.find((o) => o.name === 'user');
	if (userOption?.value) return String(userOption.value);
	return interaction.member?.user?.id;
}
