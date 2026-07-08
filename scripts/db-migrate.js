#!/usr/bin/env node
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbName = process.env.D1_DATABASE_NAME || 'stfc-officers';
const target = process.argv.includes('--local') ? '--local' : '--remote';
const root = path.join(__dirname, '..');
const migrationsDir = path.join(root, 'migrations');

const files = fs
	.readdirSync(migrationsDir)
	.filter((f) => f.endsWith('.sql'))
	.sort()
	.map((f) => path.join(migrationsDir, f));

if (files.length === 0) {
	console.log(`No migrations found in ${migrationsDir}`);
	process.exit(0);
}

for (const filePath of files) {
	const rel = path.relative(root, filePath);
	console.log(`Applying ${rel} to D1 database "${dbName}" (${target})...`);
	execSync(`npx wrangler d1 execute ${dbName} ${target} --file=${rel}`, {
		stdio: 'inherit',
		cwd: root,
	});
}
