/** Types matching the level.schema.json and math-encounter.schema.json contracts. */

export type TileType = 'solid' | 'one_way' | 'hazard' | 'ice' | 'conveyor';

export interface PhysicsTile {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  assetRef?: string;
}

export type EntityType =
  | 'player_spawn'
  | 'checkpoint'
  | 'exit'
  | 'npc'
  | 'collectible'
  | 'enemy'
  | 'moving_platform'
  | 'equation_zone';

export interface Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  properties?: Record<string, unknown>;
  assetRef?: string;
}

export type EncounterType =
  | 'target_select'
  | 'range_landing'
  | 'bridge_build'
  | 'route_logic'
  | 'sequence_repair'
  | 'gate_unlock';

export interface MathEncounter {
  id: string;
  encounterType: EncounterType;
  skill: string;
  difficulty: string;
  successTarget: number;
  failureLimit: number;
  linkedEntityId?: string;
  reward?: { type: string; amount: number };
  remediation?: { onFailure: string };
}

export type TriggerConditionType =
  | 'on_enter_region'
  | 'on_level_start'
  | 'on_checkpoint'
  | 'on_correct_streak'
  | 'on_wrong_answer'
  | 'on_item_collected'
  | 'on_encounter_complete'
  | 'on_all_encounters_complete';

export type TriggerActionType =
  | 'play_dialogue'
  | 'play_sound'
  | 'play_music'
  | 'show_text'
  | 'spawn_entity'
  | 'remove_entity'
  | 'move_camera'
  | 'unlock_path'
  | 'set_flag'
  | 'start_encounter';

export interface TriggerCondition {
  type: TriggerConditionType;
  params?: Record<string, unknown>;
}

export interface TriggerAction {
  type: TriggerActionType;
  params?: Record<string, unknown>;
}

export interface Trigger {
  id: string;
  condition: TriggerCondition;
  actions: TriggerAction[];
  once: boolean;
}

export interface DialogueLine {
  text: string;
  voiceAssetRef?: string;
  duration?: number;
  emotion?: string;
}

export interface Dialogue {
  id: string;
  speaker: string;
  lines: DialogueLine[];
}

export interface Layer {
  id: string;
  type: 'background' | 'foreground' | 'parallax';
  assetRef?: string;
  scrollFactor?: { x: number; y: number };
  depth?: number;
}

export interface LevelScene {
  width: number;
  height: number;
  tileSize: number;
  gravity: number;
  background?: string;
}

export interface DifficultyProfile {
  adaptive: boolean;
  minDifficulty?: string;
  maxDifficulty?: string;
  escalationRate?: number;
}

export interface Level {
  id: string;
  name: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  scene: LevelScene;
  layers?: Layer[];
  physicsTiles: PhysicsTile[];
  entities: Entity[];
  triggers?: Trigger[];
  mathEncounters: MathEncounter[];
  dialogue?: Dialogue[];
  audio?: {
    backgroundMusic?: string;
    ambience?: string;
    soundEffects?: Record<string, string>;
  };
  rewards?: { type: string; amount: number; condition?: string }[];
  difficultyProfile?: DifficultyProfile;
}

/** Skills the equation engine supports */
export const SKILL_OPTIONS = [
  'addition_subtraction',
  'multiplication_division',
  'signed_integers',
  'missing_value_equations',
  'fractions',
  'decimals',
  'order_of_operations',
  'exponents',
] as const;

export const ENCOUNTER_TYPE_OPTIONS: EncounterType[] = [
  'target_select',
  'range_landing',
  'bridge_build',
  'route_logic',
  'sequence_repair',
  'gate_unlock',
];

export const TILE_TYPE_OPTIONS: TileType[] = ['solid', 'one_way', 'hazard', 'ice', 'conveyor'];

export const ENTITY_TYPE_OPTIONS: EntityType[] = [
  'player_spawn',
  'checkpoint',
  'exit',
  'npc',
  'collectible',
  'enemy',
  'moving_platform',
  'equation_zone',
];

export const TRIGGER_CONDITION_OPTIONS: TriggerConditionType[] = [
  'on_level_start',
  'on_enter_region',
  'on_checkpoint',
  'on_correct_streak',
  'on_wrong_answer',
  'on_item_collected',
  'on_encounter_complete',
  'on_all_encounters_complete',
];

export const TRIGGER_ACTION_OPTIONS: TriggerActionType[] = [
  'play_dialogue',
  'play_sound',
  'play_music',
  'show_text',
  'spawn_entity',
  'remove_entity',
  'move_camera',
  'unlock_path',
  'set_flag',
  'start_encounter',
];
