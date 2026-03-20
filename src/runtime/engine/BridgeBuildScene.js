import { generateEquation, listSkillFamilies } from '../../math/equationEngine.js';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Bridge Build encounter: combine number tiles to reach a target sum.
 *
 * The player sees a gap with a target value. Several number tiles are
 * available. Click tiles to add them to the bridge total. When the
 * total matches the target, the bridge is built and the encounter is won.
 *
 * Works standalone (from menu) or as a sub-encounter launched from
 * the platformer via the `encounter:launch` / `encounter:result` protocol.
 */
export default class BridgeBuildScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BridgeBuildScene' });
  }

  init(data) {
    // When launched from PlatformerScene, data.encounter holds config
    this.encounterConfig = data.encounter || null;
    this.standalone = !this.encounterConfig;
  }

  create() {
    if (this.standalone) this.scene.launch('HudScene');

    const { width, height } = this.scale;
    this.score = 0;
    this.streak = 0;
    this.locked = false;

    this.cx = width / 2;
    this.cy = height / 2;

    this.nextRound();
  }

  nextRound() {
    this.locked = false;
    this.clearRound();

    const { width, height } = this.scale;
    const cx = this.cx;

    // Generate an equation — use its canonical answer as the bridge target
    const enc = this.encounterConfig;
    const skill = enc?.skill || pick(listSkillFamilies()).id;
    const difficulty = enc?.difficulty || pick(['easy', 'medium']);
    this.equation = generateEquation({ skill, difficulty });

    const target = this.equation.canonicalAnswer;
    this.target = target;

    // Build tile values: the correct answer can be decomposed into 2-4 addends
    const parts = this.decompose(target, difficulty);
    // Add distractors
    const distractorCount = difficulty === 'easy' ? 2 : 3;
    const distractors = this.equation.distractors.slice(0, distractorCount)
      .map(d => Math.abs(Math.round(d - target)) || 1); // small positive red herrings

    this.availableTiles = [...parts, ...distractors].sort(() => Math.random() - 0.5);
    this.selectedIndices = new Set();
    this.currentSum = 0;

    // Update HUD
    this.game.events.emit('hud:update', {
      equation: `Build to: ${this.formatAnswer(target)}`,
      skill: this.equation.skill,
      difficulty: this.equation.difficulty.label,
      score: this.score,
      streak: this.streak,
    });
    this.game.events.emit('hud:feedback', 'Click number tiles to build the bridge. Match the target!');
    this.game.events.emit('hud:hint', '');

    // Draw the bridge scene
    this.drawBridge(cx, height);
    this.drawTiles(cx, height);
  }

  decompose(target, difficulty) {
    // Split target into 2-4 addends
    const abs = Math.abs(target);
    const count = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;

    if (count === 2) {
      const a = Math.ceil(abs / 2) + (Math.floor(Math.random() * 3) - 1);
      const b = target - a;
      return [a, b];
    }

    const parts = [];
    let remaining = target;
    for (let i = 0; i < count - 1; i++) {
      const maxPart = Math.ceil(Math.abs(remaining) / (count - i));
      const part = Math.max(1, Math.floor(Math.random() * maxPart) + 1);
      const signed = remaining >= 0 ? part : -part;
      parts.push(signed);
      remaining -= signed;
    }
    parts.push(remaining);
    return parts;
  }

  drawBridge(cx, height) {
    // Bridge gap visualization
    const gapY = 180;
    const gapW = 300;

    // Left bank
    this.add.rectangle(cx - gapW / 2 - 60, gapY, 120, 80, 0x1a2a4a)
      .setStrokeStyle(1, 0x3a5a8a, 0.5);
    // Right bank
    this.add.rectangle(cx + gapW / 2 + 60, gapY, 120, 80, 0x1a2a4a)
      .setStrokeStyle(1, 0x3a5a8a, 0.5);

    // Gap (water/lava)
    this.add.rectangle(cx, gapY + 20, gapW, 40, 0x08111f, 0.9)
      .setStrokeStyle(1, 0xff6e6e, 0.3);

    // Target label
    this.add.text(cx, gapY - 30, 'TARGET', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.targetText = this.add.text(cx, gapY - 10, this.formatAnswer(this.target), {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#6ed4ff',
    }).setOrigin(0.5);

    // Current sum display
    this.add.text(cx, gapY + 55, 'YOUR TOTAL', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.sumText = this.add.text(cx, gapY + 75, '0', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#eef6ff',
    }).setOrigin(0.5);

    // Bridge planks area (fills in as tiles are selected)
    this.bridgePlanks = [];
    const plankW = gapW / Math.max(this.availableTiles.length, 4);
    const plankStartX = cx - gapW / 2;
    for (let i = 0; i < this.availableTiles.length; i++) {
      const plank = this.add.rectangle(
        plankStartX + i * plankW + plankW / 2, gapY + 20,
        plankW - 4, 30, 0x1e3860, 0
      ).setStrokeStyle(1, 0x3a5a8a, 0);
      this.bridgePlanks.push(plank);
    }
  }

  drawTiles(cx, height) {
    this.tileElements = [];

    const tileW = 80;
    const gap = 12;
    const totalW = this.availableTiles.length * (tileW + gap) - gap;
    const startX = cx - totalW / 2;
    const tileY = height - 120;

    this.add.text(cx, tileY - 40, 'Click tiles to add (click again to remove)', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '12px',
      color: '#9eb8d4',
    }).setOrigin(0.5);

    this.availableTiles.forEach((value, i) => {
      const x = startX + i * (tileW + gap) + tileW / 2;

      const bg = this.add.rectangle(x, tileY, tileW, 50, 0x244a8c, 0.9)
        .setStrokeStyle(2, 0x95efff, 0.5)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, tileY, this.formatAnswer(value), {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#eef6ff',
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        if (!this.selectedIndices.has(i)) bg.setStrokeStyle(2, 0x7dffb0, 0.8);
      });
      bg.on('pointerout', () => {
        if (!this.selectedIndices.has(i)) bg.setStrokeStyle(2, 0x95efff, 0.5);
      });
      bg.on('pointerdown', () => this.toggleTile(i));

      this.tileElements.push({ bg, label, value });
    });
  }

  toggleTile(index) {
    if (this.locked) return;

    if (this.selectedIndices.has(index)) {
      // Deselect
      this.selectedIndices.delete(index);
      this.currentSum -= this.availableTiles[index];
      this.tileElements[index].bg.setFillStyle(0x244a8c, 0.9);
      this.tileElements[index].bg.setStrokeStyle(2, 0x95efff, 0.5);
      this.tileElements[index].label.setColor('#eef6ff');
    } else {
      // Select
      this.selectedIndices.add(index);
      this.currentSum += this.availableTiles[index];
      this.tileElements[index].bg.setFillStyle(0x2a5a2a, 0.9);
      this.tileElements[index].bg.setStrokeStyle(2, 0x7dffb0, 0.8);
      this.tileElements[index].label.setColor('#7dffb0');
    }

    // Round to avoid floating point issues
    this.currentSum = Math.round(this.currentSum * 1000) / 1000;

    this.sumText.setText(this.formatAnswer(this.currentSum));

    // Update bridge planks
    let plankIdx = 0;
    for (let i = 0; i < this.availableTiles.length; i++) {
      if (this.selectedIndices.has(i) && plankIdx < this.bridgePlanks.length) {
        this.bridgePlanks[plankIdx].setFillStyle(0x2a5a2a, 0.8);
        this.bridgePlanks[plankIdx].setStrokeStyle(1, 0x7dffb0, 0.6);
        plankIdx++;
      }
    }
    // Clear remaining planks
    for (let i = plankIdx; i < this.bridgePlanks.length; i++) {
      this.bridgePlanks[i].setFillStyle(0x1e3860, 0);
      this.bridgePlanks[i].setStrokeStyle(1, 0x3a5a8a, 0);
    }

    // Color the sum based on proximity
    if (this.currentSum === this.target) {
      this.sumText.setColor('#7dffb0');
    } else if (Math.abs(this.currentSum - this.target) <= Math.abs(this.target * 0.2)) {
      this.sumText.setColor('#f59e0b');
    } else {
      this.sumText.setColor('#eef6ff');
    }

    // Check win
    if (this.currentSum === this.target && this.selectedIndices.size > 0) {
      this.onCorrect();
    }
  }

  onCorrect() {
    this.locked = true;
    this.score += 10 + this.streak * 2;
    this.streak += 1;

    // Animate bridge completion
    for (const plank of this.bridgePlanks) {
      plank.setFillStyle(0x2a6a3a, 0.9);
      plank.setStrokeStyle(1, 0x7dffb0, 0.8);
    }

    this.game.events.emit('hud:feedback', 'Bridge built! The path is open.');
    this.game.events.emit('hud:update', { score: this.score, streak: this.streak });

    if (this.standalone) {
      this.time.delayedCall(1200, () => this.nextRound());
    } else {
      // Return result to platformer
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

  clearRound() {
    this.children.removeAll(true);
  }

  formatAnswer(value) {
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(2)).toString();
  }
}
