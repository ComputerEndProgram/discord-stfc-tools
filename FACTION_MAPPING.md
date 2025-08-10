# STFC Faction ID Mapping

This file contains all the unique faction IDs found in your system-data.csv file. Please update the faction names in `src/index.ts` in the `FACTION_NAMES` object to match the correct STFC faction names.

## Current Faction ID Counts:

| Faction ID | System Count | Current Name    | Update     |
+------------+--------------+-----------------+------------|
| -1         | 1394 systems | Neutral         | Correct    |
| 669838839  | 162 systems  | Romulan         | Correct    |
| 1306860549 | 31 systems   | Augment Exiles  | Correct    |
| 1530685377 | 29 systems   | Dominion        | Correct    |
| 2064723306 | 145 systems  | Federation      | Correct    |
| 2113010081 | 16 systems   | Augment         | Correct    |
| 2143656960 | 11 systems   | Rogue           | Correct    |
| 2796195869 | 14 systems   | Texas-Class     | Correct    |
| 3292196998 | 37 systems   | Transogen       | Correct    |
| 3522167047 | 39 systems   | Krenim Imperium | Correct    |
| 4138978039 | 8 systems    | Ex-Borg         | Correct    |
| 4153667145 | 156 systems  | Klingon         | Correct    |

## Instructions to Update Faction Names:

1. Open `src/index.ts`
2. Find the `FACTION_NAMES` object (around line 15)
3. Update the faction names to match actual STFC factions

Example STFC factions might include:
- Federation
- Klingon
- Romulan
- Neutral
- Borg
- Species 8472
- Hirogen
- Cardassian
- Dominion
- Augment
- etc.

## Code Location:

```typescript
const FACTION_NAMES: Record<string, string> = {
	'-1': 'Neutral',
	'669838839': 'Federation',     // ← Update this
	'1306860549': 'Klingon',       // ← Update this
	'1530685377': 'Romulan',       // ← Update this
	'2064723306': 'Federation',    // ← Update this
	'2113010081': 'Unknown',       // ← Update this
	'2143656960': 'Unknown',       // ← Update this
	'2796195869': 'Unknown',       // ← Update this
	'3292196998': 'Unknown',       // ← Update this
	'3522167047': 'Unknown',       // ← Update this
	'4138978039': 'Unknown',       // ← Update this
	'4153667145': 'Klingon',       // ← Update this
};
```

## Testing:

After updating the faction names, you can test them at:
- http://127.0.0.1:8787/factions (to see current mappings)
- http://127.0.0.1:8787/lookup?message=[[TEST] Player S:73559 X:100 Y:200] (to test a lookup)

## Next Steps:

1. **Update Faction Names** - Replace the Unknown entries with correct STFC faction names
2. **Load Real CSV Data** - The current code has sample data. You'll need to implement CSV parsing to load your actual system data
3. **Deploy** - Once tested, deploy with `npm run deploy`
