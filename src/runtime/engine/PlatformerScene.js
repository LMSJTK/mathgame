import { generateEquation } from '../../math/equationEngine.js';

/**
 * Full platformer scene that loads level data from JSON.
 * Supports physics tiles, entities, equation zones, triggers, dialogue,
 * collectibles, checkpoints, and adaptive difficulty.
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
    this.activePopup = null;
    this.activeDialogue = null;
    this.activeSubEncounter = false;
    this.levelComplete = false;
    this.collectedItems = new Set();

    const level = this.levelData || this.createDemoLevel(width, height);
    this.level = level;

    // World bounds
    const sceneW = (level.scene?.width || 40) * (level.scene?.tileSize || 32);
    const sceneH = (level.scene?.height || 20) * (level.scene?.tileSize || 32);
    this.physics.world.setBounds(0, 0, sceneW, sceneH);
    this.cameras.main.setBackgroundColor('#08111f');

    // Build world
    this.buildPhysicsTiles(level.physicsTiles);
    this.buildEntities(level.entities, sceneH);
    this.buildCollectibles(level.entities);
    this.buildEquationZones(level.entities);
    this.buildTriggerRegions(level.triggers || []);

    this.encounters = level.mathEncounters || [];
    this.triggers = level.triggers || [];
    this.dialogueData = level.dialogue || [];

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

    // Level name display
    if (level.name) {
      const cam = this.cameras.main;
      const nameText = this.add.text(cam.width / 2, 30, level.name, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#6ed4ff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setAlpha(1);

      this.tweens.add({
        targets: nameText,
        alpha: 0,
        delay: 2500,
        duration: 1000,
        onComplete: () => nameText.destroy(),
      });
    }

    // Fire level-start triggers
    this.fireTrigger('on_level_start');

    this.game.events.emit('hud:update', {
      equation: 'Explore the level!',
      skill: level.name || '—',
      difficulty: level.difficulty || '—',
      score: this.score,
      streak: this.streak,
    });
  }

  // ─── World Building ───────────────────────────────────────────

  buildPhysicsTiles(tiles) {
    this.solids = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    for (const tile of tiles) {
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
        if (tile.type === 'ice') s.setTint(0x88ccff);
        if (tile.type === 'conveyor') s.setTint(0xffaa44);
        s.refreshBody();
        s.tileType = tile.type || 'solid';
      }
    }
  }

  buildEntities(entities, sceneH) {
    // Player spawn
    const spawn = entities.find(e => e.type === 'player_spawn') || { x: 64, y: sceneH - 80 };
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.hazards, this.onHazard, null, this);

    // Checkpoints
    this.checkpoints = [];
    this.lastCheckpoint = { x: spawn.x, y: spawn.y };
    for (const ent of entities.filter(e => e.type === 'checkpoint')) {
      const cp = this.add.image(ent.x, ent.y, 'checkpoint').setOrigin(0.5, 1);
      this.checkpoints.push({ id: ent.id, x: ent.x, y: ent.y, sprite: cp, reached: false });
    }

    // Exit
    this.exitLocked = true;
    const exitEnt = entities.find(e => e.type === 'exit');
    if (exitEnt) {
      this.exitPortal = this.physics.add.staticImage(exitEnt.x, exitEnt.y, 'exit_portal');
      this.exitPortal.setAlpha(0.3); // Dimmed until unlocked
      this.physics.add.overlap(this.player, this.exitPortal, this.onExit, null, this);
    }
  }

  buildCollectibles(entities) {
    this.collectibles = this.physics.add.staticGroup();
    this.collectibleData = [];

    for (const ent of entities.filter(e => e.type === 'collectible')) {
      // Draw a coin-like circle
      const gfx = this.add.graphics();
      gfx.fillStyle(0xf59e0b, 1);
      gfx.fillCircle(12, 12, 12);
      gfx.lineStyle(2, 0xfbbf24, 0.8);
      gfx.strokeCircle(12, 12, 12);
      gfx.generateTexture(`coin_${ent.id}`, 24, 24);
      gfx.destroy();

      const coin = this.collectibles.create(ent.x, ent.y, `coin_${ent.id}`);
      coin.refreshBody();
      this.collectibleData.push({ id: ent.id, sprite: coin, value: ent.properties?.value || 5 });
    }

    this.physics.add.overlap(this.player, this.collectibles, (player, coin) => {
      const data = this.collectibleData.find(c => c.sprite === coin);
      if (!data || this.collectedItems.has(data.id)) return;
      this.collectedItems.add(data.id);
      this.score += data.value;
      coin.destroy();
      this.game.events.emit('hud:update', { score: this.score });
      this.game.events.emit('hud:feedback', `+${data.value} points!`);
      this.fireTrigger('on_item_collected', { entityId: data.id });
    }, null, this);
  }

  buildEquationZones(entities) {
    this.equationZones = [];

    for (const ent of entities.filter(e => e.type === 'equation_zone')) {
      const w = ent.properties?.width || 64;
      const h = ent.properties?.height || 64;

      // Visual glow indicator
      const glow = this.add.rectangle(ent.x, ent.y, w, h, 0x6ed4ff, 0.08)
        .setStrokeStyle(1, 0x6ed4ff, 0.3);

      // Pulsing animation
      this.tweens.add({
        targets: glow,
        alpha: 0.15,
        yoyo: true,
        repeat: -1,
        duration: 1200,
        ease: 'Sine.easeInOut',
      });

      const zone = this.add.zone(ent.x, ent.y, w, h);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => this.onEquationZone(ent), null, this);

      this.equationZones.push({ entity: ent, zone, glow, solved: false });
    }
  }

  buildTriggerRegions(triggers) {
    this.triggerZones = [];

    for (const trigger of triggers) {
      if (trigger.condition.type === 'on_enter_region' && trigger.condition.params) {
        const { x, y, w, h } = trigger.condition.params;
        const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
        this.physics.add.existing(zone, true);
        this.physics.add.overlap(this.player, zone, () => {
          this.fireTrigger('on_enter_region', { triggerId: trigger.id });
        }, null, this);
        this.triggerZones.push({ triggerId: trigger.id, zone });
      }
    }
  }

  // ─── Dialogue System ──────────────────────────────────────────

  playDialogue(dialogueId) {
    const dialogue = this.dialogueData.find(d => d.id === dialogueId);
    if (!dialogue || this.activeDialogue) return;

    // Pause player during dialogue
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    this.activeDialogue = {
      dialogue,
      lineIndex: 0,
    };

    this.showDialogueLine();
  }

  showDialogueLine() {
    if (!this.activeDialogue) return;
    const { dialogue, lineIndex } = this.activeDialogue;

    if (lineIndex >= dialogue.lines.length) {
      this.closeDialogue();
      return;
    }

    const line = dialogue.lines[lineIndex];
    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / 2;
    const bottom = cam.scrollY + cam.height;

    // Clean up previous dialogue elements
    if (this.dialogueElements) {
      for (const el of this.dialogueElements) el.destroy();
    }

    // Dialogue box at bottom of screen
    const boxH = 100;
    const boxY = bottom - boxH / 2 - 10;

    const bg = this.add.rectangle(cx, boxY, cam.width - 40, boxH, 0x0b182b, 0.92)
      .setStrokeStyle(2, 0x6ed4ff, 0.4)
      .setDepth(200)
      .setScrollFactor(0);

    // Reset position for scroll factor 0
    bg.setPosition(cam.width / 2, cam.height - boxH / 2 - 10);

    const speakerText = this.add.text(40, cam.height - boxH - 4, dialogue.speaker, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#6ed4ff',
    }).setDepth(201).setScrollFactor(0);

    const lineText = this.add.text(40, cam.height - boxH + 22, line.text, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      color: '#eef6ff',
      wordWrap: { width: cam.width - 80 },
    }).setDepth(201).setScrollFactor(0);

    const emotion = line.emotion || 'neutral';
    const emotionText = this.add.text(cam.width - 40, cam.height - boxH + 22, `[${emotion}]`, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
    }).setOrigin(1, 0).setDepth(201).setScrollFactor(0);

    const continueText = this.add.text(cam.width / 2, cam.height - 18, 'Click or press Space to continue', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    // Blink the continue prompt
    this.tweens.add({
      targets: continueText,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 800,
    });

    this.dialogueElements = [bg, speakerText, lineText, emotionText, continueText];

    // Click-through area
    const clickZone = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(199)
      .setInteractive({ useHandCursor: true });
    this.dialogueElements.push(clickZone);

    clickZone.on('pointerdown', () => this.advanceDialogue());

    // Auto-advance if duration is set
    if (line.duration) {
      this.dialogueTimer = this.time.delayedCall(line.duration * 1000, () => {
        this.advanceDialogue();
      });
    }
  }

  advanceDialogue() {
    if (!this.activeDialogue) return;
    if (this.dialogueTimer) {
      this.dialogueTimer.remove();
      this.dialogueTimer = null;
    }
    this.activeDialogue.lineIndex += 1;
    this.showDialogueLine();
  }

  closeDialogue() {
    if (this.dialogueElements) {
      for (const el of this.dialogueElements) el.destroy();
      this.dialogueElements = null;
    }
    if (this.dialogueTimer) {
      this.dialogueTimer.remove();
      this.dialogueTimer = null;
    }
    this.activeDialogue = null;
    this.player.body.enable = true;
  }

  // ─── Trigger System ───────────────────────────────────────────

  fireTrigger(conditionType, params = {}) {
    for (const trigger of this.triggers) {
      // Check if already fired (for one-shot triggers)
      if (trigger.once && this.firedTriggers.has(trigger.id)) continue;

      const cond = trigger.condition;

      // Match condition type
      if (cond.type !== conditionType) {
        // Special case: on_enter_region triggers are matched by triggerId
        if (conditionType === 'on_enter_region' && params.triggerId === trigger.id) {
          // Matched by zone overlap
        } else {
          continue;
        }
      }

      // Extra condition checks
      if (cond.type === 'on_correct_streak' && this.streak < (cond.params?.count || 3)) continue;
      if (cond.type === 'on_encounter_complete' && params.encounterId !== cond.params?.encounterId) continue;

      // Check all_encounters_complete
      if (cond.type === 'on_all_encounters_complete') {
        const allSolved = this.equationZones.every(z => z.solved);
        if (!allSolved) continue;
      }

      // Mark as fired
      this.firedTriggers.add(trigger.id);

      // Execute actions
      this.executeTriggerActions(trigger.actions);
    }
  }

  executeTriggerActions(actions) {
    for (const action of actions) {
      switch (action.type) {
        case 'show_text':
          this.game.events.emit('hud:feedback', action.params.text);
          break;

        case 'play_dialogue':
          this.playDialogue(action.params.dialogueId);
          break;

        case 'play_sound':
          // Sound effect stub — logs until audio assets exist
          console.log(`[audio] SFX: ${action.params.sfx}`);
          break;

        case 'play_music':
          console.log(`[audio] Music: ${action.params.track} @ volume ${action.params.volume}`);
          break;

        case 'unlock_path': {
          const entityId = action.params.entityId;
          if (entityId === 'exit' && this.exitPortal) {
            this.exitLocked = false;
            this.exitPortal.setAlpha(1);
            // Flash the portal
            this.tweens.add({
              targets: this.exitPortal,
              scaleX: 1.3,
              scaleY: 1.3,
              yoyo: true,
              duration: 300,
              repeat: 2,
              onComplete: () => this.exitPortal.setScale(1),
            });
          }
          break;
        }

        case 'spawn_entity':
          console.log(`[trigger] Spawn entity: ${JSON.stringify(action.params)}`);
          break;

        case 'remove_entity':
          console.log(`[trigger] Remove entity: ${action.params.entityId}`);
          break;

        case 'set_flag':
          this.flags[action.params.key] = action.params.value ?? true;
          break;

        case 'start_encounter':
          console.log(`[trigger] Start encounter: ${action.params.encounterId}`);
          break;

        default:
          console.log(`[trigger] Unknown action: ${action.type}`);
      }
    }
  }

  // ─── Encounter type → scene mapping ────────────────────────────

  static ENCOUNTER_SCENES = {
    target_select: 'TargetSelectScene',
    range_landing: 'RangeLandingScene',
    bridge_build: 'BridgeBuildScene',
    route_logic: 'RouteLogicScene',
    sequence_repair: 'SequenceRepairScene',
  };

  // ─── Equation Encounters ──────────────────────────────────────

  onEquationZone(entity) {
    if (this.activePopup || this.activeDialogue || this.activeSubEncounter) return;
    const zoneState = this.equationZones.find(z => z.entity.id === entity.id);
    if (zoneState?.solved) return;

    const encounterId = entity.properties?.encounterId;
    const encounter = this.encounters.find(e => e.id === encounterId);
    if (!encounter) return;

    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    // Check if this encounter type has a dedicated scene
    const subSceneKey = PlatformerScene.ENCOUNTER_SCENES[encounter.encounterType];
    if (subSceneKey) {
      this.launchSubEncounter(subSceneKey, encounter, zoneState);
      return;
    }

    // Default: gate_unlock popup
    const equation = generateEquation({ skill: encounter.skill, difficulty: encounter.difficulty });

    this.game.events.emit('hud:update', {
      equation: equation.prompt,
      skill: equation.skill,
      difficulty: equation.difficulty.label,
    });

    this.showEquationPopup(equation, zoneState, encounter);
  }

  launchSubEncounter(sceneKey, encounter, zoneState) {
    this.activeSubEncounter = true;

    // Pause this scene visually but keep it running for the result listener
    this.scene.pause();
    this.scene.stop('HudScene');

    // Launch the encounter scene
    this.scene.launch(sceneKey, { encounter });

    // Listen for the result
    const onResult = (result) => {
      this.game.events.off('encounter:result', onResult);

      // Stop the sub-scene
      this.scene.stop(sceneKey);
      this.scene.resume('PlatformerScene');
      this.scene.launch('HudScene');
      this.activeSubEncounter = false;

      if (result.success) {
        zoneState.solved = true;
        this.score += result.score || 10;
        this.streak = result.streak || this.streak + 1;

        // Update glow
        if (zoneState.glow) {
          this.tweens.killTweensOf(zoneState.glow);
          zoneState.glow.setFillStyle(0x7dffb0, 0.12);
          zoneState.glow.setStrokeStyle(1, 0x7dffb0, 0.4);
        }

        this.game.events.emit('hud:feedback', 'Encounter complete!');
        this.game.events.emit('hud:update', { score: this.score, streak: this.streak });

        this.fireTrigger('on_encounter_complete', { encounterId: encounter.id });
        this.fireTrigger('on_correct_streak');

        if (this.equationZones.every(z => z.solved)) {
          this.fireTrigger('on_all_encounters_complete');
        }
      }

      this.player.body.enable = true;
    };

    this.game.events.on('encounter:result', onResult);
  }

  showEquationPopup(equation, zoneState, encounter) {
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const overlay = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.6)
      .setDepth(100).setScrollFactor(0);

    const panel = this.add.rectangle(cx, cy, 420, 280, 0x0b182b, 0.95)
      .setStrokeStyle(2, 0x6ed4ff, 0.5)
      .setDepth(101).setScrollFactor(0);

    // Encounter type label
    const typeLabel = this.add.text(cx, cy - 110, encounter.encounterType.replace('_', ' ').toUpperCase(), {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#9eb8d4',
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    const prompt = this.add.text(cx, cy - 80, equation.prompt, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#6ed4ff',
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    // Hint button
    const hintBtn = this.add.text(cx, cy + 105, 'Show Hint', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '12px',
      color: '#9eb8d4',
    }).setOrigin(0.5).setDepth(103).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    hintBtn.on('pointerdown', () => {
      this.game.events.emit('hud:hint', equation.hintSteps.join(' → '));
      hintBtn.setText('Hint shown in HUD');
      hintBtn.removeInteractive();
    });

    // Answer buttons in 2x2 grid
    const answers = this.shuffleArray([equation.canonicalAnswer, ...equation.distractors]);
    const buttons = [];
    const btnW = 140;
    const gap = 16;
    const startX = cx - btnW - gap / 2 + btnW / 2;

    answers.forEach((value, i) => {
      const bx = startX + (i % 2) * (btnW + gap);
      const by = cy + (i < 2 ? -15 : 45);

      const bg = this.add.rectangle(bx, by, btnW, 44, 0x244a8c, 0.9)
        .setStrokeStyle(1, 0x95efff, 0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(102).setScrollFactor(0);

      const label = this.add.text(bx, by, this.formatAnswer(value), {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#eef6ff',
      }).setOrigin(0.5).setDepth(103).setScrollFactor(0);

      bg.on('pointerover', () => bg.setStrokeStyle(2, 0x7dffb0, 0.8));
      bg.on('pointerout', () => bg.setStrokeStyle(1, 0x95efff, 0.5));
      bg.on('pointerdown', () => this.handlePopupAnswer(
        value === equation.canonicalAnswer, value, equation, zoneState, encounter, popupElements
      ));

      buttons.push({ bg, label });
    });

    const popupElements = [overlay, panel, typeLabel, prompt, hintBtn, ...buttons.flatMap(b => [b.bg, b.label])];
    this.activePopup = popupElements;
  }

  handlePopupAnswer(isCorrect, value, equation, zoneState, encounter, elements) {
    if (isCorrect) {
      this.score += 10 + this.streak * 2;
      this.streak += 1;
      zoneState.solved = true;

      // Remove glow
      if (zoneState.glow) {
        this.tweens.killTweensOf(zoneState.glow);
        zoneState.glow.setFillStyle(0x7dffb0, 0.12);
        zoneState.glow.setStrokeStyle(1, 0x7dffb0, 0.4);
      }

      this.game.events.emit('hud:feedback', `Correct! ${this.formatAnswer(value)} unlocks the path.`);
      this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
      this.game.events.emit('hud:hint', '');

      this.fireTrigger('on_encounter_complete', { encounterId: encounter.id });
      this.fireTrigger('on_correct_streak');

      // Check if all encounters are solved
      const allSolved = this.equationZones.every(z => z.solved);
      if (allSolved) {
        this.fireTrigger('on_all_encounters_complete');
      }

      // Close popup
      for (const el of elements) el.destroy();
      this.activePopup = null;
      this.player.body.enable = true;
    } else {
      this.score = Math.max(0, this.score - 5);
      this.streak = 0;
      this.game.events.emit('hud:feedback', `${this.formatAnswer(value)} is wrong. Try again!`);
      this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
      this.game.events.emit('hud:hint', equation.hintSteps[0]);
      this.fireTrigger('on_wrong_answer');
    }
  }

  // ─── Event Handlers ───────────────────────────────────────────

  onHazard() {
    this.player.setPosition(this.lastCheckpoint.x, this.lastCheckpoint.y - 20);
    this.player.setVelocity(0, 0);
    this.score = Math.max(0, this.score - 10);
    this.streak = 0;
    this.game.events.emit('hud:feedback', 'Ouch! Respawned at checkpoint.');
    this.game.events.emit('hud:update', { score: this.score, streak: this.streak });
  }

  onExit() {
    if (this.activePopup || this.activeDialogue || this.activeSubEncounter || this.levelComplete) return;
    if (this.exitLocked) {
      this.game.events.emit('hud:feedback', 'The exit is locked. Solve all equations first!');
      return;
    }

    this.levelComplete = true;
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    // Calculate stars
    const stars = this.calculateStars();

    this.game.events.emit('hud:feedback', `Level complete! Score: ${this.score} — Stars: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`);

    this.time.delayedCall(2500, () => {
      this.scene.stop('HudScene');
      this.scene.start('MenuScene');
    });
  }

  calculateStars() {
    let stars = 0;
    const rewards = this.level.rewards || [];

    for (const reward of rewards) {
      if (reward.condition === 'complete_level') {
        stars += reward.amount;
      }
      if (reward.condition === 'no_wrong_answers' && this.streak > 0) {
        // Simplified: if current streak > 0 they haven't gotten one wrong recently
        // In a real implementation, track total wrong answers
        stars += reward.amount;
      }
      if (reward.condition === 'collect_all_items') {
        const totalCollectibles = this.level.entities.filter(e => e.type === 'collectible').length;
        if (totalCollectibles > 0 && this.collectedItems.size >= totalCollectibles) {
          stars += reward.amount;
        }
      }
    }

    return Math.min(stars, 3);
  }

  // ─── Demo Level Fallback ──────────────────────────────────────

  createDemoLevel(width, height) {
    const ts = 32;
    const cols = Math.ceil(width / ts) + 20;
    const rows = Math.ceil(height / ts);
    const sceneW = cols * ts;
    const sceneH = rows * ts;
    const groundY = sceneH - ts;

    const physicsTiles = [];
    for (let x = 0; x < sceneW; x += ts) {
      physicsTiles.push({ x, y: groundY, w: ts, h: ts, type: 'solid' });
    }

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

    physicsTiles.push({ x: 700, y: groundY, w: 64, h: ts, type: 'hazard' });

    return {
      id: 'demo-auto',
      name: 'Quick Demo',
      difficulty: 'easy',
      scene: { width: cols, height: rows, tileSize: ts, gravity: 800 },
      physicsTiles,
      entities: [
        { id: 'spawn', type: 'player_spawn', x: 64, y: groundY - 60 },
        { id: 'cp1', type: 'checkpoint', x: 500, y: groundY },
        { id: 'exit', type: 'exit', x: 1350, y: groundY - 40 },
        { id: 'eq1', type: 'equation_zone', x: 260, y: groundY - 120, properties: { width: 80, height: 80, encounterId: 'enc1' } },
        { id: 'eq2', type: 'equation_zone', x: 870, y: groundY - 220, properties: { width: 80, height: 80, encounterId: 'enc2' } },
        { id: 'eq3', type: 'equation_zone', x: 1100, y: groundY - 170, properties: { width: 80, height: 80, encounterId: 'enc3' } },
        { id: 'coin1', type: 'collectible', x: 450, y: groundY - 200, properties: { value: 5 } },
        { id: 'coin2', type: 'collectible', x: 950, y: groundY - 170, properties: { value: 5 } },
      ],
      mathEncounters: [
        { id: 'enc1', encounterType: 'gate_unlock', skill: 'addition_subtraction', difficulty: 'easy', successTarget: 1, failureLimit: 3 },
        { id: 'enc2', encounterType: 'gate_unlock', skill: 'multiplication_division', difficulty: 'medium', successTarget: 1, failureLimit: 3 },
        { id: 'enc3', encounterType: 'gate_unlock', skill: 'exponents', difficulty: 'easy', successTarget: 1, failureLimit: 3 },
      ],
      triggers: [
        {
          id: 'welcome',
          condition: { type: 'on_level_start' },
          actions: [{ type: 'show_text', params: { text: 'Welcome! Run and jump through the level. Step into glowing zones to solve equations.' } }],
          once: true,
        },
        {
          id: 'all_done',
          condition: { type: 'on_all_encounters_complete' },
          actions: [
            { type: 'unlock_path', params: { entityId: 'exit' } },
            { type: 'show_text', params: { text: 'All equations solved! The exit is open!' } },
          ],
          once: true,
        },
      ],
      dialogue: [],
      rewards: [
        { type: 'star', amount: 1, condition: 'complete_level' },
        { type: 'star', amount: 1, condition: 'no_wrong_answers' },
        { type: 'star', amount: 1, condition: 'collect_all_items' },
      ],
    };
  }

  // ─── Utilities ────────────────────────────────────────────────

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

  // ─── Game Loop ────────────────────────────────────────────────

  update() {
    if (this.activePopup || this.activeDialogue || this.activeSubEncounter || this.levelComplete) {
      // Allow space to advance dialogue
      if (this.activeDialogue && Phaser.Input.Keyboard.JustDown(this.wasd.space)) {
        this.advanceDialogue();
      }
      return;
    }

    const onGround = this.player.body.touching.down;
    const speed = 240;
    const jumpVelocity = -440;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (onGround && (this.cursors.up.isDown || this.wasd.up.isDown || this.wasd.space.isDown)) {
      this.player.setVelocityY(jumpVelocity);
    }

    // Checkpoint detection
    for (const cp of this.checkpoints) {
      if (cp.reached) continue;
      if (Math.abs(this.player.x - cp.x) < 24 && Math.abs(this.player.y - cp.y) < 48) {
        cp.reached = true;
        this.lastCheckpoint = cp;
        cp.sprite.setTint(0x7dffb0);
        this.game.events.emit('hud:feedback', 'Checkpoint reached!');
        this.fireTrigger('on_checkpoint', { checkpointId: cp.id });
      }
    }
  }
}
