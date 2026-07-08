#!/usr/bin/env node
/**
 * Push configuration from .env to Cloudflare Workers.
 *
 * - Secrets (encrypted): DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN → wrangler secret bulk
 * - Vars + bindings: WORKER_URL, D1, KV, R2 → generate-config.js → wrangler.json (applied on deploy)
 * - Local dev: writes .dev.vars for `wrangler dev`
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** Runtime secrets — never go in wrangler.json vars */
const SECRET_KEYS = ['DISCORD_PUBLIC_KEY', 'DISCORD_BOT_TOKEN'];

const missing = SECRET_KEYS.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
	console.error('❌ Missing required secrets in .env:');
	for (const key of missing) {
		console.error(`   ${key}`);
	}
	console.error('\nAdd them to .env (see .env.template), then run again.');
	process.exit(1);
}

// .dev.vars — used automatically by `wrangler dev`
const devVarsPath = path.join(ROOT, '.dev.vars');
const devVarsContent = SECRET_KEYS.map((key) => `${key}=${process.env[key]}`).join('\n') + '\n';
fs.writeFileSync(devVarsPath, devVarsContent);
console.log('✅ Wrote .dev.vars (local wrangler dev secrets)');

// Regenerate wrangler.json (vars, D1/KV/R2 bindings)
execSync('node generate-config.js', { stdio: 'inherit', cwd: ROOT });

// Push secrets to Cloudflare (production Worker)
const tmpPath = path.join(ROOT, '.secrets.bulk.tmp');
const bulkContent = SECRET_KEYS.map((key) => `${key}=${process.env[key]}`).join('\n') + '\n';

try {
	fs.writeFileSync(tmpPath, bulkContent);
	console.log('📤 Pushing secrets to Cloudflare...');
	execSync(`npx wrangler secret bulk "${tmpPath}"`, { stdio: 'inherit', cwd: ROOT });
	console.log('✅ Secrets pushed:', SECRET_KEYS.join(', '));
} finally {
	if (fs.existsSync(tmpPath)) {
		fs.unlinkSync(tmpPath);
	}
}

console.log(`
Done. Non-secret config is in wrangler.json (from .env via generate-config).

  npm run deploy          # apply vars + bindings to production
  npm run register-commands

Note: DISCORD_APPLICATION_ID and WORKER_URL are Worker vars (not secrets) —
they are included in wrangler.json when set in .env.
`);
