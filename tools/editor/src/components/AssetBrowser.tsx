import { useState } from 'react';
import type { AssetRecord, AssetCategory, AssetState } from '../types/asset.ts';
import { ASSET_CATEGORIES, ASSET_STATES } from '../types/asset.ts';

interface Props {
  assets: AssetRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (asset: AssetRecord) => void;
  onRemove: (id: string) => void;
  onImport: (assets: AssetRecord[]) => void;
  onExport: () => void;
}

let nextId = 1;
function genAssetId(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
  return `${slug || 'asset'}_${Date.now().toString(36)}_${nextId++}`;
}

const STATE_COLORS: Record<AssetState, string> = {
  draft: '#6b7280',
  review: '#f59e0b',
  approved: '#22c55e',
  deprecated: '#ef4444',
};

export default function AssetBrowser({ assets, selectedId, onSelect, onAdd, onRemove, onImport, onExport }: Props) {
  const [filterCategory, setFilterCategory] = useState<AssetCategory | 'all'>('all');
  const [filterState, setFilterState] = useState<AssetState | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = assets.filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (filterState !== 'all' && a.state !== filterState) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => {
    const now = new Date().toISOString();
    const asset: AssetRecord = {
      id: genAssetId('new_asset'),
      name: 'New Asset',
      description: '',
      category: 'prop',
      state: 'draft',
      imagePath: '',
      anchor_x: 0.5,
      anchor_y: 0.5,
      width: 64,
      height: 64,
      createdAt: now,
      updatedAt: now,
    };
    onAdd(asset);
    onSelect(asset.id);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          const list: AssetRecord[] = Array.isArray(data) ? data : [data];
          onImport(list);
        } catch {
          alert('Invalid asset JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1a2a4a', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleCreate} style={btnStyle}>+ New</button>
          <button onClick={handleImport} style={btnStyle}>Import</button>
          <button onClick={onExport} style={btnStyle}>Export</button>
        </div>

        {/* Search */}
        <input
          placeholder="Search assets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '5px 8px', fontSize: 12,
            background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
          }}
        />

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as AssetCategory | 'all')} style={selectStyle}>
            <option value="all">All Categories</option>
            {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={filterState} onChange={e => setFilterState(e.target.value as AssetState | 'all')} style={selectStyle}>
            <option value="all">All States</option>
            {ASSET_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Asset list */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <div style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
          Assets ({filtered.length})
        </div>

        {filtered.map(asset => {
          const isSelected = asset.id === selectedId;
          return (
            <div
              key={asset.id}
              onClick={() => onSelect(asset.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                border: isSelected ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
                background: isSelected ? '#0d1a30' : '#08111f',
              }}
            >
              {/* Thumbnail placeholder */}
              <div style={{
                width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                background: '#1a2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#6ed4ff', fontWeight: 700,
              }}>
                {categoryIcon(asset.category)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#eef6ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {asset.name}
                </div>
                <div style={{ fontSize: 10, color: '#9eb8d4' }}>
                  {asset.category.replace(/_/g, ' ')} — {asset.width}x{asset.height}
                </div>
              </div>

              {/* State badge */}
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 10,
                background: STATE_COLORS[asset.state] + '22',
                color: STATE_COLORS[asset.state],
                border: `1px solid ${STATE_COLORS[asset.state]}44`,
                textTransform: 'uppercase', fontWeight: 600,
              }}>
                {asset.state}
              </span>

              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); onRemove(asset.id); }}
                style={{
                  padding: '1px 6px', fontSize: 10, cursor: 'pointer',
                  border: '1px solid #6a2a2a', borderRadius: 4,
                  background: 'transparent', color: '#ff6e6e',
                }}
              >x</button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ color: '#9eb8d4', fontSize: 12, padding: 20, textAlign: 'center' }}>
            {assets.length === 0 ? 'No assets yet. Click + New to create one, or Import from JSON.' : 'No assets match the current filters.'}
          </div>
        )}
      </div>
    </div>
  );
}

function categoryIcon(cat: AssetCategory): string {
  const icons: Record<AssetCategory, string> = {
    background: 'BG',
    foreground: 'FG',
    tile: 'T',
    character: 'CH',
    ui: 'UI',
    portrait: 'PT',
    text_panel: 'TP',
    fx: 'FX',
    prop: 'P',
  };
  return icons[cat] || '?';
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: 11, cursor: 'pointer',
  border: '1px solid #6ed4ff', borderRadius: 5,
  background: '#1a3050', color: '#6ed4ff',
};

const selectStyle: React.CSSProperties = {
  flex: 1, padding: '3px 6px', fontSize: 11,
  background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
};
