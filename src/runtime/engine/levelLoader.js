/**
 * Level loader — fetches level JSON from /content/levels/ and provides
 * a manifest of available levels.
 */

const LEVELS_BASE = './content/levels';

/**
 * Fetch the level manifest (list of available level files).
 * In production this would come from an index endpoint; for now we
 * maintain a static list that the build step or server could generate.
 */
export async function listLevels() {
  try {
    const res = await fetch(`${LEVELS_BASE}/index.json`);
    if (res.ok) return res.json();
  } catch {
    // Fall through to hardcoded list
  }

  // Fallback: known levels
  return [
    { id: 'demo-level-01', name: 'Number Forest', difficulty: 'easy', file: 'demo-level-01.json' },
  ];
}

/**
 * Load a single level by filename.
 */
export async function loadLevel(filename) {
  const res = await fetch(`${LEVELS_BASE}/${filename}`);
  if (!res.ok) throw new Error(`Failed to load level: ${filename} (${res.status})`);
  return res.json();
}

/**
 * Validate that a level object has the minimum required fields.
 * Returns { valid, errors }.
 */
export function validateLevel(level) {
  const errors = [];

  if (!level.id) errors.push('Missing level id');
  if (!level.name) errors.push('Missing level name');
  if (!level.scene) errors.push('Missing scene definition');
  if (!Array.isArray(level.physicsTiles)) errors.push('Missing or invalid physicsTiles array');
  if (!Array.isArray(level.entities)) errors.push('Missing or invalid entities array');

  if (level.scene) {
    if (!level.scene.width || !level.scene.height) errors.push('Scene must have width and height');
    if (!level.scene.tileSize) errors.push('Scene must have tileSize');
  }

  const hasSpawn = level.entities?.some(e => e.type === 'player_spawn');
  if (!hasSpawn) errors.push('Level must have at least one player_spawn entity');

  // Validate encounter references
  const encounterIds = new Set((level.mathEncounters || []).map(e => e.id));
  for (const ent of (level.entities || []).filter(e => e.type === 'equation_zone')) {
    const encId = ent.properties?.encounterId;
    if (encId && !encounterIds.has(encId)) {
      errors.push(`Equation zone "${ent.id}" references missing encounter "${encId}"`);
    }
  }

  // Validate dialogue references in triggers
  const dialogueIds = new Set((level.dialogue || []).map(d => d.id));
  for (const trigger of (level.triggers || [])) {
    for (const action of trigger.actions) {
      if (action.type === 'play_dialogue' && action.params?.dialogueId) {
        if (!dialogueIds.has(action.params.dialogueId)) {
          errors.push(`Trigger "${trigger.id}" references missing dialogue "${action.params.dialogueId}"`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
