export const SKILL_FAMILIES = {
  addition_subtraction: {
    label: 'Addition & Subtraction',
    representations: ['numeric', 'number_line'],
    tags: ['arithmetic', 'fact-fluency'],
  },
  multiplication_division: {
    label: 'Multiplication & Division',
    representations: ['numeric', 'array_model'],
    tags: ['arithmetic', 'fact-fluency'],
  },
  signed_integers: {
    label: 'Signed Integers',
    representations: ['numeric', 'number_line'],
    tags: ['pre-algebra', 'integer-sense'],
  },
  missing_value_equations: {
    label: 'Missing Value Equations',
    representations: ['numeric', 'balance-model'],
    tags: ['pre-algebra', 'equations'],
  },
};

export const DIFFICULTY_PRESETS = {
  easy: {
    label: 'Easy',
    numberRange: [0, 10],
    allowNegatives: false,
    maxOperands: 2,
    operationMix: 'single',
  },
  medium: {
    label: 'Medium',
    numberRange: [0, 20],
    allowNegatives: true,
    maxOperands: 3,
    operationMix: 'mixed',
  },
  hard: {
    label: 'Hard',
    numberRange: [-20, 50],
    allowNegatives: true,
    maxOperands: 3,
    operationMix: 'mixed',
  },
};
