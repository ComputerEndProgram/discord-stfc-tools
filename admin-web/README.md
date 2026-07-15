# Admin web (STFC Tools)

Cloudflare Pages app (Root directory: `admin-web`).

## Public URLs

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/privacy` | Privacy Policy (Discord verification) |
| `/terms` | Terms of Service |
| `/login` | Discord OAuth admin login |
| `/app` | Guild picker / dashboard (auth required) |

Edit operator contact in `src/legal/operator.ts` before publishing.

## Pages project

- Build: `npm ci && npm run build`
- Output: `dist`
- Env: `VITE_API_BASE_URL` = Worker URL

See [docs/ADMIN_WEB.md](../docs/ADMIN_WEB.md) and [docs/BOT_MIGRATION.md](../docs/BOT_MIGRATION.md).
