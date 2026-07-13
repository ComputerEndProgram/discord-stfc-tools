/**
 * Human-readable onboarding path for admins (`/server onboarding`).
 */
import type { GuildConfig } from './types';
import { welcomeDmConfigured } from './welcome-dm';

export function formatOnboardingPath(config: GuildConfig): string {
	const steps: string[] = [];
	let n = 1;
	const step = (title: string, detail: string, enabled: boolean) => {
		const mark = enabled ? '✅' : '⬜';
		steps.push(`${mark} **${n}. ${title}** — ${detail}`);
		n += 1;
	};

	step(
		'Join / invite DM',
		'Gateway (or poll) sends language picker when needed, then verification invite.',
		true,
	);

	step(
		'Language',
		'Member picks preferred language for bot DMs (`/language` also works later).',
		true,
	);

	if (config.data_consent_enabled) {
		step(
			'Data consent',
			`GDPR Yes/No before stfc.pro link (version \`${config.data_consent_version ?? '1'}\`).`,
			true,
		);
	} else {
		step('Data consent', 'Disabled — skipped.', false);
	}

	if (config.agreement_enabled && config.agreement_timing === 'before_verify') {
		step(
			'Code of Conduct (legacy)',
			`Before verify (\`${config.agreement_mode}\`)` +
				(config.agreement_channel_id ? ` → <#${config.agreement_channel_id}>` : '') +
				'. Prefer `/server consent` for pre-verify gates.',
			true,
		);
	}

	step(
		'Verify',
		'Screenshot (DM) + stfc.pro link, or `/verify` / `/server verify`. Roles/nick depend on mode + CoC.',
		config.verification_enabled,
	);

	if (config.agreement_enabled && config.agreement_timing === 'after_verify') {
		step(
			'Code of Conduct',
			`After verify: guest/lounge until Agree (\`${config.agreement_mode}\`, v\`${config.agreement_version ?? '1'}\`)` +
				(config.agreement_channel_id ? ` → <#${config.agreement_channel_id}>` : '') +
				'.',
			true,
		);
	} else if (!config.agreement_enabled) {
		step('Code of Conduct', 'Disabled — full access right after successful verify.', false);
	}

	const welcomeOn = welcomeDmConfigured(config);
	step(
		'Welcome DM',
		welcomeOn
			? `Once after full access (max **2** auto attempts; then stops unless admin forces). Source <#${config.welcome_dm_channel_id}>.`
			: config.welcome_dm_enabled
				? 'Enabled but source message not set — configure `/server welcome`.'
				: 'Disabled — skipped.',
		welcomeOn,
	);

	const modeNote =
		config.mode === 'single_alliance'
			? `Mode **single_alliance** — tag must match \`${config.alliance_tag ?? '?'}\` (else guest).`
			: 'Mode **multi_alliance** — any alliance verifies as member (no guest-by-tag).';

	return (
		`🚪 **Onboarding path** (${config.deploy_mode})\n` +
		`${modeNote}\n\n` +
		steps.join('\n') +
		`\n\n` +
		`Manual verify: \`/server verify … send_welcome:true|false\` (default **false**).\n` +
		`Force welcome retry: \`/server welcome send_user:@Member force:true\`.\n` +
		`Preview DMs: \`/test-dm kind:…\`.`
	);
}
