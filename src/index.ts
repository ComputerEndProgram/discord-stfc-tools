import { verifyKey } from 'discord-interactions';
import { generateAsciiTable, parseCSV, autoGenerateColumns, type TableColumn, type TableData } from './tableUtils';

interface CoordinateMatch {
	alliance: string;
	player: string;
	systemId: string;
	x: string;
	y: string;
}

export interface SystemData {
	systemName: string;
	systemId: string;
	level: string;
	warpRange: string;
	warpRangeSH: string;
	factionId: string;
}

// Faction ID mapping - update these names as needed based on STFC factions
const FACTION_NAMES: Record<string, string> = {
	'-1': 'Neutral',
	'669838839': 'Romulan',     // Educated guess - adjust as needed
	'1306860549': 'Augment Exile',       // Educated guess - adjust as needed
	'1530685377': 'Dominion',       // Educated guess - adjust as needed
	'2064723306': 'Federation',    // Educated guess - adjust as needed
	'2113010081': 'Augment',       // Update with correct faction name
	'2143656960': 'Rogue',       // Update with correct faction name
	'2796195869': 'Texas-Class',       // Update with correct faction name
	'3292196998': 'Transogen',       // Update with correct faction name
	'3522167047': 'Krenim Imperium',       // Update with correct faction name
	'4138978039': 'Ex-Borg',       // Update with correct faction name
	'4153667145': 'Klingon',       // Educated guess - adjust as needed
};

// Load system data from KV storage
async function loadSystemData(env: Env): Promise<SystemData[]> {
	try {
		const systemIds = await env.SYSTEM_DATA.get('system:index');
		if (!systemIds) {
			console.error('No system index found in KV');
			return [];
		}
		
		const ids = JSON.parse(systemIds) as string[];
		const systems: SystemData[] = [];
		
		// Batch load systems (KV supports bulk operations)
		for (const id of ids) {
			const systemData = await env.SYSTEM_DATA.get(`system:${id}`);
			if (systemData) {
				systems.push(JSON.parse(systemData) as SystemData);
			}
		}
		
		return systems;
	} catch (error) {
		console.error('Error loading system data from KV:', error);
		return [];
	}
}

async function lookupSystemData(systemId: string, env: Env): Promise<SystemData | null> {
	try {
		const systemData = await env.SYSTEM_DATA.get(`system:${systemId}`);
		if (!systemData) {
			return null;
		}
		return JSON.parse(systemData) as SystemData;
	} catch (error) {
		console.error('Error looking up system data:', error);
		return null;
	}
}

function parseCoordinateLink(text: string): CoordinateMatch | null {
	// More flexible pattern to match various STFC coordinate formats
	// Matches: [[ALLIANCE] Player S:12345 X:123.456 Y:789.012]
	// Also handles variations with different spacing and negative coordinates
	const pattern = /\[\[([^\]]+)\]\s*([^S]+?)\s*S:(\d+)\s*X:([-\d.]+)\s*Y:([-\d.]+)\]/;
	const match = text.match(pattern);
	
	if (!match) {
		// Try alternative pattern without double brackets
		const altPattern = /\[([^\]]+)\]\s*([^S]+?)\s*S:(\d+)\s*X:([-\d.]+)\s*Y:([-\d.]+)\]/;
		const altMatch = text.match(altPattern);
		
		if (!altMatch) return null;
		
		return {
			alliance: altMatch[1].trim(),
			player: altMatch[2].trim(),
			systemId: altMatch[3],
			x: altMatch[4],
			y: altMatch[5]
		};
	}
	
	return {
		alliance: match[1].trim(),
		player: match[2].trim(),
		systemId: match[3],
		x: match[4],
		y: match[5]
	};
}

function parseMultipleCoordinates(text: string): CoordinateMatch[] {
	// Pattern to find all coordinate links in text
	const pattern = /\[\[([^\]]+)\]\s*([^S]+?)\s*S:(\d+)\s*X:([-\d.]+)\s*Y:([-\d.]+)\]/g;
	const matches: CoordinateMatch[] = [];
	let match;
	
	while ((match = pattern.exec(text)) !== null) {
		matches.push({
			alliance: match[1].trim(),
			player: match[2].trim(),
			systemId: match[3],
			x: match[4],
			y: match[5]
		});
	}
	
	return matches;
}

function getFactionName(factionId: string): string {
	return FACTION_NAMES[factionId] || `Unknown (${factionId})`;
}

function formatTable(alliance: string, player: string, systemData: SystemData): string {
	const factionName = getFactionName(systemData.factionId);
	
	// Ensure proper padding for table alignment
	const alliancePadded = alliance.padEnd(4).substring(0, 4);
	const systemPadded = systemData.systemName.padEnd(8).substring(0, 8);
	const warpPadded = systemData.warpRange.padStart(4).substring(0, 4);
	const warpSHPadded = systemData.warpRangeSH.padStart(4).substring(0, 4);
	const factionPadded = factionName.padEnd(9).substring(0, 9);
	const playerPadded = player.padEnd(15).substring(0, 15);
	
	return `| ${alliancePadded} | ${systemPadded} | ${warpPadded} | ${warpSHPadded} | ${factionPadded} | ${playerPadded} |`;
}

function formatMultipleResults(results: Array<{ coordinate: CoordinateMatch, systemData: SystemData | null }>): string {
	if (results.length === 0) {
		return 'No valid coordinate links found in the message.';
	}

	const header = `
\`\`\`
+------+----------+------+------+-----------+-----------------+
| Ally | System   | Warp | W-SH | Faction   | Player          |
+------+----------+------+------+-----------+-----------------+`;

	const footer = `+------+----------+------+------+-----------+-----------------+
\`\`\``;

	const rows = results.map(result => {
		if (!result.systemData) {
			const alliancePadded = result.coordinate.alliance.padEnd(4).substring(0, 4);
			const playerPadded = result.coordinate.player.padEnd(15).substring(0, 15);
			const systemIdPadded = result.coordinate.systemId.padEnd(8).substring(0, 8);
			return `| ${alliancePadded} | ${systemIdPadded} | ???? | ???? | Not Found | ${playerPadded} |`;
		}
		return formatTable(result.coordinate.alliance, result.coordinate.player, result.systemData);
	});

	return header + '\n' + rows.join('\n') + '\n' + footer;
}

async function handleDiscordInteraction(request: Request, env: Env): Promise<Response> {
	const signature = request.headers.get('X-Signature-Ed25519');
	const timestamp = request.headers.get('X-Signature-Timestamp');
	const body = await request.text();

	if (!signature || !timestamp || !env.DISCORD_PUBLIC_KEY) {
		return new Response('Unauthorized', { status: 401 });
	}

	const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
	if (!isValidRequest) {
		return new Response('Invalid signature', { status: 401 });
	}

	const interaction = JSON.parse(body);

	// Handle Discord ping
	if (interaction.type === 1) {
		return Response.json({ type: 1 });
	}

	// Handle application commands
	if (interaction.type === 2) {
		const { data } = interaction;
		
		if (data.name === 'lookup') {
			const coordinateLink = data.options?.[0]?.value;
			
			if (!coordinateLink) {
				return Response.json({
					type: 4,
					data: {
						content: 'Please provide a coordinate link to lookup.',
						flags: 64 // Ephemeral
					}
				});
			}

			const parsed = parseCoordinateLink(coordinateLink);
			const coordinates = parseMultipleCoordinates(coordinateLink);
			
			if (coordinates.length === 0 && !parsed) {
				return Response.json({
					type: 4,
					data: {
						content: 'Invalid coordinate format. Expected format: [[ALLIANCE] Player S:12345 X:123.456 Y:789.012]',
						flags: 64
					}
				});
			}

			const result = await handleMessageParsing(coordinateLink, env);
			
			return Response.json({
				type: 4,
				data: {
					content: result
				}
			});
		}

		if (data.name === 'table') {
			const csvInput = data.options?.[0]?.value;
			
			if (!csvInput) {
				return Response.json({
					type: 4,
					data: {
						content: 'Please provide CSV data to generate a table.',
						flags: 64 // Ephemeral
					}
				});
			}

			try {
				const tableData = parseCSV(csvInput);
				const columns = autoGenerateColumns(tableData);
				const asciiTable = generateAsciiTable(tableData, columns);
				
				// Discord has a 2000 character limit for messages
				if (asciiTable.length > 1900) {
					return Response.json({
						type: 4,
						data: {
							content: 'Table is too large to display. Please reduce the amount of data or column widths.',
							flags: 64
						}
					});
				}

				return Response.json({
					type: 4,
					data: {
						content: '```\n' + asciiTable + '\n```'
					}
				});
			} catch (error) {
				return Response.json({
					type: 4,
					data: {
						content: `Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
						flags: 64
					}
				});
			}
		}
	}

	return new Response('Unknown interaction', { status: 400 });
}

async function handleMessageParsing(message: string, env: Env): Promise<string> {
	const coordinates = parseMultipleCoordinates(message);
	
	if (coordinates.length === 0) {
		const singleCoordinate = parseCoordinateLink(message);
		if (!singleCoordinate) {
			return 'No valid coordinate links found in the message.';
		}
		coordinates.push(singleCoordinate);
	}

	// Lookup system data for each coordinate
	const results = await Promise.all(
		coordinates.map(async (coordinate) => ({
			coordinate,
			systemData: await lookupSystemData(coordinate.systemId, env)
		}))
	);

	// If multiple results, use the multi-table format
	if (results.length > 1) {
		return formatMultipleResults(results);
	}

	// Single result - use original format
	const result = results[0];
	if (!result.systemData) {
		return `System ${result.coordinate.systemId} not found in database.`;
	}

	const factionName = getFactionName(result.systemData.factionId);
	
	// Ensure proper padding for table alignment
	const alliancePadded = result.coordinate.alliance.padEnd(4).substring(0, 4);
	const systemPadded = result.systemData.systemName.padEnd(8).substring(0, 8);
	const warpPadded = result.systemData.warpRange.padStart(4).substring(0, 4);
	const warpSHPadded = result.systemData.warpRangeSH.padStart(4).substring(0, 4);
	const factionPadded = factionName.padEnd(9).substring(0, 9);
	const playerPadded = result.coordinate.player.padEnd(15).substring(0, 15);
	
	const table = `
\`\`\`
+------+----------+------+------+-----------+-----------------+
| Ally | System   | Warp | W-SH | Faction   | Player          |
+------+----------+------+------+-----------+-----------------+
| ${alliancePadded} | ${systemPadded} | ${warpPadded} | ${warpSHPadded} | ${factionPadded} | ${playerPadded} |
+------+----------+------+------+-----------+-----------------+
\`\`\`
	`.trim();
	
	return table;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		
		// Handle Discord interactions webhook
		if (url.pathname === '/discord' && request.method === 'POST') {
			return handleDiscordInteraction(request, env);
		}
		
		// Handle direct API calls for testing
		if (url.pathname === '/lookup' && request.method === 'POST') {
			const body = await request.json() as { message: string };
			const result = await handleMessageParsing(body.message, env);
			
			return Response.json({ result });
		}

		// Handle GET request for testing
		if (url.pathname === '/lookup' && request.method === 'GET') {
			const message = url.searchParams.get('message');
			if (!message) {
				return new Response('Missing message parameter', { status: 400 });
			}
			
			const result = await handleMessageParsing(message, env);
			return new Response(result, { 
				headers: { 'Content-Type': 'text/plain' }
			});
		}

		// Table generation endpoint for testing
		if (url.pathname === '/table' && request.method === 'POST') {
			try {
				const body = await request.json() as { csv: string };
				const tableData = parseCSV(body.csv);
				const columns = autoGenerateColumns(tableData);
				const asciiTable = generateAsciiTable(tableData, columns);
				
				return new Response(asciiTable, {
					headers: { 'Content-Type': 'text/plain' }
				});
			} catch (error) {
				return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
					status: 400,
					headers: { 'Content-Type': 'text/plain' }
				});
			}
		}

		// Debug endpoint to test coordinate parsing
		if (url.pathname === '/debug' && request.method === 'GET') {
			const message = url.searchParams.get('message');
			if (!message) {
				return new Response('Missing message parameter', { status: 400 });
			}
			
			const parsed = parseCoordinateLink(message);
			const multiple = parseMultipleCoordinates(message);
			const debugInfo = {
				input: message,
				singleParsed: parsed,
				multipleParsed: multiple,
				count: multiple.length,
				isValid: parsed !== null || multiple.length > 0,
				patterns: {
					main: /\[\[([^\]]+)\]\s*([^S]+?)\s*S:(\d+)\s*X:([-\d.]+)\s*Y:([-\d.]+)\]/.test(message),
					alternative: /\[([^\]]+)\]\s*([^S]+?)\s*S:(\d+)\s*X:([-\d.]+)\s*Y:([-\d.]+)\]/.test(message)
				}
			};
			
			return Response.json(debugInfo, { 
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Debug endpoint to show faction mappings
		if (url.pathname === '/factions' && request.method === 'GET') {
			const factionList = Object.entries(FACTION_NAMES)
				.map(([id, name]) => `${id}: ${name}`)
				.join('\n');
			
			return new Response(`Current Faction Mappings:\n${factionList}`, {
				headers: { 'Content-Type': 'text/plain' }
			});
		}

		// KV management endpoint for loading all systems (for debugging)
		if (url.pathname === '/systems' && request.method === 'GET') {
			try {
				const systems = await loadSystemData(env);
				return Response.json({ 
					count: systems.length,
					systems: systems.slice(0, 10) // Show first 10 as sample
				});
			} catch (error) {
				return Response.json({ 
					error: error instanceof Error ? error.message : 'Unknown error' 
				}, { status: 500 });
			}
		}

		// Default response
		return new Response(`
STFC Coordinate Lookup Bot

Endpoints:
- POST /discord - Discord interactions webhook
- POST /lookup - Direct lookup API (JSON: {"message": "coordinate_link"})
- GET /lookup?message=coordinate_link - Direct lookup API
- POST /table - Generate ASCII table from CSV (JSON: {"csv": "header1,header2\\nvalue1,value2"})
- GET /factions - Show current faction ID mappings
- GET /systems - Show loaded systems (first 10)

Example coordinate format: [[RONE] RogueOneAdmiral S:73559 X:628.7432 Y:43.3874]

Discord Commands:
- /lookup <coordinates> - Lookup STFC coordinate information
- /table <csv_data> - Generate ASCII table from CSV data

Faction IDs found in database:
${Object.entries(FACTION_NAMES).map(([id, name]) => `- ${id}: ${name}`).join('\n')}
		`, { 
			headers: { 'Content-Type': 'text/plain' }
		});
	},
} satisfies ExportedHandler<Env>;
