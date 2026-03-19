import { createId } from '../shared/createId.js';
import { DIFFICULTY_PRESETS, SKILL_FAMILIES } from './skillDefinitions.js';

function randomInt(min, max, random = Math.random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function unique(values) {
  return [...new Set(values)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function asDifficultyLabel(difficulty) {
  if (!DIFFICULTY_PRESETS[difficulty]) {
    throw new Error(`Unsupported difficulty preset: ${difficulty}`);
  }
  return difficulty;
}

function createDifficultyBreakdown({
  operandCount,
  maxMagnitude,
  hasNegative = false,
  representation = 'numeric',
  skill,
  difficulty,
}) {
  const conceptualComplexity = clamp(
    skill === 'missing_value_equations' ? 3 + operandCount : 1 + operandCount,
    1,
    10,
  );
  const arithmeticLoad = clamp(operandCount + Math.ceil(maxMagnitude / 10), 1, 10);
  const numberMagnitude = clamp(Math.ceil(maxMagnitude / 5), 1, 10);
  const representationComplexity = clamp(representation === 'numeric' ? 2 : 4, 1, 10);
  const timePressureScore = clamp(
    arithmeticLoad + (difficulty === 'hard' ? 2 : difficulty === 'medium' ? 1 : 0),
    1,
    10,
  );
  const motorCoordinationPressure = clamp(
    difficulty === 'hard' ? 6 : difficulty === 'medium' ? 4 : 2,
    1,
    10,
  );

  return {
    label: difficulty,
    conceptualComplexity: conceptualComplexity + (hasNegative ? 1 : 0),
    arithmeticLoad,
    numberMagnitude,
    representationComplexity,
    timePressureScore,
    motorCoordinationPressure,
  };
}

function buildDistractors(answer, random = Math.random) {
  const offsets = unique([
    -3,
    -2,
    -1,
    1,
    2,
    3,
    randomInt(-5, 5, random),
    randomInt(-10, 10, random),
  ]).filter(offset => offset !== 0);

  const distractors = [];
  for (const offset of offsets) {
    const candidate = answer + offset;
    if (candidate !== answer && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
    if (distractors.length === 3) break;
  }

  while (distractors.length < 3) {
    const fallback = answer + randomInt(-10, 10, random) || answer + 4;
    if (fallback !== answer && !distractors.includes(fallback)) {
      distractors.push(fallback);
    }
  }

  return distractors;
}

function additionSubtractionGenerator(difficulty, random) {
  const preset = DIFFICULTY_PRESETS[difficulty];
  const operandCount = difficulty === 'easy' ? 2 : 3;
  const [min, max] = preset.numberRange;
  const operands = Array.from({ length: operandCount }, () => randomInt(Math.max(min, 0), max, random));
  const operators = Array.from({ length: operandCount - 1 }, (_, index) => (
    difficulty === 'easy' || index === 0 ? '+' : random() > 0.5 ? '+' : '-'
  ));

  let answer = operands[0];
  for (let i = 0; i < operators.length; i += 1) {
    answer = operators[i] === '+' ? answer + operands[i + 1] : answer - operands[i + 1];
  }

  return {
    prompt: operands.map((operand, index) => (index === 0 ? `${operand}` : `${operators[index - 1]} ${operand}`)).join(' ') + ' = ?',
    canonicalAnswer: answer,
    hintSteps: [
      'Start from the first number.',
      'Work left to right and apply each operation one step at a time.',
      'Check whether subtraction changed the total by moving backward on the number line.',
    ],
    metadata: { operands, operators },
    representation: 'numeric',
    operandCount,
    maxMagnitude: Math.max(...operands.map(value => Math.abs(value)), Math.abs(answer)),
    hasNegative: answer < 0,
    tags: ['arithmetic', 'fact-fluency'],
    subskill: difficulty === 'easy' ? 'two_operand_arithmetic' : 'multi_operand_arithmetic',
  };
}

function multiplicationDivisionGenerator(difficulty, random) {
  const factorA = randomInt(2, difficulty === 'easy' ? 6 : 12, random);
  const factorB = randomInt(2, difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 12, random);
  const useDivision = difficulty !== 'easy' && random() > 0.5;
  const product = factorA * factorB;

  if (useDivision) {
    return {
      prompt: `${product} ÷ ${factorA} = ?`,
      canonicalAnswer: factorB,
      hintSteps: [
        'Think of division as a missing multiplication fact.',
        `Ask which number times ${factorA} equals ${product}.`,
      ],
      metadata: { dividend: product, divisor: factorA },
      representation: 'numeric',
      operandCount: 2,
      maxMagnitude: product,
      hasNegative: false,
      tags: ['arithmetic', 'fact-fluency'],
      subskill: 'division_fact_recall',
    };
  }

  return {
    prompt: `${factorA} × ${factorB} = ?`,
    canonicalAnswer: product,
    hintSteps: [
      'Break the multiplication fact into groups or repeated addition.',
      'Use any known fact family to double-check the result.',
    ],
    metadata: { factors: [factorA, factorB] },
    representation: 'numeric',
    operandCount: 2,
    maxMagnitude: product,
    hasNegative: false,
    tags: ['arithmetic', 'fact-fluency'],
    subskill: 'multiplication_fact_recall',
  };
}

function signedIntegerGenerator(difficulty, random) {
  const start = randomInt(-12, difficulty === 'hard' ? 20 : 12, random);
  const delta = randomInt(-12, 12, random);
  const answer = start + delta;
  const deltaText = delta >= 0 ? `+ ${delta}` : `- ${Math.abs(delta)}`;

  return {
    prompt: `${start} ${deltaText} = ?`,
    canonicalAnswer: answer,
    hintSteps: [
      'Use a number line mentally.',
      'A positive number moves right; a negative number moves left.',
      'Count the magnitude of the move, then check the final position.',
    ],
    metadata: { start, delta },
    representation: 'number_line',
    operandCount: 2,
    maxMagnitude: Math.max(Math.abs(start), Math.abs(delta), Math.abs(answer)),
    hasNegative: start < 0 || delta < 0 || answer < 0,
    tags: ['pre-algebra', 'integer-sense'],
    subskill: difficulty === 'hard' ? 'signed_integer_mixed' : 'signed_integer_addition',
  };
}

function missingValueGenerator(difficulty, random) {
  const a = randomInt(2, difficulty === 'easy' ? 10 : 20, random);
  const b = randomInt(2, difficulty === 'easy' ? 10 : 20, random);
  const mode = difficulty === 'hard' && random() > 0.4 ? 'subtraction' : 'addition';

  if (mode === 'subtraction') {
    const total = a + b;
    return {
      prompt: `□ - ${a} = ${b}`,
      canonicalAnswer: total,
      hintSteps: [
        'Undo subtraction by adding the known pieces back together.',
        `Add ${a} and ${b} to find the missing starting value.`,
      ],
      metadata: { operator: '-', knownOperand: a, result: b },
      representation: 'balance-model',
      operandCount: 3,
      maxMagnitude: total,
      hasNegative: false,
      tags: ['pre-algebra', 'equations'],
      subskill: 'missing_start_value',
    };
  }

  const answer = difficulty === 'easy' ? a : random() > 0.5 ? a : b;
  const total = a + b;
  const hiddenOnLeft = answer === a;

  return {
    prompt: hiddenOnLeft ? `□ + ${b} = ${total}` : `${a} + □ = ${total}`,
    canonicalAnswer: answer,
    hintSteps: [
      'Think about the related fact family.',
      `Subtract the known addend from ${total} to find the missing value.`,
    ],
    metadata: { addends: [a, b], total, hiddenOnLeft },
    representation: 'balance-model',
    operandCount: 3,
    maxMagnitude: total,
    hasNegative: false,
    tags: ['pre-algebra', 'equations'],
    subskill: 'missing_addend',
  };
}

const GENERATORS = {
  addition_subtraction: additionSubtractionGenerator,
  multiplication_division: multiplicationDivisionGenerator,
  signed_integers: signedIntegerGenerator,
  missing_value_equations: missingValueGenerator,
};

export function listSkillFamilies() {
  return Object.entries(SKILL_FAMILIES).map(([id, value]) => ({ id, ...value }));
}

export function generateEquation({ skill, difficulty = 'easy', random = Math.random } = {}) {
  if (!skill || !GENERATORS[skill]) {
    throw new Error(`Unsupported or missing skill: ${skill}`);
  }

  const difficultyLabel = asDifficultyLabel(difficulty);
  const generated = GENERATORS[skill](difficultyLabel, random);
  const difficultyBreakdown = createDifficultyBreakdown({
    ...generated,
    skill,
    difficulty: difficultyLabel,
  });

  return {
    id: createId('equation'),
    skill,
    subskill: generated.subskill,
    prompt: generated.prompt,
    canonicalAnswer: generated.canonicalAnswer,
    alternateValidAnswers: [],
    distractors: buildDistractors(generated.canonicalAnswer, random),
    difficulty: difficultyBreakdown,
    timePressureScore: difficultyBreakdown.timePressureScore,
    workingMemoryScore: clamp(generated.operandCount + (generated.hasNegative ? 2 : 0), 1, 10),
    representation: generated.representation,
    hintSteps: generated.hintSteps,
    tags: unique([...SKILL_FAMILIES[skill].tags, ...generated.tags, difficultyLabel]),
    metadata: generated.metadata,
  };
}

export function createMathEncounterTemplate({
  encounterType,
  skill,
  difficulty = 'easy',
  successTarget = 1,
  failureLimit = 3,
} = {}) {
  return {
    id: createId('equation'),
    encounterType,
    skill,
    difficulty,
    successTarget,
    failureLimit,
    reward: {
      type: 'progress',
      amount: 1,
    },
    remediation: {
      onFailure: 'show_hint_then_retry',
    },
  };
}
