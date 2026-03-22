import type { Level } from '../types/level.ts';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

/** Validate a level and return any issues found. */
export function validateLevel(level: Level): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Must have a name
  if (!level.name || level.name.trim() === '' || level.name === 'Untitled Level') {
    issues.push({ severity: 'warning', message: 'Level has no custom name.' });
  }

  // Must have a player spawn
  const spawns = level.entities.filter(e => e.type === 'player_spawn');
  if (spawns.length === 0) {
    issues.push({ severity: 'error', message: 'No player_spawn entity. Players need a starting position.' });
  }
  if (spawns.length > 1) {
    issues.push({ severity: 'warning', message: `Multiple player_spawn entities (${spawns.length}). Only one is expected.` });
  }

  // Should have an exit
  const exits = level.entities.filter(e => e.type === 'exit');
  if (exits.length === 0) {
    issues.push({ severity: 'warning', message: 'No exit entity. Players cannot complete the level.' });
  }

  // Equation zones should reference a valid encounter
  const encounterIds = new Set(level.mathEncounters.map(e => e.id));
  level.entities.filter(e => e.type === 'equation_zone').forEach(ez => {
    const encId = ez.properties?.encounterId as string | undefined;
    if (!encId || encId === '') {
      issues.push({ severity: 'warning', message: `Equation zone "${ez.id}" has no linked encounter.` });
    } else if (!encounterIds.has(encId)) {
      issues.push({ severity: 'error', message: `Equation zone "${ez.id}" references non-existent encounter "${encId}".` });
    }
  });

  // Encounters with linkedEntityId should point to an existing entity
  const entityIds = new Set(level.entities.map(e => e.id));
  level.mathEncounters.forEach(enc => {
    if (enc.linkedEntityId && !entityIds.has(enc.linkedEntityId)) {
      issues.push({ severity: 'error', message: `Encounter "${enc.id}" links to non-existent entity "${enc.linkedEntityId}".` });
    }
  });

  // Triggers referencing play_dialogue should point to an existing dialogue
  const dialogueIds = new Set((level.dialogue ?? []).map(d => d.id));
  (level.triggers ?? []).forEach(trigger => {
    trigger.actions.forEach(action => {
      if (action.type === 'play_dialogue') {
        const dlgId = action.params?.dialogueId as string | undefined;
        if (dlgId && !dialogueIds.has(dlgId)) {
          issues.push({ severity: 'error', message: `Trigger "${trigger.id}" references non-existent dialogue "${dlgId}".` });
        }
      }
      if (action.type === 'start_encounter') {
        const encId = action.params?.encounterId as string | undefined;
        if (encId && !encounterIds.has(encId)) {
          issues.push({ severity: 'error', message: `Trigger "${trigger.id}" references non-existent encounter "${encId}".` });
        }
      }
    });
  });

  // Entities out of bounds
  const worldW = level.scene.width * level.scene.tileSize;
  const worldH = level.scene.height * level.scene.tileSize;
  level.entities.forEach(e => {
    if (e.x < 0 || e.x > worldW || e.y < 0 || e.y > worldH) {
      issues.push({ severity: 'warning', message: `Entity "${e.id}" is outside the level bounds.` });
    }
  });

  // Tiles out of bounds
  level.physicsTiles.forEach((t, i) => {
    if (t.x < 0 || t.x + t.w > worldW || t.y < 0 || t.y + t.h > worldH) {
      issues.push({ severity: 'warning', message: `Tile #${i} (${t.type} at ${t.x},${t.y}) is outside the level bounds.` });
    }
  });

  // No encounters at all
  if (level.mathEncounters.length === 0) {
    issues.push({ severity: 'warning', message: 'No math encounters defined. This is a math game!' });
  }

  return issues;
}
