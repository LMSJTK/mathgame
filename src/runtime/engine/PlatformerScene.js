import { generateEquation } from '../../math/equationEngine.js';

/**
 * Full platformer scene that loads level data from JSON.
 * Supports physics tiles, entities, equation zones, triggers, and dialogue.
 * Falls back to a demo level if no level data is provided.
 */
export default class PlatformerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlatformerScene' });
  }

  init(data) {
    this.levelData = data.level || null;
  }

  create() {
    this.scene.launch('HudScene');

    const { width, height } = this.scale;
    this.score = 0;
    this.streak = 0;
    this.flags = {};
    this.firedTriggers = new Set();

    const level = this.levelData || this.createDemoLevel(width, height);

    // World bounds
    const sceneW = (level.scene?.width || 40) * (level.scene?.tileSize || 32);
    const sceneH = (level.scene?.height || 20) * (level.scene?.tileSize || 32);
    this.physics.world.setBounds(0, 0, sceneW, sceneH);

    // Background color
    this.cameras.main.setBackgroundColor('#08111f');

    // Ground & platforms
    this.solids = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    for (const tile of level.physicsTiles) {
      const tx = tile.x + tile.w / 2;
      const ty = tile.y + tile.h / 2;

      if (tile.type === 'hazard') {
        const h = this.hazards.create(tx, ty, 'tile_solid');
        h.setDisplaySize(tile.w, tile.h);
        h.setTint(0xff4444);
        h.refreshBody();
      } else {
        const s = this.solids.create(tx, ty, 'tile_solid');
        s.setDisplaySize(tile.w, tile.h);
        s.refreshBody();
      }
    }

    // Player spawn
    const spawn = level.entities.find(e => e.type === 'player_spawn') || { x: 64, y: sceneH - 80 };
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.hazards, this.onHazard, null, this);

    // Checkpoints
    this.checkpoints = [];
    this.lastCheckpoint = { x: spawn.x, y: spawn.y };
    for (const ent of level.entities.filter(e => e.type === 'checkpoint')) {
      const cp = this.add.image(ent.x, ent.y, 'checkpoint').setOrigin(0.5, 1);
      this.checkpoints.push({ x: ent.x, y: ent.y, sprite: cp });
    }

    // Exit
    const exitEnt = level.entities.find(e => e.type === 'exit');
    if (exitEnt) {
      this.exitPortal = this.physics.add.staticImage(exitEnt.x, exitEnt.y, 'exit_portal');
      this.physics.add.overlap(this.player, this.exitPortal, this.onExit, null, this);
    }

    // Equation zones
    this.equationZones = [];
    for (const ent of level.entities.filter(e => e.type === 'equation_zone')) {
      const zone = this.add.zone(ent.x, ent.y, ent.properties?.width || 64, ent.properties?.height || 64);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => this.onEquationZone(ent), null, this);
      this.equationZones.push({ entity: ent, zone, solved: false });
    }

    // Store encounter definitions
    this.encounters = level.mathEncounters || [];

    // Store triggers
    this.triggers = level.triggers || [];

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, sceneW, sceneH);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Equation popup state
    this.activePopup = null;

    // Fire level-start triggers
    this.fireTrigger('on_level_start');

    this.game.events.emit('hud:update', {
      equation: 'Explore the level!',
      skill: '—',
      difficulty: '—',
      score: this.score,
      streak: this.streak,
    });
  }

  createDemoLevel(width, height) {
    const ts = 32;
    const cols = Math.ceil(width / ts) + 20;
    const rows = Math.ceil(height / ts);
    const sceneW = cols * ts;
    const sceneH = rows * ts;
    const groundY = sceneH - ts;

    const physicsTiles = [];

    // Ground
    for (let x = 0; x < sceneW; x += ts) {
      physicsTiles.push({ x, y: groundY, w: ts, h: ts, type: 'solid' });
    }

    // Some floating platforms
    const platformDefs = [
      { x: 200, y: groundY - 100, w: 128 },
      { x: 400, y: groundY - 180, w: 96 },
      { x: 600, y: groundY - 120, w: 128 },
      { x: 820, y: groundY - 200, w: 96 },
      { x: 1020, y: groundY - 150, w: 128 },
      { x: 1250, y: groundY - 220, w: 96 },
    ];

    for (const p of platformDefs) {
      physicsTiles.push({ x: p.x, y: p.y, w: p.w, h: ts / 2, type: 'solid' });
    }

    // A hazard pit
    physicsTiles.push({ x: 700, y: groundY, w: 64, h: ts, type: 'hazard' });

    const entities = [
      { id: 'spawn', type: 'player_spawn', x: 64, y: groundY - 60 },
      { id: 'cp1', type: 'checkpoint', x: 500, y: groundY },
      { id: 'exit', type: 'exit', x: 1350, y: groundY - 40 },
      { id: 'eq1', type: 'equation_zone', x: 260, y: groundY - 120, properties: { width: 80, height: 80, encounterId: 'enc1' } },
      { id: 'eq2', type: 'equation_zone', x: 870, y: groundY - 220, properties: { width: 80, height: 80, encounterId: 'enc2' } },
      { id: 'eq3', type: 'equation_zone', x: 1100, y: groundY - 170, properties: { width: 80, height: 80, encounterId: 'enc3' } },
    ];

    const mathEncounters = [
      { id: 'enc1', encounterType: 'gate_unlock', skill: 'addition_subtraction', difficulty: 'easy', successTarget: 1, failureLimit: 3 },
      { id: 'enc2', encounterType: 'gate_unlock', skill: 'multiplication_division', difficulty: 'medium', successTarget: 1, failureLimit: 3 },
      { id: 'enc3', encounterType: 'gate_unlock', skill: 'exponents', difficulty: 'easy', successTarget: 1, failureLimit: 3 },
    ];

    const triggers = [
      {
        id: 'welcome',
        condition: { type: 'on_level_start' },
        actions: [{ type: 'show_text', params: { text: 'Welcome! Run and jump through the level. Step into glowing zones to solve equations.' } }],
        once: true,
      },
    ];

    return {
      scene: { width: cols, height: rows, tileSize: ts, gravity: 800 },
      physicsTiles,
      entities,
      mathEncounters,
      triggers,
      layers: [],
    };
  }

  onHazard() {
    // Respawn at last checkpoint
    this.player.setPosition(this.lastCheckpoint.x, this.lastCheckpoint.y - 20);
    this.player.setVelocity(0, 0);
    this.score = Math.max(0, this.score - 10);
    this.game.events.emit('hud:feedback', 'Ouch! Respawned at checkpoint.');
    this.game.events.emit('hud:update', { score: this.score });
  }

  onExit() {
    if (this.activePopup) return;
    this.game.events.emit('hud:feedback', 'Level complete!');
    this.time.delayedCall(1500, () => {
      this.scene.stop('HudScene');
      this.scene.start('MenuScene');
    });
  }

  onEquationZone(entity) {
    if (this.activePopup) return;
    const zoneState = this.equationZones.find(z => z.entity.id === entity.id);
    if (zoneState?.solved) return;

    const encounterId = entity.properties?.encounterId;
    const encounter = this.encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    // Pause player
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    // Generate equation
    const equation = generateEquation({ skill: encounter.skill, difficulty: encounter.difficulty });

    this.game.events.emit('hud:update', {
      equation: equation.prompt,
      skill: equation.skill,
      difficulty: equation.difficulty.label,
    });

    this.showEquationPopup(equation, zoneState);
  }

  showEquationPopup(equation, zoneState) {
    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / 2;
    const cy = cam.scrollY + cam.height / 2;

    // Overlay
    const overlay = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.6).setDepth(100);

    // Panel
    const panel = this.add.rectangle(cx, cy, 400, 260, 0x0b182b, 0.95)
      .setStrokeStyle(2, 0x6ed4ff, 0.5)
      .setDepth(101);

    // Question
    const prompt = this.add.text(cx, cy - 80, equation.prompt, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#6ed4ff',
    }).setOrigin(0.5).setDepth(102);

    // Answer buttons
    const answers = this.shuffleArray([equation.canonicalAnswer, ...equation.distractors]);
    const buttons = [];
    const startX = cx - 150;
    const btnW = 130;
    const gap = 20;

    answers.forEach((value, i) => {
      const bx = startX + (i % 2) * (btnW + gap) + btnW / 2;
      const by = cy + (i < 2 ? -10 : 50);

      const bg = this.add.rectangle(bx, by, btnW, 44, 0x244a8c, 0.9)
        .setStrokeStyle(1, 0x95efff, 0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(102);

      const label = this.add.text(bx, by, this.formatAnswer(value), {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#eef6ff',
      }).setOrigin(0.5).setDepth(103);

      bg.on('pointerover', () => bg.setStrokeStyle(2, 0x7dffb0, 0.8));
      bg.on('pointerout', () => bg.setStrokeStyle(1, 0x95efff, 0.5));
      bg.on('pointerdown', () => this.handlePopupAnswer(value === equation.canonicalAnswer, value, equation, zoneState, popupElements));

      buttons.push({ bg, label });
    });

    const popupElements = [overlay, panel, prompt, ...buttons.flatMap(b => [b.bg, b.label])];
    this.activePopup = popupElements;
  }

  handlePopupAnswer(isCorrect, value, equation, zoneState, elements) {
    if (isCorrect) {
      this.score += 10 + this.streak * 2;
      this.streak += 1;
      zoneState.solved = true;
      this.game.events.emit('hud:feedback', `Correct! ${this.formatAnswer(value)} unlocks the path.`);
      this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
      this.fireTrigger('on_encounter_complete', { encounterId: zoneState.entity.properties?.encounterId });
    } else {
      this.score = Math.max(0, this.score - 5);
      this.streak = 0;
      this.game.events.emit('hud:feedback', `${this.formatAnswer(value)} is wrong. Try the zone again.`);
      this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
      this.game.events.emit('hud:hint', equation.hintSteps[0]);
    }

    // Close popup
    for (const el of elements) el.destroy();
    this.activePopup = null;
    this.player.body.enable = true;
  }

  fireTrigger(conditionType, params) {
    for (const trigger of this.triggers) {
      if (trigger.condition.type !== conditionType) continue;
      if (trigger.once && this.firedTriggers.has(trigger.id)) continue;

      this.firedTriggers.add(trigger.id);

      for (const action of trigger.actions) {
        if (action.type === 'show_text') {
          this.game.events.emit('hud:feedback', action.params.text);
        }
      }
    }
  }

  formatAnswer(value) {
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(2)).toString();
  }

  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  update() {
    if (this.activePopup) return;

    const onGround = this.player.body.touching.down;
    const speed = 240;
    const jumpVelocity = -440;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (onGround && (this.cursors.up.isDown || this.wasd.up.isDown || this.wasd.space.isDown)) {
      this.player.setVelocityY(jumpVelocity);
    }

    // Check checkpoints
    for (const cp of this.checkpoints) {
      if (Math.abs(this.player.x - cp.x) < 24 && Math.abs(this.player.y - cp.y) < 40) {
        if (this.lastCheckpoint !== cp) {
          this.lastCheckpoint = cp;
          cp.sprite.setTint(0x7dffb0);
          this.game.events.emit('hud:feedback', 'Checkpoint reached!');
        }
      }
    }
  }
}
