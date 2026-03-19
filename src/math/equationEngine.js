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
  const isDecimal = !Number.isInteger(answer);
  const step = isDecimal ? 0.1 : 1;
  const smallRange = isDecimal ? 0.5 : 5;
  const largeRange = isDecimal ? 1.0 : 10;

  const offsets = unique([
    -3 * step,
    -2 * step,
    -1 * step,
    1 * step,
    2 * step,
    3 * step,
    randomInt(-smallRange / step, smallRange / step, random) * step,
    randomInt(-largeRange / step, largeRange / step, random) * step,
  ]).filter(offset => offset !== 0);

  const distractors = [];
  for (const offset of offsets) {
    const candidate = Math.round((answer + offset) * 1000) / 1000;
    if (candidate !== answer && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
    if (distractors.length === 3) break;
  }

  while (distractors.length < 3) {
    const offset = randomInt(-largeRange / step, largeRange / step, random) * step;
    const fallback = Math.round((answer + (offset || 4 * step)) * 1000) / 1000;
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

function fractionsGenerator(difficulty, random) {
  const maxDenom = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 12;
  const denomA = randomInt(2, maxDenom, random);
  const denomB = difficulty === 'easy' ? denomA : randomInt(2, maxDenom, random);

  const numA = randomInt(1, denomA - 1, random);
  const numB = randomInt(1, denomB - 1, random);

  if (denomA === denomB) {
    const useSubtraction = difficulty !== 'easy' && random() > 0.5 && numA > numB;
    const answerNum = useSubtraction ? numA - numB : numA + numB;
    const op = useSubtraction ? '-' : '+';
    const gcd = computeGcd(answerNum, denomA);
    const simplifiedNum = answerNum / gcd;
    const simplifiedDen = denomA / gcd;

    return {
      prompt: `${numA}/${denomA} ${op} ${numB}/${denomB} = ?`,
      canonicalAnswer: simplifiedDen === 1 ? simplifiedNum : simplifiedNum / simplifiedDen,
      displayAnswer: simplifiedDen === 1 ? `${simplifiedNum}` : `${simplifiedNum}/${simplifiedDen}`,
      hintSteps: [
        'The denominators are the same, so you can work with the numerators directly.',
        `${op === '+' ? 'Add' : 'Subtract'} the numerators: ${numA} ${op} ${numB} = ${answerNum}.`,
        answerNum !== simplifiedNum ? `Simplify: ${answerNum}/${denomA} = ${simplifiedNum}/${simplifiedDen}.` : 'Check if the fraction can be simplified.',
      ],
      metadata: { numA, denomA, numB, denomB, operator: op },
      representation: 'fraction_bar',
      operandCount: 2,
      maxMagnitude: Math.max(denomA, answerNum),
      hasNegative: false,
      tags: ['arithmetic', 'fractions'],
      subskill: useSubtraction ? 'fraction_subtraction_like_denom' : 'fraction_addition_like_denom',
    };
  }

  const lcd = lcm(denomA, denomB);
  const scaledA = numA * (lcd / denomA);
  const scaledB = numB * (lcd / denomB);
  const answerNum = scaledA + scaledB;
  const gcd = computeGcd(answerNum, lcd);
  const simplifiedNum = answerNum / gcd;
  const simplifiedDen = lcd / gcd;

  return {
    prompt: `${numA}/${denomA} + ${numB}/${denomB} = ?`,
    canonicalAnswer: simplifiedDen === 1 ? simplifiedNum : simplifiedNum / simplifiedDen,
    displayAnswer: simplifiedDen === 1 ? `${simplifiedNum}` : `${simplifiedNum}/${simplifiedDen}`,
    hintSteps: [
      `Find the least common denominator of ${denomA} and ${denomB}: it is ${lcd}.`,
      `Rewrite as ${scaledA}/${lcd} + ${scaledB}/${lcd}.`,
      `Add numerators: ${scaledA} + ${scaledB} = ${answerNum}. Simplify if possible.`,
    ],
    metadata: { numA, denomA, numB, denomB, lcd },
    representation: 'fraction_bar',
    operandCount: 2,
    maxMagnitude: lcd,
    hasNegative: false,
    tags: ['arithmetic', 'fractions'],
    subskill: 'fraction_addition_unlike_denom',
  };
}

function computeGcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function lcm(a, b) {
  return Math.abs(a * b) / computeGcd(a, b);
}

function decimalsGenerator(difficulty, random) {
  const places = difficulty === 'easy' ? 1 : 2;
  const scale = 10 ** places;
  const maxVal = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 50 : 100;

  const a = randomInt(1, maxVal * scale, random) / scale;
  const b = randomInt(1, maxVal * scale, random) / scale;
  const useSubtraction = difficulty !== 'easy' && random() > 0.5;

  const rawAnswer = useSubtraction ? a - b : a + b;
  const answer = Math.round(rawAnswer * scale) / scale;
  const op = useSubtraction ? '-' : '+';

  const aStr = a.toFixed(places);
  const bStr = b.toFixed(places);

  return {
    prompt: `${aStr} ${op} ${bStr} = ?`,
    canonicalAnswer: answer,
    hintSteps: [
      'Line up the decimal points before computing.',
      `${op === '+' ? 'Add' : 'Subtract'} column by column from right to left.`,
      `The answer has ${places} decimal place${places > 1 ? 's' : ''}.`,
    ],
    metadata: { a, b, operator: op, decimalPlaces: places },
    representation: 'numeric',
    operandCount: 2,
    maxMagnitude: Math.max(Math.abs(a), Math.abs(b), Math.abs(answer)),
    hasNegative: answer < 0,
    tags: ['arithmetic', 'decimals'],
    subskill: useSubtraction ? 'decimal_subtraction' : 'decimal_addition',
  };
}

function orderOfOperationsGenerator(difficulty, random) {
  if (difficulty === 'easy') {
    const a = randomInt(1, 10, random);
    const b = randomInt(1, 6, random);
    const c = randomInt(1, 10, random);
    const answer = a + b * c;
    return {
      prompt: `${a} + ${b} × ${c} = ?`,
      canonicalAnswer: answer,
      hintSteps: [
        'Multiplication comes before addition.',
        `First compute ${b} × ${c} = ${b * c}.`,
        `Then add ${a} + ${b * c} = ${answer}.`,
      ],
      metadata: { expression: [a, '+', b, '×', c] },
      representation: 'numeric',
      operandCount: 3,
      maxMagnitude: Math.max(a, b * c, answer),
      hasNegative: false,
      tags: ['arithmetic', 'reasoning'],
      subskill: 'pemdas_multiply_before_add',
    };
  }

  if (difficulty === 'medium') {
    const a = randomInt(2, 10, random);
    const b = randomInt(1, 8, random);
    const c = randomInt(1, 6, random);
    const inner = a + b;
    const answer = inner * c;
    return {
      prompt: `(${a} + ${b}) × ${c} = ?`,
      canonicalAnswer: answer,
      hintSteps: [
        'Parentheses first.',
        `Compute ${a} + ${b} = ${inner}.`,
        `Then ${inner} × ${c} = ${answer}.`,
      ],
      metadata: { expression: ['(', a, '+', b, ')', '×', c] },
      representation: 'numeric',
      operandCount: 3,
      maxMagnitude: answer,
      hasNegative: false,
      tags: ['arithmetic', 'reasoning'],
      subskill: 'pemdas_parentheses',
    };
  }

  // hard
  const a = randomInt(2, 8, random);
  const b = randomInt(1, 5, random);
  const exp = randomInt(2, 3, random);
  const c = randomInt(1, 10, random);
  const powered = a ** exp;
  const answer = powered - b + c;
  return {
    prompt: `${a}^${exp} - ${b} + ${c} = ?`,
    canonicalAnswer: answer,
    hintSteps: [
      'Exponents first.',
      `Compute ${a}^${exp} = ${powered}.`,
      `Then ${powered} - ${b} + ${c} = ${answer}.`,
    ],
    metadata: { expression: [a, '^', exp, '-', b, '+', c] },
    representation: 'numeric',
    operandCount: 4,
    maxMagnitude: Math.max(powered, answer),
    hasNegative: answer < 0,
    tags: ['arithmetic', 'reasoning'],
    subskill: 'pemdas_exponents_mixed',
  };
}

function exponentsGenerator(difficulty, random) {
  if (difficulty === 'easy') {
    const base = randomInt(2, 6, random);
    const answer = base * base;
    return {
      prompt: `${base}² = ?`,
      canonicalAnswer: answer,
      hintSteps: [
        `${base}² means ${base} × ${base}.`,
        `Multiply: ${base} × ${base} = ${answer}.`,
      ],
      metadata: { base, exponent: 2 },
      representation: 'area_model',
      operandCount: 1,
      maxMagnitude: answer,
      hasNegative: false,
      tags: ['pre-algebra', 'exponents'],
      subskill: 'perfect_squares',
    };
  }

  if (difficulty === 'medium') {
    const base = randomInt(2, 5, random);
    const exp = randomInt(2, 3, random);
    const answer = base ** exp;
    return {
      prompt: `${base}^${exp} = ?`,
      canonicalAnswer: answer,
      hintSteps: [
        `${base}^${exp} means ${Array.from({ length: exp }, () => base).join(' × ')}.`,
        `Compute step by step to get ${answer}.`,
      ],
      metadata: { base, exponent: exp },
      representation: 'numeric',
      operandCount: 1,
      maxMagnitude: answer,
      hasNegative: false,
      tags: ['pre-algebra', 'exponents'],
      subskill: 'integer_exponents',
    };
  }

  // hard: compare or combine exponents
  const base = randomInt(2, 4, random);
  const expA = randomInt(2, 3, random);
  const expB = randomInt(2, 3, random);
  const valA = base ** expA;
  const valB = base ** expB;
  const answer = valA * valB;
  const combinedExp = expA + expB;
  return {
    prompt: `${base}^${expA} × ${base}^${expB} = ?`,
    canonicalAnswer: answer,
    hintSteps: [
      'When multiplying powers with the same base, add the exponents.',
      `${base}^${expA} × ${base}^${expB} = ${base}^${combinedExp}.`,
      `Compute ${base}^${combinedExp} = ${answer}.`,
    ],
    metadata: { base, expA, expB, combinedExp },
    representation: 'numeric',
    operandCount: 2,
    maxMagnitude: answer,
    hasNegative: false,
    tags: ['pre-algebra', 'exponents'],
    subskill: 'exponent_multiplication_rule',
  };
}

const GENERATORS = {
  addition_subtraction: additionSubtractionGenerator,
  multiplication_division: multiplicationDivisionGenerator,
  signed_integers: signedIntegerGenerator,
  missing_value_equations: missingValueGenerator,
  fractions: fractionsGenerator,
  decimals: decimalsGenerator,
  order_of_operations: orderOfOperationsGenerator,
  exponents: exponentsGenerator,
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
