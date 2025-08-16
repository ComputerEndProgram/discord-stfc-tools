// Ability descriptions mapping - manually curated
// This will need to be expanded as we identify more ability descriptions

export interface AbilityDescription {
  id: number;
  name: string;
  description: string;
}

// Common ability descriptions based on known STFC abilities
// These will need to be manually added as we identify them
export const ABILITY_DESCRIPTIONS: Record<number, AbilityDescription> = {
  // Add ability descriptions here as we identify them
  // Example format:
  // 123: {
  //   id: 123,
  //   name: "Ability Name",
  //   description: "What this ability does"
  // }
};

export function getAbilityDescription(locaId: number): string {
  const ability = ABILITY_DESCRIPTIONS[locaId];
  if (ability) {
    return `${ability.name}: ${ability.description}`;
  }
  return `Ability ID ${locaId} (description not available)`;
}

// Helper function to get just the ability name if we have it
export function getAbilityName(locaId: number): string {
  const ability = ABILITY_DESCRIPTIONS[locaId];
  return ability?.name || `Ability ${locaId}`;
}
