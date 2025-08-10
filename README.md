# STFC Coordinate Lookup Discord Bot

A Cloudflare Worker-based Discord bot that parses Star Trek Fleet Command (STFC) coordinate links and returns formatted system information in ASCII tables. Now includes custom ASCII table generation from CSV data.

## Features

- **Coordinate Parsing**: Extracts alliance, player, system ID, and coordinates from STFC coordinate links
- **System Lookup**: Matches system IDs to system names, warp distances, and faction control using Cloudflare KV storage
- **ASCII Table Output**: Returns neatly formatted tables with all relevant information
- **Custom Table Generation**: Create ASCII tables from any CSV data
- **Multiple Interfaces**: Supports Discord slash commands and direct API calls
- **Serverless**: Runs on Cloudflare Workers for high availability and low latency
- **Docker Support**: Containerized for local development and testing
- **KV Storage**: Uses Cloudflare KV for fast system data lookup

## Discord Commands

### `/lookup <coordinates>`
Lookup STFC coordinate information:
```
/lookup [[RONE] RogueOneAdmiral S:73559 X:628.7432 Y:43.3874]
```

### `/table <csv_data>`
Generate ASCII table from CSV data:
```
/table Name,Age,City
John,25,New York
Jane,30,San Francisco
```

## Coordinate Format

The bot recognizes coordinate links in the following format:
```
[[ALLIANCE] Player S:12345 X:123.456 Y:789.012]
```

Example:
```
[[RONE] RogueOneAdmiral S:73559 X:628.7432 Y:43.3874]
```

## Output Format

The bot returns information in a formatted ASCII table:

```
+----------+--------+------+-----------+---------+-----------------+
| Alliance | System | Warp | Warp (SH) | Faction | Player          |
+----------+--------+------+-----------+---------+-----------------+
|   RONE   | Nidox  |   1  |     1     | Neutral | RogueOneAdmiral |
+----------+--------+------+-----------+---------+-----------------+
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (for deployment)
- Discord application (for bot integration)
- Docker (optional, for containerized development)

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Configure Discord application:
   - Create a Discord application at https://discord.com/developers/applications
   - Get your application's public key
   - Set up slash commands (see Discord Setup section)

3. Set environment variables:
```bash
# Set Discord public key as a Cloudflare secret
npx wrangler secret put DISCORD_PUBLIC_KEY
```

### Development

Start the development server:
```bash
npm run dev
```

The worker will be available at `http://localhost:8787/`

### Testing Endpoints

#### Direct API Testing
```bash
# GET request
curl "http://localhost:8787/lookup?message=[[RONE] RogueOneAdmiral S:73559 X:628.7432 Y:43.3874]"

# POST request
curl -X POST http://localhost:8787/lookup \
  -H "Content-Type: application/json" \
  -d '{"message": "[[RONE] RogueOneAdmiral S:73559 X:628.7432 Y:43.3874]"}'
```

### Docker Development

Build and run with Docker:
```bash
npm run docker:build
npm run docker:run
```

Or using Docker directly:
```bash
docker build -t stfc-lookup .
docker run -p 8787:8787 -e DISCORD_PUBLIC_KEY=your_key stfc-lookup
```

## Discord Setup

### 1. Create Slash Command

Register a slash command with Discord:

```bash
curl -X POST \
  "https://discord.com/api/v10/applications/YOUR_APPLICATION_ID/commands" \
  -H "Authorization: Bot YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "lookup",
    "description": "Look up STFC coordinate information",
    "options": [
      {
        "type": 3,
        "name": "coordinates",
        "description": "STFC coordinate link to lookup",
        "required": true
      }
    ]
  }'
```

### 2. Configure Webhook

Set your deployed worker URL as the interactions endpoint:
- URL: `https://your-worker.your-subdomain.workers.dev/discord`
- Make sure to verify the endpoint with Discord

## Deployment

### KV Storage Setup

1. Create KV namespaces:
```bash
npm run kv:create
npm run kv:create-preview
```

2. Update `wrangler.jsonc` with the namespace IDs returned from the previous commands

3. Migrate CSV data to KV storage:
```bash
npm run migrate-kv
npm run kv:upload
```

4. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

5. Register Discord commands:
```bash
npm run register-commands
```

The worker will be deployed to: `https://stfc-lookup.your-subdomain.workers.dev`

## System Data

The bot now uses Cloudflare KV storage for system lookups, migrated from the original CSV file (`system-data.csv`). The data format is:

```csv
System Name,System ID,Level,Warp Range,Warp Range (Superhighway),Faction ID
Nidox,73559,30,1,1,-1
Alpha Centauri,12345,35,2,1,2064723306
```

### Adding New Systems

1. Add new systems to `system-data.csv`
2. Run the migration script: `npm run migrate-kv`
3. Upload to KV: `npm run kv:upload`
4. The changes will be available immediately (no redeploy needed)

### KV Storage Structure

- `system:{systemId}` - Individual system data as JSON
- `system:index` - Array of all system IDs for bulk operations

## API Reference

### Endpoints

- `POST /discord` - Discord interactions webhook
- `GET /lookup?message=<coordinate_link>` - Direct lookup (GET)
- `POST /lookup` - Direct lookup (POST with JSON body)
- `POST /table` - Generate ASCII table from CSV data
- `GET /factions` - Show current faction ID mappings
- `GET /systems` - Show loaded systems (debugging)
- `GET /debug?message=<coordinate_link>` - Debug coordinate parsing

### Table Generation API

Generate ASCII tables from CSV data:

```bash
curl -X POST https://your-worker.workers.dev/table \
  -H "Content-Type: application/json" \
  -d '{"csv": "Name,Age,City\nJohn,25,New York\nJane,30,San Francisco"}'
```

### Response Format

```json
{
  "result": "ASCII table string or error message"
}
```

### Discord Slash Commands

- `/lookup <coordinates>` - Lookup STFC coordinate information
- `/table <csv_data>` - Generate ASCII table from CSV data

## Configuration

### Environment Variables

- `DISCORD_PUBLIC_KEY` - Discord application public key (Cloudflare secret)
- `ENVIRONMENT` - Development/production environment indicator

### Wrangler Configuration

Key settings in `wrangler.jsonc`:
- `name`: Worker name
- `main`: Entry point (`src/index.ts`)
- `compatibility_date`: Worker runtime version
- `vars`: Environment variables

## Development Notes

### Architecture

- **Stateless Design**: Perfect for serverless environment
- **TypeScript**: Full type safety with Cloudflare Workers types
- **Discord Interactions**: Webhook-based for better performance than gateway
- **Error Handling**: Graceful fallbacks and user-friendly error messages

### Performance Considerations

- Cold start optimization
- Response time under Discord's 3-second limit
- Memory-efficient system data lookup
- Minimal dependencies for faster execution

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run dev`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues related to:
- **Bot functionality**: Create an issue in this repository
- **STFC game data**: Check system-data.csv for accuracy
- **Discord integration**: Verify webhook configuration
- **Cloudflare Workers**: Check Wrangler configuration and deployment logs
