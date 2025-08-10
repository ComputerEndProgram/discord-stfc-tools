# 🔐 Environment-Based Configuration

## Overview

The Discord bot now uses environment variables for configuration management, keeping sensitive data like KV namespace IDs out of the repository. This is perfect for private GitHub repos where you want to maintain security best practices.

## 🎯 What's New

### ✅ Environment Variables
- **`.env`** - Contains your actual namespace IDs (gitignored)
- **`.env.template`** - Template for new deployments (committed)
- **`generate-config.js`** - Dynamically creates wrangler.json from .env

### ✅ Automated Configuration
- All npm scripts now auto-generate configuration
- `wrangler.json` is generated from environment variables
- No more manual config file editing

### ✅ Security Benefits
- KV namespace IDs stay private
- Easy to manage different environments
- Safe for public/private repositories

## 📋 Setup Process

### 1. Initial Setup
```bash
cp .env.template .env
npm install
```

### 2. Create KV Namespaces
```bash
npm run kv:create          # Production namespace
npm run kv:create-preview  # Preview namespace
```

### 3. Update Environment
Edit `.env` with the namespace IDs from step 2:
```env
KV_NAMESPACE_ID=your-production-id
KV_NAMESPACE_PREVIEW_ID=your-preview-id
```

### 4. Generate Configuration
```bash
npm run generate-config  # Creates wrangler.json
```

### 5. Migrate Data
```bash
npm run migrate-kv       # Prepare data
npm run kv:upload        # Upload to production
npm run kv:upload-preview # Upload to preview
```

### 6. Deploy
```bash
npm run register-commands # Register Discord commands
npm run deploy           # Deploy to Cloudflare
```

## 🔄 Daily Usage

All common commands now auto-generate configuration:

```bash
npm run dev     # Local development
npm run deploy  # Production deployment  
npm run test    # Run tests
```

## 📁 File Structure

```
├── .env                    # Your environment variables (gitignored)
├── .env.template          # Template for new setups (committed)
├── .gitignore             # Excludes .env and wrangler.json
├── generate-config.js     # Config generation script
├── wrangler.json          # Generated config (gitignored)
├── wrangler.jsonc.template # Original config template
└── setup.sh              # Automated setup script
```

## 🚀 Benefits

1. **Security**: Namespace IDs never committed to repo
2. **Flexibility**: Easy environment switching
3. **Automation**: Configuration generated automatically
4. **Collaboration**: Team members use their own .env files
5. **CI/CD Ready**: Environment variables work with deployment pipelines

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `KV_NAMESPACE_ID` | Production KV namespace | `65fc71b7f1774b28...` |
| `KV_NAMESPACE_PREVIEW_ID` | Preview KV namespace | `050acc316dfc4508...` |

## 🤝 Team Collaboration

Each team member:
1. Clones the repo
2. Copies `.env.template` to `.env`
3. Uses their own KV namespace IDs
4. Can develop independently without conflicts

Perfect for private repos where you want to keep configuration secure! 🔒
