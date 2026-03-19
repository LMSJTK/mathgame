# Math Game Implementation Plan

## What the research suggests we should preserve

The research document points to a few principles that are more important than strict historical imitation:

1. **Math must be the gameplay, not a quiz layer.**
   The strongest examples in the research are modes where movement, target selection, bridge construction, logic routing, and progression all depend on math decisions.
2. **Use multiple activity types.**
   The document highlights fast equation solving, platforming with numeric constraints, bridge/puzzle construction with fractions and decimals, logic-heavy pattern tasks, and even a spreadsheet/graphing-style utility as distinct learning modalities.
3. **Support very high replayability with generated content.**
   The research repeatedly emphasizes dynamic difficulty and a very large generated problem set rather than a fixed worksheet bank.
4. **Blend authored levels with generated equations.**
   The most effective structure is not “infinite random play only”; it is authored spaces, hazards, pacing, and narrative moments combined with generated math prompts.
5. **Treat presentation as part of pedagogy.**
   The research calls out layered backgrounds, animated 2D characters, voice, and strong thematic feedback as part of what keeps the player engaged long enough for repetition to work.

## What the included reference tool already proves out

The included `ComplexEngineReference` project is a useful seed, but only as a foundation.

### Strengths worth reusing

- The editor already has a practical **three-column React workflow**: generation, canvas/refinement, and metadata/export.
- The backend already separates **asset CRUD** from **AI generation**, which is the right direction for maintainability.
- The asset model already supports **workflow state**, **entity binding**, **anchor point editing**, and **export-oriented metadata**.
- The generation route already shows a working pattern for **prompt templating**, **background removal**, and **normalized output sizing**.

### Gaps relative to this new math game

- It is built around **single sprite assets**, not full scene kits, layered backgrounds, UI theme parts, text box skins, portraits, or character animation sets.
- The metadata is tuned for a park-management game rather than a math adventure game.
- The editor has no concept of **level composition**, **trigger timelines**, **dialog/audio events**, or **equation injection points**.
- The current generation pipeline assumes a single image result and simple resize rules, but this project needs **multi-part asset packs**, variation tracking, and animation states.
- The export model does not define a runtime-ready schema for **platformer hazards, puzzle graphs, checkpoints, dialogue cues, or adaptive difficulty**.

## Recommended product architecture

I recommend building this as **one game runtime plus four internal content tools backed by shared content schemas**.

### 1. Asset Engine

This should evolve from the reference editor, but become a broader **content pack editor** instead of a sprite-only tool.

#### Asset categories to support

- Backgrounds
- Foregrounds / parallax layers
- Tiles / terrain pieces
- Interactive props
- UI frame pieces
- Text box / dialogue panel skins
- Buttons / badges / icons
- Character bodies
- Character face variants / expression sheets
- Character animation frames or strips
- FX assets
- Audio-linked portrait cards / speaker panels

#### Key changes from the reference tool

- Replace single `category + slot` assumptions with a **pack model**:
  - `asset_pack`
  - `asset_variant`
  - `animation_clip`
  - `ui_skin`
  - `portrait_set`
- Keep anchor editing, but add:
  - nine-slice guides for UI panels
  - collision / hurtbox / interaction bounds
  - layering and parallax preview
  - character origin / feet markers
  - animation previewer
- Add generation presets:
  - background concept
  - tileable terrain chunk
  - UI theme set
  - character turnaround / pose set
  - expression sheet
  - animation variation prompt templates
- Export not just files, but **manifests** the runtime can load directly.

### 2. Level Creator

This should be a separate tool, not squeezed into the asset editor.

#### Minimum capabilities

- Tile / platform painting
- Entity placement
- Hazard placement
- Spawn / checkpoint / exit markers
- Puzzle node placement
- Dialogue trigger placement
- Audio and SFX cue placement
- Equation zone placement
- Preview / simulate mode

#### Recommended editing modes

- **Scene mode** for backgrounds, layers, and camera framing
- **Gameplay mode** for platforms, collisions, hazards, and interactables
- **Narrative mode** for dialogue, voice, subtitle timing, and scripted moments
- **Math mode** for equation generators, rule filters, reward thresholds, and remediation paths

#### Level data model

Each level should serialize into a structure like:

- `scene`
- `layers[]`
- `physicsTiles[]`
- `entities[]`
- `triggers[]`
- `scriptTimeline[]`
- `mathEncounters[]`
- `rewards[]`
- `difficultyProfile`
- `localization`

### 3. Narrative / Audio Timeline Tooling

This can begin as a panel inside the level editor, but it should be treated as a first-class system.

#### Needed features

- Voice line import and preview
- Subtitle / text line authoring
- Speaker assignment
- Trigger conditions:
  - on level start
  - on checkpoint
  - on correct answer streak
  - on wrong answer
  - on entering region
  - on item collected
  - on boss / puzzle phase change
- Ducking / priority rules for overlapping sounds
- Timeline scrubbing for cutscenes or scripted sequences
- Localization-ready text IDs instead of hardcoded strings

#### Recommendation

Store dialogue and audio as **event-driven script data**, not embedded directly into level objects. That will make retiming and localization much easier.

### 4. Equation Generation Service

This is the part I would isolate the most aggressively.

Do **not** bury equation generation inside the game client or inside level JSON. Build a dedicated service/library that can:

- generate equations by skill family
- score difficulty
- tag equations by standards / topic
- guarantee solvability and uniqueness constraints
- generate distractors / wrong answers
- adjust output based on player mastery
- explain the solution path for hints and remediation

#### Suggested skill families

- addition / subtraction
- multiplication / division
- signed integers
- fractions
- decimals
- percents
- place value
- factors / multiples
- patterns / sequences
- pre-algebra / missing value equations
- estimation / bounds / comparison
- logic classification rules

#### Suggested equation schema

- `id`
- `skill`
- `subskill`
- `prompt`
- `canonicalAnswer`
- `alternateValidAnswers[]`
- `distractors[]`
- `difficulty`
- `timePressureScore`
- `workingMemoryScore`
- `representation` (numeric, visual, fraction blocks, number line, etc.)
- `hintSteps[]`
- `tags[]`

#### Difficulty model recommendation

Use a **multi-axis difficulty rating**, not a single number.

At minimum:

- conceptual complexity
- arithmetic load
- number magnitude
- representation complexity
- time pressure suitability
- motor coordination pressure

This matters because the research-inspired modes combine math with action. A problem that is mathematically easy may be hard inside a fast platforming context.

### 5. Game Runtime / Engine

For the runtime, target **2D side-view platforming plus node-and-state puzzle scenes**.

#### Core runtime systems

- physics / collisions
- player controller
- camera system
- trigger system
- dialogue / subtitle system
- audio playback / routing
- encounter scripting
- equation presenter
- reward / progression tracker
- save/checkpoint system
- adaptive difficulty manager

#### Important design choice

Do not make every encounter the same “popup equation box.”

Instead, support at least these encounter templates:

- **Target select**: choose the correct moving answer
- **Range landing**: jump only to valid results
- **Bridge build**: combine values to reach a target total
- **Route logic**: configure moving parts based on rules
- **Sequence repair**: fill missing pattern elements
- **Gate unlock**: answer sets that open platforming paths

## Recommended technical stack

Because the reference tool is already React + Express, I would keep that general direction for tooling.

### Tooling stack

- **Frontend:** React + TypeScript
- **Canvas/editor rendering:** PixiJS or Phaser editor scene embeds for level previews
- **Backend/API:** Node + TypeScript + Express or Fastify
- **Database:** SQLite for early development, with a clean migration path to Postgres if the content set grows
- **Asset processing:** Sharp plus optional AI generation/image cleanup services
- **File storage:** local content directories first, S3-compatible storage later if needed

### Runtime stack

My recommendation is **Phaser** if your priority is shipping a 2D browser-playable game with fast iteration on platforming and puzzle scenes.

Why Phaser here:

- faster path to side-view platforming than building a custom engine
- straightforward content loading from JSON manifests
- easy embedding of dialogue, triggers, and UI overlays
- works well with editor-authored scene data

If you already know PixiJS better, a custom runtime on Pixi is possible, but it will require more bespoke gameplay infrastructure.

## How I would evolve the current reference tool

### Keep

- `EditorView.tsx` layout pattern
- API client separation
- backend split between asset routes and generation routes
- anchor-point editing concept
- workflow states for review / approval

### Replace or expand

- Replace park-game metadata with **runtime content metadata**
- Expand `AssetRecord` into separate models for:
  - image assets
  - UI skins
  - character animation clips
  - level templates
  - dialogue/audio cues
- Add manifest export that writes directly into a shared `/content` structure for the runtime and level editor
- Replace footprint-only sprite sizing with **per-category processing pipelines**

## Recommended shared content structure

A shared content folder will reduce friction between tools and runtime.

Example shape:

```text
/content
  /assets
    /backgrounds
    /foregrounds
    /tiles
    /characters
    /ui
    /fx
    /audio
  /packs
  /levels
  /dialogue
  /math
    skills.json
    generators/
    encounter_templates/
  /manifests
```

## Phased implementation plan

### Phase 1: Foundations

- Define content schemas
- Build the equation generation library first
- Stand up a minimal Phaser runtime that can load one level JSON
- Fork the reference asset tool into a generalized Asset Engine

### Phase 2: Two vertical slices

Build two end-to-end playable modes before broadening scope:

1. **Banana Splat-style target selection**
2. **Crater Crossing-style platform estimation / valid-platform landing**

These two slices will validate:

- equation generation
- action + math pacing
- HUD/text box needs
- audio cue timing
- level triggers
- difficulty tuning

### Phase 3: Editor expansion

- Build the dedicated level creator
- Add dialogue/audio trigger editing
- Add asset pack export/import
- Add simple playtest telemetry capture

### Phase 4: Content scale-up

- Add bridge-builder / fraction puzzle mode
- Add logic-routing puzzle scenes
- Add adaptive difficulty and mastery tracking
- Add localization support
- Add more sophisticated AI-assisted asset workflows

## Highest-priority risks to manage early

1. **Over-randomization**
   Random equations are good; random level feel is not. Keep levels authored and inject controlled randomness only where it improves replayability.
2. **Too much tool coupling**
   If asset, level, dialogue, and equation systems all mutate one giant schema, iteration will slow down badly.
3. **Difficulty calibration**
   Math difficulty and action difficulty must be tuned separately, then combined.
4. **AI asset inconsistency**
   Without templates, style guides, and approval workflow, generated assets will drift too much for a coherent game.
5. **Narrative timing debt**
   If audio/subtitles are not event-driven from the start, retrofitting them later will be painful.

## Concrete recommendation for how to proceed next

If I were driving this project, I would do the next steps in this order:

1. **Define shared schemas** for assets, levels, dialogue events, and math encounters.
2. **Build the equation engine** with tagging and multi-axis difficulty before making a lot of levels.
3. **Refactor the included asset editor** into a pack-based Asset Engine that supports backgrounds, UI skins, and character variations.
4. **Create a minimal Phaser runtime** with one platforming scene and one target-selection scene.
5. **Build the level creator** once the runtime schema is stable from those two vertical slices.
6. **Add audio/dialogue tooling** as part of the level editor instead of leaving it as an afterthought.

That sequence gives you the fastest path to proving the core loop while avoiding premature investment in tooling that may need to be redesigned later.
