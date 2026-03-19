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
  assert.equal(families.length, 8);
  assert.ok(families.some(skill => skill.id === 'addition_subtraction'));
  assert.ok(families.some(skill => skill.id === 'missing_value_equations'));
  assert.ok(families.some(skill => skill.id === 'fractions'));
  assert.ok(families.some(skill => skill.id === 'decimals'));
  assert.ok(families.some(skill => skill.id === 'order_of_operations'));
  assert.ok(families.some(skill => skill.id === 'exponents'));
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

test('generates fraction equations with like denominators', () => {
  const equation = generateEquation({
    skill: 'fractions',
    difficulty: 'easy',
    random: sequenceRandom([0.3, 0.3, 0.2, 0.4, 0.5, 0.6, 0.7]),
  });

  assert.ok(equation.prompt.includes('/'));
  assert.equal(equation.representation, 'fraction_bar');
  assert.ok(equation.tags.includes('fractions'));
  assert.equal(equation.distractors.length, 3);
});

test('generates decimal equations', () => {
  const equation = generateEquation({
    skill: 'decimals',
    difficulty: 'easy',
    random: sequenceRandom([0.5, 0.3, 0.8, 0.4, 0.1, 0.6]),
  });

  assert.ok(equation.prompt.includes('.'));
  assert.ok(equation.tags.includes('decimals'));
  assert.equal(equation.distractors.length, 3);
});

test('generates order of operations equations', () => {
  const equation = generateEquation({
    skill: 'order_of_operations',
    difficulty: 'easy',
    random: sequenceRandom([0.3, 0.4, 0.5, 0.6, 0.7, 0.8]),
  });

  assert.ok(equation.prompt.includes('×'));
  assert.ok(equation.prompt.includes('+'));
  assert.equal(equation.difficulty.label, 'easy');
  assert.equal(equation.distractors.length, 3);
});

test('generates exponent equations', () => {
  const equation = generateEquation({
    skill: 'exponents',
    difficulty: 'easy',
    random: sequenceRandom([0.3, 0.5, 0.4, 0.6, 0.7]),
  });

  assert.ok(equation.prompt.includes('²'));
  assert.ok(equation.tags.includes('exponents'));
  assert.equal(equation.distractors.length, 3);
});

test('generates hard order of operations with exponents', () => {
  const equation = generateEquation({
    skill: 'order_of_operations',
    difficulty: 'hard',
    random: sequenceRandom([0.3, 0.2, 0.5, 0.6, 0.7, 0.8]),
  });

  assert.ok(equation.prompt.includes('^'));
  assert.ok(equation.subskill === 'pemdas_exponents_mixed');
});

test('throws on unsupported skills', () => {
  assert.throws(() => generateEquation({ skill: 'imaginary_skill' }), /Unsupported or missing skill/);
});
