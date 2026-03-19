/**
 * Overlay HUD scene that runs on top of gameplay scenes.
 * Listens for events from the active gameplay scene to update display.
 */
export default class HudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HudScene' });
  }

  create() {
    const pad = 16;
    const panelWidth = 280;
    const panelHeight = 310;

    // Semi-transparent panel background
    this.panel = this.add.rectangle(pad, pad, panelWidth, panelHeight, 0x0b182b, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x80adff, 0.3);

    const textStyle = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', color: '#9eb8d4' };
    const valueStyle = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '15px', color: '#eef6ff', fontStyle: 'bold' };

    let y = pad + 10;
    const left = pad + 14;

    // Equation
    this.add.text(left, y, 'EQUATION', textStyle);
    this.equationText = this.add.text(left, y + 14, '—', {
      ...valueStyle,
      fontSize: '18px',
      color: '#6ed4ff',
      wordWrap: { width: panelWidth - 28 },
    });
    y += 48;

    // Skill
    this.add.text(left, y, 'SKILL', textStyle);
    this.skillText = this.add.text(left, y + 14, '—', valueStyle);
    y += 36;

    // Difficulty
    this.add.text(left, y, 'DIFFICULTY', textStyle);
    this.difficultyText = this.add.text(left, y + 14, '—', valueStyle);
    y += 36;

    // Score and streak
    this.add.text(left, y, 'SCORE', textStyle);
    this.scoreText = this.add.text(left, y + 14, '0', { ...valueStyle, color: '#7dffb0' });

    this.add.text(left + 120, y, 'STREAK', textStyle);
    this.streakText = this.add.text(left + 120, y + 14, '0', { ...valueStyle, color: '#7dffb0' });
    y += 40;

    // Feedback (multi-line capable)
    this.feedbackText = this.add.text(left, y, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      color: '#eef6ff',
      wordWrap: { width: panelWidth - 28 },
    });
    y += 32;

    // Hint
    this.hintText = this.add.text(left, y, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
      wordWrap: { width: panelWidth - 28 },
    });

    // Back button
    const backBtn = this.add.text(pad + panelWidth - 14, pad + 6, '← Menu', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '12px',
      color: '#6ed4ff',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      const scenes = this.scene.manager.getScenes(true);
      for (const s of scenes) {
        if (s.scene.key !== 'HudScene' && s.scene.key !== 'MenuScene' && s.scene.key !== 'BootScene') {
          this.scene.stop(s.scene.key);
        }
      }
      this.scene.stop('HudScene');
      this.scene.start('MenuScene');
    });

    // Listen for events
    this.game.events.on('hud:update', this.onHudUpdate, this);
    this.game.events.on('hud:feedback', this.onFeedback, this);
    this.game.events.on('hud:hint', this.onHint, this);

    this.events.on('shutdown', () => {
      this.game.events.off('hud:update', this.onHudUpdate, this);
      this.game.events.off('hud:feedback', this.onFeedback, this);
      this.game.events.off('hud:hint', this.onHint, this);
    });
  }

  onHudUpdate(data) {
    if (data.equation) this.equationText.setText(data.equation);
    if (data.skill) this.skillText.setText(data.skill.replaceAll('_', ' '));
    if (data.difficulty) this.difficultyText.setText(data.difficulty);
    if (data.score !== undefined) this.scoreText.setText(String(data.score));
    if (data.streak !== undefined) this.streakText.setText(String(data.streak));
  }

  onFeedback(text) {
    this.feedbackText.setText(text);

    // Brief flash effect
    this.feedbackText.setAlpha(1);
    this.tweens.killTweensOf(this.feedbackText);
  }

  onHint(text) {
    this.hintText.setText(text);
  }
}
