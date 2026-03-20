/** Types matching the asset.schema.json contract. */

export type AssetCategory =
  | 'background'
  | 'foreground'
  | 'tile'
  | 'character'
  | 'ui'
  | 'portrait'
  | 'text_panel'
  | 'fx'
  | 'prop';

export type AssetState = 'draft' | 'review' | 'approved' | 'deprecated';

export interface AnimationClip {
  name: string;
  frames: string[];
  frameRate: number;
  loop: boolean;
}

export interface NineSlice {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AssetRecord {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  state: AssetState;

  imagePath: string;
  anchor_x: number;
  anchor_y: number;
  width: number;
  height: number;

  packId?: string;
  variantLabel?: string;

  animations?: AnimationClip[];
  nineSlice?: NineSlice;

  characterId?: string;
  expression?: string;

  collisionBox?: { x: number; y: number; w: number; h: number };
  scrollFactor?: { x: number; y: number };
  depth?: number;

  prompt?: string;
  model?: string;

  createdAt: string;
  updatedAt: string;
}

export const ASSET_CATEGORIES: AssetCategory[] = [
  'background', 'foreground', 'tile', 'character', 'ui', 'portrait', 'text_panel', 'fx', 'prop',
];

export const ASSET_STATES: AssetState[] = ['draft', 'review', 'approved', 'deprecated'];

export const EXPRESSIONS = [
  'neutral', 'happy', 'sad', 'surprised', 'angry', 'confused', 'excited',
];
