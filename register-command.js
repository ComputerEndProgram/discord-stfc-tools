// Discord slash command registration script
// Run this once to register the commands

const DISCORD_APPLICATION_ID = '1399692201428258917'; // Replace with your Discord application ID
const DISCORD_BOT_TOKEN = 'your-discord-bot-token-here'; // Replace with your Discord bot token

const commands = [
  {
    name: 'lookup',
    description: 'Look up STFC coordinate information',
    options: [
      {
        type: 3, // STRING type
        name: 'coordinates',
        description: 'STFC coordinate link to lookup (e.g., [[RONE] Player S:73559 X:628.7 Y:43.3])',
        required: true
      }
    ]
  },
  {
    name: 'table',
    description: 'Generate an ASCII table from CSV data',
    options: [
      {
        type: 3, // STRING type
        name: 'csv_data',
        description: 'CSV data with headers (e.g., "Name,Age\nJohn,25\nJane,30")',
        required: true
      }
    ]
  }
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`;
  
  for (const command of commands) {
    console.log(`Registering command: ${command.name}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully registered command:', data.name);
      console.log('Command ID:', data.id);
    } else {
      const error = await response.text();
      console.error(`❌ Failed to register command ${command.name}:`, error);
    }
  }
}

// Run the registration
registerCommands().catch(console.error);
