/**
 * Math Game Asset Editor — API Client
 * Forked from ComplexEngineReference, adapted for math game asset categories.
 */

export type AssetCategory =
  | 'background'
  | 'foreground'
  | 'tile'
  | 'character'
  | 'ui'
  | 'portrait'
  | 'fx'
  | 'prop'
  | 'text_panel';

export type AssetState = 'draft' | 'review' | 'approved' | 'deprecated';

export type AnimationClip = {
  name: string; // e.g., 'idle', 'walk', 'jump', 'celebrate', 'fail'
  frames: string[]; // paths to frame images
  frameRate: number;
  loop: boolean;
};

export type NineSlice = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export interface AssetRecord {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  state: AssetState;

  // Image data
  imagePath: string;
  anchor_x: number;
  anchor_y: number;
  width: number;
  height: number;

  // Pack model
  packId?: string;
  variantLabel?: string;

  // Animation support
  animations?: AnimationClip[];

  // UI-specific
  nineSlice?: NineSlice;

  // Character-specific
  characterId?: string;
  expression?: string; // e.g., 'neutral', 'happy', 'sad', 'surprised'

  // Collision / interaction bounds (for tiles and props)
  collisionBox?: { x: number; y: number; w: number; h: number };

  // Parallax layer info (for backgrounds/foregrounds)
  scrollFactor?: { x: number; y: number };
  depth?: number;

  // Generation metadata
  prompt?: string;
  model?: string;

  createdAt: string;
  updatedAt: string;
}

const BASE = '/api/assets';
const GENERATE_BASE = '/api/generate';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const assetsApi = {
  list(category?: AssetCategory, state?: AssetState): Promise<AssetRecord[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (state) params.set('state', state);
    const qs = params.toString();
    return request(`${BASE}${qs ? `?${qs}` : ''}`);
  },

  get(id: string): Promise<AssetRecord> {
    return request(`${BASE}/${id}`);
  },

  create(data: Partial<AssetRecord>): Promise<AssetRecord> {
    return request(BASE, { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: string, data: Partial<AssetRecord>): Promise<AssetRecord> {
    return request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  setAnchor(id: string, x: number, y: number): Promise<AssetRecord> {
    return request(`${BASE}/${id}/anchor`, {
      method: 'PATCH',
      body: JSON.stringify({ anchor_x: x, anchor_y: y }),
    });
  },

  setState(id: string, state: AssetState): Promise<AssetRecord> {
    return request(`${BASE}/${id}/state`, {
      method: 'PATCH',
      body: JSON.stringify({ state }),
    });
  },

  setCollisionBox(id: string, box: AssetRecord['collisionBox']): Promise<AssetRecord> {
    return request(`${BASE}/${id}/collision`, {
      method: 'PATCH',
      body: JSON.stringify(box),
    });
  },

  setNineSlice(id: string, nineSlice: NineSlice): Promise<AssetRecord> {
    return request(`${BASE}/${id}/nine-slice`, {
      method: 'PATCH',
      body: JSON.stringify(nineSlice),
    });
  },

  addAnimation(id: string, clip: AnimationClip): Promise<AssetRecord> {
    return request(`${BASE}/${id}/animations`, {
      method: 'POST',
      body: JSON.stringify(clip),
    });
  },

  delete(id: string): Promise<void> {
    return request(`${BASE}/${id}`, { method: 'DELETE' });
  },
};

export const generateApi = {
  generate(params: {
    description: string;
    category: AssetCategory;
    assetId: string;
    width?: number;
    height?: number;
    style?: string;
  }): Promise<{ prompt: string; imagePath: string; model: string; size: { w: number; h: number } }> {
    return request(GENERATE_BASE, { method: 'POST', body: JSON.stringify(params) });
  },

  generateVariation(params: {
    sourceAssetId: string;
    variantLabel: string;
    description: string;
  }): Promise<{ prompt: string; imagePath: string }> {
    return request(`${GENERATE_BASE}/variation`, { method: 'POST', body: JSON.stringify(params) });
  },

  generateAnimationFrames(params: {
    assetId: string;
    clipName: string;
    frameCount: number;
    description: string;
  }): Promise<{ frames: string[] }> {
    return request(`${GENERATE_BASE}/animation-frames`, { method: 'POST', body: JSON.stringify(params) });
  },
};

export const exportApi = {
  exportManifest(): Promise<{ path: string; assetCount: number }> {
    return request('/api/export/manifest', { method: 'POST' });
  },

  exportPack(packId: string): Promise<{ path: string }> {
    return request(`/api/export/pack/${packId}`, { method: 'POST' });
  },
};
