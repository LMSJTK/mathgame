import { listLevels, loadLevel, validateLevel } from './levelLoader.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.showMainMenu();
  }

  showMainMenu() {
    this.clearAll();
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 60, 'MATH GAME', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#6ed4ff',
    }).setOrigin(0.5);

    this.add.text(cx, 110, 'Choose a mode', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      color: '#9eb8d4',
    }).setOrigin(0.5);

    const modes = [
      { action: () => this.scene.start('TargetSelectScene'), label: 'Target Selection', desc: 'Click the correct moving answer' },
      { action: () => this.scene.start('RangeLandingScene'), label: 'Range Landing', desc: 'Jump to the platform with the right answer' },
      { action: () => this.scene.start('BridgeBuildScene'), label: 'Bridge Build', desc: 'Combine number tiles to reach a target sum' },
      { action: () => this.scene.start('RouteLogicScene'), label: 'Route Logic', desc: 'Guide a number through operation gates' },
      { action: () => this.scene.start('SequenceRepairScene'), label: 'Sequence Repair', desc: 'Fill in missing numbers to complete a pattern' },
      { action: () => this.showLevelSelect(), label: 'Play a Level', desc: 'Platformer levels with equation zones and dialogue' },
      { action: () => this.scene.start('PlatformerScene', { level: null }), label: 'Quick Demo Level', desc: 'Auto-generated demo (no JSON loading)' },
    ];

    modes.forEach((mode, i) => {
      this.createButton(cx, 160 + i * 56, 400, 42, mode.label, mode.desc, mode.action);
    });
  }

  async showLevelSelect() {
    this.clearAll();
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 50, 'SELECT A LEVEL', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#6ed4ff',
    }).setOrigin(0.5);

    // Back button
    this.createButton(80, 50, 100, 36, '← Back', '', () => this.showMainMenu());

    const loadingText = this.add.text(cx, 200, 'Loading levels...', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      color: '#9eb8d4',
    }).setOrigin(0.5);

    try {
      const levels = await listLevels();
      loadingText.destroy();

      if (levels.length === 0) {
        this.add.text(cx, 200, 'No levels found in /content/levels/', {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '14px',
          color: '#ff6e6e',
        }).setOrigin(0.5);
        return;
      }

      const diffColors = { easy: '#7dffb0', medium: '#f59e0b', hard: '#ff6e6e' };

      levels.forEach((entry, i) => {
        const y = 140 + i * 84;
        this.createButton(cx, y, 440, 66, entry.name, entry.description || '', async () => {
          await this.launchLevel(entry.file);
        });

        // Difficulty badge
        const badgeColor = diffColors[entry.difficulty] || '#9eb8d4';
        this.add.text(cx + 180, y - 14, entry.difficulty?.toUpperCase() || '', {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: badgeColor,
        }).setOrigin(0.5);
      });
    } catch (err) {
      loadingText.setText(`Error loading levels: ${err.message}`);
      loadingText.setColor('#ff6e6e');
    }
  }

  async launchLevel(filename) {
    this.clearAll();
    const { width } = this.scale;
    const cx = width / 2;

    const loadingText = this.add.text(cx, 270, `Loading ${filename}...`, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      color: '#9eb8d4',
    }).setOrigin(0.5);

    try {
      const level = await loadLevel(filename);
      const { valid, errors } = validateLevel(level);

      if (!valid) {
        loadingText.setText(`Level validation errors:\n${errors.join('\n')}`);
        loadingText.setColor('#ff6e6e');
        loadingText.setStyle({ ...loadingText.style, wordWrap: { width: 600 } });
        this.createButton(cx, 400, 140, 40, '← Back', '', () => this.showLevelSelect());
        return;
      }

      this.scene.start('PlatformerScene', { level });
    } catch (err) {
      loadingText.setText(`Failed to load: ${err.message}`);
      loadingText.setColor('#ff6e6e');
      this.createButton(cx, 400, 140, 40, '← Back', '', () => this.showLevelSelect());
    }
  }

  createButton(x, y, w, h, title, subtitle, onClick) {
    const btn = this.add.rectangle(x, y, w, h, 0x0b182b, 0.88)
      .setStrokeStyle(1, 0x80adff, 0.4)
      .setInteractive({ useHandCursor: true });

    const titleText = this.add.text(x, subtitle ? y - 8 : y, title, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: subtitle ? '18px' : '14px',
      fontStyle: 'bold',
      color: '#eef6ff',
    }).setOrigin(0.5);

    let subText;
    if (subtitle) {
      subText = this.add.text(x, y + 12, subtitle, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
        color: '#9eb8d4',
        wordWrap: { width: w - 20 },
      }).setOrigin(0.5);
    }

    btn.on('pointerover', () => btn.setStrokeStyle(2, 0x6ed4ff, 0.8));
    btn.on('pointerout', () => btn.setStrokeStyle(1, 0x80adff, 0.4));
    btn.on('pointerdown', onClick);

    return { btn, titleText, subText };
  }

  clearAll() {
    this.children.removeAll(true);
  }
}
