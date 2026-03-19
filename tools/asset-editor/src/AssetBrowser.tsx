/**
 * Math Game Asset Editor — Asset Browser
 * Forked from ComplexEngineReference, adapted for math game categories.
 */
import React, { useEffect, useState } from 'react';
import { assetsApi, type AssetRecord, type AssetCategory } from './api';

const CATEGORY_FILTERS: { value: AssetCategory | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'background', label: 'Backgrounds' },
  { value: 'foreground', label: 'Foregrounds' },
  { value: 'tile', label: 'Tiles' },
  { value: 'character', label: 'Characters' },
  { value: 'ui', label: 'UI' },
  { value: 'portrait', label: 'Portraits' },
  { value: 'text_panel', label: 'Text Panels' },
  { value: 'fx', label: 'FX' },
  { value: 'prop', label: 'Props' },
];

const STATE_COLORS: Record<string, string> = {
  draft: '#71717a',
  review: '#f59e0b',
  approved: '#10b981',
  deprecated: '#ef4444',
};

interface Props {
  refreshKey: number;
  currentAssetId?: string;
  onSelect: (asset: AssetRecord) => void;
}

export default function AssetBrowser({ refreshKey, currentAssetId, onSelect }: Props) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [filter, setFilter] = useState<AssetCategory | ''>('');

  useEffect(() => {
    assetsApi.list(filter || undefined).then(setAssets).catch(console.error);
  }, [refreshKey, filter]);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0b182bdd', border: '1px solid #80adff30', borderRadius: 16, padding: 12 }}>
      <h3 style={{ fontSize: 14, color: '#6ed4ff', marginBottom: 8 }}>Assets</h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as AssetCategory | '')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              border: filter === f.value ? '1px solid #6ed4ff' : '1px solid #80adff20',
              borderRadius: 6,
              background: filter === f.value ? '#1a3050' : 'transparent',
              color: '#eef6ff',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, alignContent: 'start' }}>
        {assets.map(asset => (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            style={{
              padding: 6,
              border: asset.id === currentAssetId ? '2px solid #6ed4ff' : `2px solid ${STATE_COLORS[asset.state] || '#333'}40`,
              borderRadius: 10,
              background: '#0d1a30',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '100%',
              aspectRatio: '1',
              background: `url(${asset.imagePath}) center/contain no-repeat`,
              borderRadius: 6,
              marginBottom: 4,
            }} />
            <div style={{ fontSize: 10, color: '#eef6ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asset.name}
            </div>
            <div style={{ fontSize: 9, color: STATE_COLORS[asset.state], textTransform: 'uppercase' }}>
              {asset.state}
            </div>
          </button>
        ))}

        {assets.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9eb8d4', fontSize: 13, padding: 20 }}>
            No assets yet. Generate one above.
          </p>
        )}
      </div>
    </div>
  );
}
