import { listSkillFamilies } from '../../math/equationEngine.js';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sequence Repair encounter: fill in missing elements of a number pattern.
 *
 * The player sees a sequence with 1-2 blanks and must select the
 * correct values to complete the pattern. Tests pattern recognition,
 * arithmetic progressions, geometric progressions, and more.
 */
export default class SequenceRepairScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SequenceRepairScene' });
  }

  init(data) {
    this.encounterConfig = data.encounter || null;
    this.standalone = !this.encounterConfig;
  }

  create() {
    if (this.standalone) this.scene.launch('HudScene');

    this.score = 0;
    this.streak = 0;
    this.nextRound();
  }

  nextRound() {
    this.children.removeAll(true);

    const { width, height } = this.scale;
    const cx = width / 2;

    const enc = this.encounterConfig;
    const difficulty = enc?.difficulty || pick(['easy', 'medium']);

    const puzzle = this.generateSequencePuzzle(difficulty);
    this.puzzle = puzzle;
    this.blanksRemaining = puzzle.blanks.length;
    this.locked = false;
    this.selectedBlanks = new Map(); // blankIndex -> chosen value

    // HUD
    this.game.events.emit('hud:update', {
      equation: `Pattern: ${puzzle.patternDesc}`,
      skill: enc?.skill || 'patterns',
      difficulty,
      score: this.score,
      streak: this.streak,
    });
    this.game.events.emit('hud:feedback', 'Fill in the missing numbers to complete the pattern!');
    this.game.events.emit('hud:hint', '');

    // Title
    this.add.text(cx, 30, 'SEQUENCE REPAIR', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
      letterSpacing: 3,
    }).setOrigin(0.5);

    // Pattern description
    this.add.text(cx, 55, puzzle.patternDesc, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      color: '#6ed4ff',
    }).setOrigin(0.5);

    this.drawSequence(cx, height);
    this.drawChoices(cx, height);
  }

  generateSequencePuzzle(difficulty) {
    const patternType = pick(
      difficulty === 'easy'
        ? ['arithmetic']
        : difficulty === 'medium'
          ? ['arithmetic', 'geometric', 'alternating']
          : ['arithmetic', 'geometric', 'alternating', 'fibonacci_like']
    );

    const length = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 6 : 7;
    const blankCount = difficulty === 'easy' ? 1 : 2;

    let sequence, patternDesc;

    switch (patternType) {
      case 'arithmetic': {
        const start = Math.floor(Math.random() * 10) + 1;
        const step = Math.floor(Math.random() * 8) + 2;
        const useSubtraction = difficulty !== 'easy' && Math.random() > 0.5;
        const actualStep = useSubtraction ? -step : step;
        sequence = Array.from({ length }, (_, i) => start + actualStep * i);
        patternDesc = useSubtraction
          ? `Subtract ${step} each time`
          : `Add ${step} each time`;
        break;
      }

      case 'geometric': {
        const start = Math.floor(Math.random() * 4) + 2;
        const ratio = pick([2, 3]);
        sequence = Array.from({ length }, (_, i) => start * (ratio ** i));
        patternDesc = `Multiply by ${ratio} each time`;
        break;
      }

      case 'alternating': {
        const startA = Math.floor(Math.random() * 10) + 1;
        const startB = Math.floor(Math.random() * 10) + 11;
        const stepA = Math.floor(Math.random() * 3) + 1;
        const stepB = Math.floor(Math.random() * 3) + 1;
        sequence = Array.from({ length }, (_, i) =>
          i % 2 === 0 ? startA + stepA * Math.floor(i / 2) : startB + stepB * Math.floor(i / 2)
        );
        patternDesc = 'Two interleaved patterns';
        break;
      }

      case 'fibonacci_like': {
        const a = Math.floor(Math.random() * 5) + 1;
        const b = Math.floor(Math.random() * 5) + 1;
        sequence = [a, b];
        for (let i = 2; i < length; i++) {
          sequence.push(sequence[i - 1] + sequence[i - 2]);
        }
        patternDesc = 'Each number is the sum of the two before it';
        break;
      }
    }

    // Choose blank positions (not the first element)
    const blankCandidates = Array.from({ length: length - 1 }, (_, i) => i + 1);
    const blanks = shuffle(blankCandidates).slice(0, blankCount).sort((a, b) => a - b);

    // Generate distractors for each blank
    const blankData = blanks.map(pos => {
      const correct = sequence[pos];
      const distractors = this.generateDistractors(correct, sequence, pos);
      return { position: pos, correct, choices: shuffle([correct, ...distractors]) };
    });

    return { sequence, blanks, blankData, patternDesc, patternType };
  }

  generateDistractors(correct, sequence, pos) {
    const distractors = new Set();

    // Near misses
    distractors.add(correct + 1);
    distractors.add(correct - 1);
    if (correct > 2) distractors.add(correct + 2);
    if (correct > 3) distractors.add(correct - 2);

    // Use adjacent values as distractors
    if (pos > 0) distractors.add(sequence[pos - 1]);
    if (pos < sequence.length - 1) distractors.add(sequence[pos + 1]);

    // Random offset
    distractors.add(correct + Math.floor(Math.random() * 5) + 3);

    // Remove the correct answer and pick 3
    distractors.delete(correct);
    return [...distractors].filter(d => d !== correct).slice(0, 3);
  }

  drawSequence(cx, height) {
    const { sequence, blanks } = this.puzzle;
    const cellW = 64;
    const gap = 12;
    const totalW = sequence.length * (cellW + gap) - gap;
    const startX = cx - totalW / 2;
    const seqY = 140;

    this.sequenceCells = [];

    sequence.forEach((value, i) => {
      const x = startX + i * (cellW + gap) + cellW / 2;
      const isBlank = blanks.includes(i);

      const bg = this.add.rectangle(x, seqY, cellW, 56, isBlank ? 0x1e3860 : 0x244a8c, 0.9)
        .setStrokeStyle(2, isBlank ? 0xf59e0b : 0x95efff, isBlank ? 0.6 : 0.4);

      const label = this.add.text(x, seqY, isBlank ? '?' : String(value), {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: isBlank ? '#f59e0b' : '#eef6ff',
      }).setOrigin(0.5);

      // Arrow between cells
      if (i < sequence.length - 1) {
        this.add.text(x + cellW / 2 + gap / 2, seqY, '→', {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '16px',
          color: '#3a5a8a',
        }).setOrigin(0.5);
      }

      this.sequenceCells.push({ bg, label, isBlank, index: i, value });
    });
  }

  drawChoices(cx, height) {
    const { blankData } = this.puzzle;

    this.choiceElements = [];

    blankData.forEach((blank, blankIdx) => {
      const y = 240 + blankIdx * 100;
      const pos = blank.position;

      this.add.text(cx - 260, y, `Position ${pos + 1}:`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px',
        color: '#9eb8d4',
      }).setOrigin(0, 0.5);

      const choiceW = 80;
      const gap = 16;
      const choices = blank.choices;
      const totalW = choices.length * (choiceW + gap) - gap;
      const startX = cx - totalW / 2 + 40;

      const elements = [];

      choices.forEach((value, choiceIdx) => {
        const x = startX + choiceIdx * (choiceW + gap) + choiceW / 2;

        const bg = this.add.rectangle(x, y, choiceW, 44, 0x244a8c, 0.9)
          .setStrokeStyle(1, 0x95efff, 0.5)
          .setInteractive({ useHandCursor: true });

        const label = this.add.text(x, y, String(value), {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#eef6ff',
        }).setOrigin(0.5);

        bg.on('pointerover', () => {
          if (!this.selectedBlanks.has(blankIdx)) bg.setStrokeStyle(2, 0x6ed4ff, 0.8);
        });
        bg.on('pointerout', () => {
          if (!this.selectedBlanks.has(blankIdx)) bg.setStrokeStyle(1, 0x95efff, 0.5);
        });
        bg.on('pointerdown', () => this.chooseValue(blankIdx, choiceIdx, value));

        elements.push({ bg, label, value });
      });

      this.choiceElements.push(elements);
    });
  }

  chooseValue(blankIdx, choiceIdx, value) {
    if (this.locked || this.selectedBlanks.has(blankIdx)) return;

    const blank = this.puzzle.blankData[blankIdx];
    const elements = this.choiceElements[blankIdx];
    const chosen = elements[choiceIdx];

    if (value === blank.correct) {
      // Correct!
      this.selectedBlanks.set(blankIdx, value);
      chosen.bg.setFillStyle(0x2a5a2a, 0.9);
      chosen.bg.setStrokeStyle(2, 0x7dffb0, 0.8);
      chosen.label.setColor('#7dffb0');

      // Disable all choices for this blank
      for (const el of elements) {
        el.bg.disableInteractive();
        if (el !== chosen) {
          el.bg.setAlpha(0.3);
          el.label.setAlpha(0.3);
        }
      }

      // Update the sequence cell
      const cell = this.sequenceCells[blank.position];
      cell.label.setText(String(value));
      cell.label.setColor('#7dffb0');
      cell.bg.setStrokeStyle(2, 0x7dffb0, 0.6);
      cell.bg.setFillStyle(0x2a5a2a, 0.8);

      this.game.events.emit('hud:feedback', `Correct! ${value} fits the pattern.`);

      // Check if all blanks are filled
      if (this.selectedBlanks.size === this.puzzle.blankData.length) {
        this.onWin();
      }
    } else {
      // Wrong
      chosen.bg.setFillStyle(0x6a2a2a, 0.9);
      chosen.bg.setStrokeStyle(2, 0xff6e6e, 0.8);
      chosen.label.setColor('#ff6e6e');

      this.score = Math.max(0, this.score - 5);
      this.streak = 0;

      this.game.events.emit('hud:feedback', `${value} doesn't fit the pattern. Try again!`);
      this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
      this.game.events.emit('hud:hint', `Pattern: ${this.puzzle.patternDesc}. Look at the numbers around the blank.`);

      // Disable the wrong choice
      chosen.bg.disableInteractive();
      chosen.bg.setAlpha(0.4);
      chosen.label.setAlpha(0.4);
    }
  }

  onWin() {
    this.locked = true;
    this.score += 15 + this.streak * 2;
    this.streak += 1;

    this.game.events.emit('hud:feedback', 'Sequence repaired! Pattern complete.');
    this.game.events.emit('hud:update', { score: this.score, streak: this.streak });

    if (this.standalone) {
      this.time.delayedCall(1500, () => this.nextRound());
    } else {
      this.time.delayedCall(800, () => {
        this.game.events.emit('encounter:result', {
          encounterId: this.encounterConfig?.id,
          success: true,
          score: this.score,
          streak: this.streak,
        });
      });
    }
  }
}
