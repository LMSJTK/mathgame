import test from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '../src/shared/createId.js';
import { generateEquation } from '../src/math/equationEngine.js';

test('createId works without node-specific APIs', () => {
  const id = createId('equation');
  assert.match(id, /equation|[a-f0-9-]{8,}/i);
});

test('equation generation still returns unique ids and browser-safe payloads', () => {
  const first = generateEquation({ skill: 'missing_value_equations', difficulty: 'easy' });
  const second = generateEquation({ skill: 'multiplication_division', difficulty: 'medium' });

  assert.notEqual(first.id, second.id);
  assert.equal(typeof first.prompt, 'string');
  assert.equal(typeof second.prompt, 'string');
  assert.equal(Array.isArray(first.hintSteps), true);
  assert.equal(Array.isArray(second.distractors), true);
});
