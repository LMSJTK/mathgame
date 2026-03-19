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
 * Range Landing encounter: player must jump between platforms,
 * each labeled with an answer. Land on the correct platform to score.
 */
export default class RangeLandingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RangeLandingScene' });
  }

  create() {
    this.scene.launch('HudScene');

    const { width, height } = this.scale;
    this.score = 0;
    this.streak = 0;
    this.answered = false;

    // Physics world bounds
    this.physics.world.setBounds(0, 0, width, height);

    // Ground
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < width; x += 32) {
      this.ground.create(x + 16, height - 16, 'tile_solid');
    }

    // Player
    this.player = this.physics.add.sprite(80, height - 80, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.physics.add.collider(this.player, this.ground);

    // Platform group
    this.platforms = this.physics.add.staticGroup();
    this.physics.add.collider(this.player, this.platforms);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Platform labels container
    this.platformLabels = [];
    this.platformData = [];

    this.nextRound();
  }

  nextRound() {
    this.answered = false;

    // Clear old platforms
    this.platforms.clear(true, true);
    for (const label of this.platformLabels) label.destroy();
    this.platformLabels = [];
    this.platformData = [];

    // Reset player position
    this.player.setPosition(80, this.scale.height - 80);
    this.player.setVelocity(0, 0);

    // Generate equation
    const skill = pick(listSkillFamilies()).id;
    const difficulty = pick(['easy', 'medium', 'hard']);
    this.equation = generateEquation({ skill, difficulty });

    this.game.events.emit('hud:update', {
      equation: this.equation.prompt,
      skill: this.equation.skill,
      difficulty: this.equation.difficulty.label,
      score: this.score,
      streak: this.streak,
    });
    this.game.events.emit('hud:feedback', 'Jump to the platform with the correct answer!');
    this.game.events.emit('hud:hint', '');

    // Create answer platforms
    const answers = shuffle([this.equation.canonicalAnswer, ...this.equation.distractors]);
    const startX = 200;
    const spacing = 140;
    const baseY = this.scale.height - 140;

    answers.forEach((value, i) => {
      const x = startX + i * spacing;
      const y = baseY - (i % 2 === 0 ? 0 : 60) - Math.random() * 40;

      // Platform body
      const plat = this.platforms.create(x, y, 'platform_answer');
      plat.setDisplaySize(80, 24);
      plat.refreshBody();

      // Label
      const label = this.add.text(x, y - 4, this.formatAnswer(value), {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#eef6ff',
      }).setOrigin(0.5);
      this.platformLabels.push(label);

      this.platformData.push({
        platform: plat,
        label,
        value,
        isCorrect: value === this.equation.canonicalAnswer,
        x,
        y,
      });
    });
  }

  formatAnswer(value) {
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(2)).toString();
  }

  checkLanding() {
    if (this.answered) return;

    // Check if player is standing on a platform
    for (const pd of this.platformData) {
      const playerBottom = this.player.body.bottom;
      const platTop = pd.platform.body.top;
      const dx = Math.abs(this.player.x - pd.x);
      const onPlatform = this.player.body.touching.down && dx < 48 && Math.abs(playerBottom - platTop) < 8;

      if (onPlatform) {
        this.answered = true;
        if (pd.isCorrect) {
          this.score += 10 + this.streak * 2;
          this.streak += 1;
          pd.label.setColor('#7dffb0');
          this.game.events.emit('hud:feedback', `Correct! ${this.formatAnswer(pd.value)} is right.`);
          this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
          this.time.delayedCall(1200, () => this.nextRound());
        } else {
          this.score = Math.max(0, this.score - 5);
          this.streak = 0;
          pd.label.setColor('#ff6e6e');
          this.game.events.emit('hud:feedback', `${this.formatAnswer(pd.value)} is wrong!`);
          this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
          this.game.events.emit('hud:hint', this.equation.hintSteps[0]);
          this.time.delayedCall(1000, () => {
            this.answered = false;
            pd.label.setColor('#eef6ff');
          });
        }
        return;
      }
    }
  }

  update() {
    const onGround = this.player.body.touching.down;
    const speed = 220;
    const jumpVelocity = -420;

    // Horizontal movement
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    // Jump
    if (onGround && (this.cursors.up.isDown || this.wasd.up.isDown || this.wasd.space.isDown)) {
      this.player.setVelocityY(jumpVelocity);
    }

    this.checkLanding();
  }
}
