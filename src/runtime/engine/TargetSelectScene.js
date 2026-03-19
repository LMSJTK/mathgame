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

export default class TargetSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TargetSelectScene' });
  }

  create() {
    this.scene.launch('HudScene');

    this.score = 0;
    this.streak = 0;
    this.targets = [];
    this.locked = false;

    const { width, height } = this.scale;

    // Arena bounds (offset from HUD panel)
    this.arenaLeft = 310;
    this.arenaRight = width - 20;
    this.arenaTop = 20;
    this.arenaBottom = height - 20;

    // Arena border
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x6ed4ff, 0.25);
    gfx.strokeRect(this.arenaLeft, this.arenaTop, this.arenaRight - this.arenaLeft, this.arenaBottom - this.arenaTop);

    this.add.text((this.arenaLeft + this.arenaRight) / 2, this.arenaTop + 12, 'Click the correct answer', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      color: '#9eb8d4',
    }).setOrigin(0.5, 0);

    this.nextRound();
  }

  nextRound() {
    this.locked = false;

    // Clear old targets
    for (const t of this.targets) {
      t.container.destroy();
    }
    this.targets = [];

    // Generate equation
    const skill = pick(listSkillFamilies()).id;
    const difficulty = pick(['easy', 'medium', 'hard']);
    this.equation = generateEquation({ skill, difficulty });

    // Update HUD
    this.game.events.emit('hud:update', {
      equation: this.equation.prompt,
      skill: this.equation.skill,
      difficulty: this.equation.difficulty.label,
      score: this.score,
      streak: this.streak,
    });
    this.game.events.emit('hud:feedback', 'Click the target with the correct answer.');
    this.game.events.emit('hud:hint', '');

    // Create answer targets
    const answers = shuffle([this.equation.canonicalAnswer, ...this.equation.distractors]);
    const areaW = this.arenaRight - this.arenaLeft - 80;
    const areaH = this.arenaBottom - this.arenaTop - 80;

    answers.forEach((value, i) => {
      const x = this.arenaLeft + 40 + Math.random() * areaW;
      const y = this.arenaTop + 60 + Math.random() * areaH;
      const isCorrect = value === this.equation.canonicalAnswer;

      const container = this.add.container(x, y);

      const orb = this.add.image(0, 0, 'answer_orb').setDisplaySize(64, 64);
      const label = this.add.text(0, 0, this.formatAnswer(value), {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#eef6ff',
      }).setOrigin(0.5);

      container.add([orb, label]);
      container.setSize(64, 64);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => this.handleChoice(isCorrect, value, container, orb));

      // Movement velocity
      const vx = (0.3 + Math.random() * 0.7) * (i % 2 === 0 ? 1 : -1);
      const vy = (0.3 + Math.random() * 0.5) * (i < 2 ? 1 : -1);

      this.targets.push({ container, orb, label, vx, vy, isCorrect, value });
    });
  }

  formatAnswer(value) {
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(2)).toString();
  }

  handleChoice(isCorrect, value, container, orb) {
    if (this.locked) return;

    if (isCorrect) {
      this.locked = true;
      this.score += 10 + this.streak * 2;
      this.streak += 1;
      orb.setTexture('answer_correct');
      this.game.events.emit('hud:feedback', `Correct! ${this.formatAnswer(value)} is right.`);
      this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
      this.time.delayedCall(800, () => this.nextRound());
    } else {
      this.score = Math.max(0, this.score - 5);
      this.streak = 0;
      orb.setTexture('answer_wrong');
      this.game.events.emit('hud:feedback', `${this.formatAnswer(value)} is wrong. Try again.`);
      this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
      this.game.events.emit('hud:hint', this.equation.hintSteps[0]);
      this.time.delayedCall(600, () => orb.setTexture('answer_orb'));
    }
  }

  update() {
    for (const t of this.targets) {
      t.container.x += t.vx;
      t.container.y += t.vy;

      if (t.container.x <= this.arenaLeft + 40 || t.container.x >= this.arenaRight - 40) t.vx *= -1;
      if (t.container.y <= this.arenaTop + 60 || t.container.y >= this.arenaBottom - 40) t.vy *= -1;
    }
  }
}
