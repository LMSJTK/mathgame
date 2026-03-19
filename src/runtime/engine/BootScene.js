export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Generate simple placeholder graphics as textures
    this.createPlaceholderTextures();
  }

  createPlaceholderTextures() {
    // Player - cyan rectangle
    const playerGfx = this.add.graphics();
    playerGfx.fillStyle(0x6ed4ff, 1);
    playerGfx.fillRoundedRect(0, 0, 32, 48, 4);
    playerGfx.generateTexture('player', 32, 48);
    playerGfx.destroy();

    // Platform tile - dark blue-grey
    const tileGfx = this.add.graphics();
    tileGfx.fillStyle(0x1a2a4a, 1);
    tileGfx.fillRect(0, 0, 32, 32);
    tileGfx.lineStyle(1, 0x3a5a8a, 0.5);
    tileGfx.strokeRect(0, 0, 32, 32);
    tileGfx.generateTexture('tile_solid', 32, 32);
    tileGfx.destroy();

    // Answer target - glowing orb
    const orbGfx = this.add.graphics();
    orbGfx.fillStyle(0x244a8c, 1);
    orbGfx.fillCircle(32, 32, 32);
    orbGfx.lineStyle(2, 0x95efff, 0.8);
    orbGfx.strokeCircle(32, 32, 32);
    orbGfx.generateTexture('answer_orb', 64, 64);
    orbGfx.destroy();

    // Correct answer highlight
    const correctGfx = this.add.graphics();
    correctGfx.fillStyle(0x2a6a3a, 1);
    correctGfx.fillCircle(32, 32, 32);
    correctGfx.lineStyle(2, 0x7dffb0, 0.9);
    correctGfx.strokeCircle(32, 32, 32);
    correctGfx.generateTexture('answer_correct', 64, 64);
    correctGfx.destroy();

    // Wrong answer highlight
    const wrongGfx = this.add.graphics();
    wrongGfx.fillStyle(0x6a2a2a, 1);
    wrongGfx.fillCircle(32, 32, 32);
    wrongGfx.lineStyle(2, 0xff6e6e, 0.9);
    wrongGfx.strokeCircle(32, 32, 32);
    wrongGfx.generateTexture('answer_wrong', 64, 64);
    wrongGfx.destroy();

    // Checkpoint flag
    const flagGfx = this.add.graphics();
    flagGfx.fillStyle(0x7dffb0, 1);
    flagGfx.fillTriangle(4, 0, 28, 12, 4, 24);
    flagGfx.fillStyle(0x9eb8d4, 1);
    flagGfx.fillRect(0, 0, 4, 40);
    flagGfx.generateTexture('checkpoint', 28, 40);
    flagGfx.destroy();

    // Exit portal
    const portalGfx = this.add.graphics();
    portalGfx.lineStyle(3, 0x40b7ff, 0.9);
    portalGfx.strokeCircle(24, 24, 22);
    portalGfx.lineStyle(2, 0x6ed4ff, 0.5);
    portalGfx.strokeCircle(24, 24, 16);
    portalGfx.generateTexture('exit_portal', 48, 48);
    portalGfx.destroy();

    // Platform label (for range landing)
    const platGfx = this.add.graphics();
    platGfx.fillStyle(0x1e3860, 1);
    platGfx.fillRoundedRect(0, 0, 80, 32, 6);
    platGfx.lineStyle(2, 0x6ed4ff, 0.6);
    platGfx.strokeRoundedRect(0, 0, 80, 32, 6);
    platGfx.generateTexture('platform_answer', 80, 32);
    platGfx.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
