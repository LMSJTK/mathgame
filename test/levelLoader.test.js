import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLevel } from '../src/runtime/engine/levelLoader.js';

test('validates a well-formed level', () => {
  const level = {
    id: 'test-01',
    name: 'Test Level',
    scene: { width: 40, height: 20, tileSize: 32 },
    physicsTiles: [{ x: 0, y: 608, w: 1280, h: 32, type: 'solid' }],
    entities: [
      { id: 'spawn', type: 'player_spawn', x: 64, y: 576 },
    ],
    mathEncounters: [],
    triggers: [],
    dialogue: [],
  };

  const result = validateLevel(level);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('rejects level missing player_spawn', () => {
  const level = {
    id: 'test-02',
    name: 'No Spawn',
    scene: { width: 40, height: 20, tileSize: 32 },
    physicsTiles: [],
    entities: [],
  };

  const result = validateLevel(level);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('player_spawn')));
});

test('rejects level missing required fields', () => {
  const result = validateLevel({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('level id')));
  assert.ok(result.errors.some(e => e.includes('scene')));
});

test('detects orphaned encounter references', () => {
  const level = {
    id: 'test-03',
    name: 'Orphan Ref',
    scene: { width: 40, height: 20, tileSize: 32 },
    physicsTiles: [],
    entities: [
      { id: 'spawn', type: 'player_spawn', x: 64, y: 576 },
      { id: 'zone1', type: 'equation_zone', x: 200, y: 400, properties: { encounterId: 'missing_enc' } },
    ],
    mathEncounters: [],
  };

  const result = validateLevel(level);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('missing_enc')));
});

test('detects orphaned dialogue references in triggers', () => {
  const level = {
    id: 'test-04',
    name: 'Orphan Dialogue',
    scene: { width: 40, height: 20, tileSize: 32 },
    physicsTiles: [],
    entities: [
      { id: 'spawn', type: 'player_spawn', x: 64, y: 576 },
    ],
    mathEncounters: [],
    triggers: [
      {
        id: 'trig1',
        condition: { type: 'on_level_start' },
        actions: [{ type: 'play_dialogue', params: { dialogueId: 'missing_dlg' } }],
        once: true,
      },
    ],
    dialogue: [],
  };

  const result = validateLevel(level);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('missing_dlg')));
});

test('validates the demo-level-01 JSON structure', async () => {
  const { readFile } = await import('node:fs/promises');
  const raw = await readFile(new URL('../content/levels/demo-level-01.json', import.meta.url), 'utf-8');
  const level = JSON.parse(raw);

  const result = validateLevel(level);
  assert.equal(result.valid, true, `Validation errors: ${result.errors.join(', ')}`);
});

test('validates the logic-tower-01 JSON structure', async () => {
  const { readFile } = await import('node:fs/promises');
  const raw = await readFile(new URL('../content/levels/logic-tower-01.json', import.meta.url), 'utf-8');
  const level = JSON.parse(raw);

  const result = validateLevel(level);
  assert.equal(result.valid, true, `Validation errors: ${result.errors.join(', ')}`);

  // Verify it uses the new encounter types
  const types = level.mathEncounters.map(e => e.encounterType);
  assert.ok(types.includes('bridge_build'), 'Should have bridge_build encounter');
  assert.ok(types.includes('route_logic'), 'Should have route_logic encounter');
  assert.ok(types.includes('sequence_repair'), 'Should have sequence_repair encounter');
  assert.ok(types.includes('gate_unlock'), 'Should have gate_unlock encounter');
});
