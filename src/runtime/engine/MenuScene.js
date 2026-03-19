export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 80, 'MATH GAME', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#6ed4ff',
    }).setOrigin(0.5);

    this.add.text(cx, 130, 'Choose an encounter mode', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      color: '#9eb8d4',
    }).setOrigin(0.5);

    const modes = [
      { key: 'TargetSelectScene', label: 'Target Selection', desc: 'Click the correct moving answer' },
      { key: 'RangeLandingScene', label: 'Range Landing', desc: 'Jump to the platform with the right answer' },
      { key: 'PlatformerScene', label: 'Platformer Level', desc: 'Run, jump, and solve equations in a level' },
    ];

    modes.forEach((mode, i) => {
      const y = 210 + i * 90;
      const btn = this.add.rectangle(cx, y, 360, 64, 0x0b182b, 0.88)
        .setStrokeStyle(1, 0x80adff, 0.4)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx, y - 10, mode.label, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#eef6ff',
      }).setOrigin(0.5);

      this.add.text(cx, y + 14, mode.desc, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px',
        color: '#9eb8d4',
      }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setStrokeStyle(2, 0x6ed4ff, 0.8));
      btn.on('pointerout', () => btn.setStrokeStyle(1, 0x80adff, 0.4));
      btn.on('pointerdown', () => this.scene.start(mode.key));
    });
  }
}
