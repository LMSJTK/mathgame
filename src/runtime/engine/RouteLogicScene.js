import { generateEquation, listSkillFamilies } from '../../math/equationEngine.js';

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
 * Route Logic encounter: guide a number through a series of gates.
 *
 * The player is given a starting number and must choose which gate to
 * pass through at each junction. Each gate applies an operation. The
 * player must reach the target value at the end. Wrong paths lead to
 * dead ends.
 *
 * This tests reasoning about operations, order, and number properties.
 */
export default class RouteLogicScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RouteLogicScene' });
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

    // Generate the puzzle: a start value, a series of junctions, and a target
    const puzzle = this.generatePuzzle(difficulty);
    this.puzzle = puzzle;
    this.currentValue = puzzle.start;
    this.currentStep = 0;
    this.choicesMade = [];
    this.locked = false;

    // HUD
    this.game.events.emit('hud:update', {
      equation: `Start: ${puzzle.start} → Target: ${puzzle.target}`,
      skill: enc?.skill || 'reasoning',
      difficulty,
      score: this.score,
      streak: this.streak,
    });
    this.game.events.emit('hud:feedback', 'Choose the right gate at each junction to reach the target!');
    this.game.events.emit('hud:hint', '');

    // Title
    this.add.text(cx, 30, 'ROUTE LOGIC', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
      letterSpacing: 3,
    }).setOrigin(0.5);

    // Start / Target display
    this.add.text(cx - 160, 65, 'START', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
    }).setOrigin(0.5);
    this.add.text(cx - 160, 85, String(puzzle.start), {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#6ed4ff',
    }).setOrigin(0.5);

    this.add.text(cx + 160, 65, 'TARGET', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
    }).setOrigin(0.5);
    this.add.text(cx + 160, 85, String(puzzle.target), {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#7dffb0',
    }).setOrigin(0.5);

    // Current value display
    this.add.text(cx, 65, 'CURRENT', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
    }).setOrigin(0.5);
    this.currentValueText = this.add.text(cx, 85, String(puzzle.start), {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#eef6ff',
    }).setOrigin(0.5);

    // Draw the route with junctions
    this.drawRoute(cx, height);
  }

  generatePuzzle(difficulty) {
    const steps = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    const maxNum = difficulty === 'easy' ? 10 : 20;

    // Build a correct path
    let start = Math.floor(Math.random() * maxNum) + 2;
    const correctOps = [];
    let current = start;

    const opTypes = difficulty === 'easy'
      ? ['+', '-']
      : ['+', '-', '×'];

    for (let i = 0; i < steps; i++) {
      const op = pick(opTypes);
      let operand;

      if (op === '×') {
        operand = Math.floor(Math.random() * 3) + 2; // 2-4
      } else {
        operand = Math.floor(Math.random() * (maxNum / 2)) + 1;
      }

      const result = this.applyOp(current, op, operand);
      correctOps.push({ op, operand, result });
      current = result;
    }

    const target = current;

    // Build junctions: at each step, offer 2-3 gates (one correct)
    const junctions = correctOps.map((correct, i) => {
      const wrongGates = [];
      const wrongOps = opTypes.filter(o => o !== correct.op || Math.random() > 0.5);

      for (let w = 0; w < (difficulty === 'easy' ? 1 : 2); w++) {
        const wOp = pick(wrongOps);
        let wOperand = Math.floor(Math.random() * (maxNum / 2)) + 1;
        if (wOp === '×') wOperand = Math.floor(Math.random() * 3) + 2;

        // Make sure it produces a different result
        const wResult = this.applyOp(
          i === 0 ? start : correctOps[i - 1].result,
          wOp,
          wOperand
        );
        if (wResult !== correct.result) {
          wrongGates.push({ op: wOp, operand: wOperand, result: wResult, correct: false });
        }
      }

      // Ensure at least one wrong option
      if (wrongGates.length === 0) {
        wrongGates.push({
          op: correct.op,
          operand: correct.operand + 1,
          result: this.applyOp(
            i === 0 ? start : correctOps[i - 1].result,
            correct.op,
            correct.operand + 1
          ),
          correct: false,
        });
      }

      const gates = shuffle([
        { ...correct, correct: true },
        ...wrongGates,
      ]);

      return { gates };
    });

    return { start, target, junctions, steps };
  }

  applyOp(value, op, operand) {
    switch (op) {
      case '+': return value + operand;
      case '-': return value - operand;
      case '×': return value * operand;
      default: return value;
    }
  }

  drawRoute(cx, height) {
    const { junctions } = this.puzzle;
    const startY = 130;
    const stepH = (height - startY - 80) / junctions.length;

    // Draw path lines
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0x3a5a8a, 0.3);

    this.junctionElements = [];

    junctions.forEach((junction, stepIdx) => {
      const y = startY + stepIdx * stepH + stepH / 2;
      const gateCount = junction.gates.length;
      const gateW = 140;
      const totalW = gateCount * gateW + (gateCount - 1) * 20;
      const startX = cx - totalW / 2;

      // Step label
      this.add.text(cx - 280, y, `Step ${stepIdx + 1}`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        color: '#9eb8d4',
      }).setOrigin(0, 0.5);

      // Path lines from previous step to gates
      if (stepIdx === 0) {
        gfx.moveTo(cx, startY - 10);
      }

      const elements = [];

      junction.gates.forEach((gate, gateIdx) => {
        const gx = startX + gateIdx * (gateW + 20) + gateW / 2;

        // Draw line to gate
        gfx.lineStyle(2, 0x3a5a8a, 0.3);
        gfx.lineBetween(cx, y - stepH / 2 + 10, gx, y - 15);

        // Gate box
        const gateBg = this.add.rectangle(gx, y, gateW, 44, 0x244a8c, 0.85)
          .setStrokeStyle(1, 0x95efff, 0.5)
          .setInteractive({ useHandCursor: true });

        const gateLabel = this.add.text(gx, y, `${gate.op} ${gate.operand}`, {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#eef6ff',
        }).setOrigin(0.5);

        // Only enable the current step
        if (stepIdx !== 0) {
          gateBg.setAlpha(0.4);
          gateLabel.setAlpha(0.4);
          gateBg.disableInteractive();
        }

        gateBg.on('pointerover', () => gateBg.setStrokeStyle(2, 0x6ed4ff, 0.8));
        gateBg.on('pointerout', () => gateBg.setStrokeStyle(1, 0x95efff, 0.5));
        gateBg.on('pointerdown', () => this.chooseGate(stepIdx, gateIdx));

        elements.push({ bg: gateBg, label: gateLabel, gate });
      });

      this.junctionElements.push(elements);
    });
  }

  chooseGate(stepIdx, gateIdx) {
    if (this.locked || stepIdx !== this.currentStep) return;

    const gate = this.puzzle.junctions[stepIdx].gates[gateIdx];
    const elements = this.junctionElements[stepIdx];

    // Apply the operation
    this.currentValue = this.applyOp(this.currentValue, gate.op, gate.operand);
    this.currentValueText.setText(String(this.currentValue));

    // Visual feedback
    const chosen = elements[gateIdx];

    if (gate.correct) {
      chosen.bg.setFillStyle(0x2a5a2a, 0.9);
      chosen.bg.setStrokeStyle(2, 0x7dffb0, 0.8);
      chosen.label.setColor('#7dffb0');

      // Dim unchosen gates
      elements.forEach((el, i) => {
        if (i !== gateIdx) {
          el.bg.setAlpha(0.3);
          el.label.setAlpha(0.3);
        }
        el.bg.disableInteractive();
      });

      this.choicesMade.push(gateIdx);
      this.currentStep += 1;

      // Enable next step's gates
      if (this.currentStep < this.puzzle.junctions.length) {
        const nextElements = this.junctionElements[this.currentStep];
        for (const el of nextElements) {
          el.bg.setAlpha(1);
          el.label.setAlpha(1);
          el.bg.setInteractive({ useHandCursor: true });
        }
      } else {
        // Puzzle complete!
        this.onWin();
      }
    } else {
      // Wrong gate
      chosen.bg.setFillStyle(0x6a2a2a, 0.9);
      chosen.bg.setStrokeStyle(2, 0xff6e6e, 0.8);
      chosen.label.setColor('#ff6e6e');

      this.score = Math.max(0, this.score - 5);
      this.streak = 0;

      this.game.events.emit('hud:feedback', `Wrong path! ${gate.op} ${gate.operand} gives ${this.currentValue}, not what you need.`);
      this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
      this.game.events.emit('hud:hint', `You need to reach ${this.puzzle.target}. Think about which operation gets you closer.`);

      // Reset: undo the operation and let them try again
      this.currentValue = this.applyOp(this.currentValue, gate.op === '+' ? '-' : gate.op === '-' ? '+' : '÷', gate.operand);
      this.currentValueText.setText(String(this.currentValue));

      // Disable the wrong gate
      chosen.bg.disableInteractive();
      chosen.bg.setAlpha(0.3);
      chosen.label.setAlpha(0.3);
    }
  }

  onWin() {
    this.locked = true;
    this.score += 15 + this.streak * 2;
    this.streak += 1;
    this.currentValueText.setColor('#7dffb0');

    this.game.events.emit('hud:feedback', `Route complete! Reached ${this.puzzle.target}.`);
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
