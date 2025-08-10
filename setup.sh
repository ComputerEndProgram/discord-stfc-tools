#!/bin/bash

# Setup script for Discord STFC Tools
# This script automates the initial setup process

set -e

echo "🚀 Setting up Discord STFC Tools..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from template..."
    cp .env.template .env
    echo "⚠️  Please edit .env with your namespace IDs after running the KV creation commands"
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create KV namespaces
echo "🗄️  Creating KV namespaces..."
echo "Creating production namespace..."
npm run kv:create

echo "Creating preview namespace..."
npm run kv:create-preview

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env with the namespace IDs shown above"
echo "2. Run: npm run generate-config"
echo "3. Run: npm run migrate-kv"
echo "4. Run: npm run kv:upload"
echo "5. Run: npm run register-commands"
echo "6. Run: npm run deploy"
echo ""
echo "💡 See KV_MIGRATION_GUIDE.md for detailed instructions"
