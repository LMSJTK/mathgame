import { useState } from 'react';
import type { AssetRecord, AssetCategory } from '../types/asset.ts';
import { ASSET_CATEGORIES } from '../types/asset.ts';

interface Props {
  assets: AssetRecord[];
  onSelect: (assetId: string) => void;
  onCancel: () => void;
  filterCategory?: AssetCategory;
}

const STATE_COLORS: Record<string, string> = {
  draft: '#6b7280',
  review: '#f59e0b',
  approved: '#22c55e',
  deprecated: '#ef4444',
};

const CATEGORY_ICONS: Record<AssetCategory, string> = {
  background: 'BG', foreground: 'FG', tile: 'T', character: 'CH',
  ui: 'UI', portrait: 'PT', text_panel: 'TP', fx: 'FX', prop: 'P',
};

export default function AssetPickerModal({ assets, onSelect, onCancel, filterCategory }: Props) {
  const [category, setCategory] = useState<AssetCategory | 'all'>(filterCategory ?? 'all');
  const [search, setSearch] = useState('');

  const filtered = assets.filter(a => {
    if (category !== 'all' && a.category !== category) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxHeight: '70vh',
          background: '#0b182b', border: '1px solid #1a2a4a', borderRadius: 10,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #1a2a4a',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#6ed4ff' }}>Select Asset</span>
          <button onClick={onCancel} style={{
            padding: '2px 8px', fontSize: 12, cursor: 'pointer',
            border: '1px solid #1a2a4a', borderRadius: 4,
            background: 'transparent', color: '#9eb8d4',
          }}>Cancel</button>
        </div>

        {/* Filters */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a2a4a', display: 'flex', gap: 8 }}>
          <input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              flex: 1, padding: '5px 8px', fontSize: 12,
              background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
            }}
          />
          <select value={category} onChange={e => setCategory(e.target.value as AssetCategory | 'all')} style={{
            padding: '3px 6px', fontSize: 11,
            background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
          }}>
            <option value="all">All</option>
            {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Clear option */}
        <div
          onClick={() => onSelect('')}
          style={{
            padding: '8px 16px', cursor: 'pointer',
            borderBottom: '1px solid #1a2a4a',
            color: '#9eb8d4', fontSize: 12,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0d1a30')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          — None (clear asset ref) —
        </div>

        {/* Asset grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ color: '#9eb8d4', fontSize: 12, padding: 20, textAlign: 'center' }}>
              {assets.length === 0 ? 'No assets in library. Create some in the Assets tab first.' : 'No assets match filters.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {filtered.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => onSelect(asset.id)}
                  style={{
                    padding: 10, borderRadius: 8, cursor: 'pointer',
                    border: '1px solid #1a2a4a', background: '#08111f',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#6ed4ff')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2a4a')}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 6,
                    background: '#1a2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: '#6ed4ff', fontWeight: 700,
                  }}>
                    {CATEGORY_ICONS[asset.category] || '?'}
                  </div>

                  {/* Name */}
                  <div style={{
                    fontSize: 11, color: '#eef6ff', fontWeight: 600, textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
                  }}>
                    {asset.name}
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: '#9eb8d4' }}>{asset.category.replace(/_/g, ' ')}</span>
                    <span style={{
                      fontSize: 8, padding: '1px 4px', borderRadius: 8,
                      background: (STATE_COLORS[asset.state] ?? '#6b7280') + '22',
                      color: STATE_COLORS[asset.state] ?? '#6b7280',
                    }}>{asset.state}</span>
                  </div>

                  {/* Dimensions */}
                  <div style={{ fontSize: 9, color: '#6b7280' }}>
                    {asset.width}x{asset.height}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
