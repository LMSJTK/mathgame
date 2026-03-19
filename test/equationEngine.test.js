import test from 'node:test';
import assert from 'node:assert/strict';
import { createMathEncounterTemplate, generateEquation, listSkillFamilies } from '../src/math/equationEngine.js';

function sequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0.5;
    index += 1;
    return value;
  };
}

test('lists the supported skill families', () => {
  const families = listSkillFamilies();
  assert.equal(families.length, 4);
  assert.ok(families.some(skill => skill.id === 'addition_subtraction'));
  assert.ok(families.some(skill => skill.id === 'missing_value_equations'));
});

test('generates a deterministic addition/subtraction equation', () => {
  const equation = generateEquation({
    skill: 'addition_subtraction',
    difficulty: 'easy',
    random: sequenceRandom([0.2, 0.3, 0.8, 0.4, 0.1]),
  });

  assert.equal(equation.prompt, '2 + 3 = ?');
  assert.equal(equation.canonicalAnswer, 5);
  assert.equal(equation.difficulty.label, 'easy');
  assert.equal(equation.representation, 'numeric');
  assert.equal(equation.distractors.length, 3);
  assert.ok(equation.tags.includes('arithmetic'));
});

test('generates signed integer content with number-line representation', () => {
  const equation = generateEquation({
    skill: 'signed_integers',
    difficulty: 'medium',
    random: sequenceRandom([0.1, 0.75, 0.6, 0.9]),
  });

  assert.equal(equation.prompt, '-10 + 6 = ?');
  assert.equal(equation.canonicalAnswer, -4);
  assert.equal(equation.representation, 'number_line');
  assert.ok(equation.workingMemoryScore >= 2);
});

test('creates encounter templates for gameplay integration', () => {
  const encounter = createMathEncounterTemplate({
    encounterType: 'range_landing',
    skill: 'addition_subtraction',
    difficulty: 'medium',
    successTarget: 5,
  });

  assert.equal(encounter.encounterType, 'range_landing');
  assert.equal(encounter.skill, 'addition_subtraction');
  assert.equal(encounter.successTarget, 5);
  assert.equal(encounter.reward.type, 'progress');
});

test('throws on unsupported skills', () => {
  assert.throws(() => generateEquation({ skill: 'fractions' }), /Unsupported or missing skill/);
});
