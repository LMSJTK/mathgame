import type { Layer } from '../types/level.ts';
import type { AssetRecord } from '../types/asset.ts';
import { useState } from 'react';
import AssetPickerModal from './AssetPickerModal.tsx';

interface Props {
  layers: Layer[];
  assets: AssetRecord[];
  onAdd: (layer: Layer) => void;
  onUpdate: (id: string, patch: Partial<Layer>) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

let nextLayerId = 1;
function genLayerId() {
  return `layer_${Date.now().toString(36)}_${nextLayerId++}`;
}

export default function LayerPanel({ layers, assets, onAdd, onUpdate, onRemove, onReorder }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerLayerId, setPickerLayerId] = useState<string | null>(null);

  const handleAdd = (type: Layer['type']) => {
    const layer: Layer = {
      id: genLayerId(),
      type,
      scrollFactor: type === 'parallax' ? { x: 0.5, y: 0.2 } : undefined,
      depth: type === 'background' ? -10 : type === 'foreground' ? 10 : 0,
    };
    onAdd(layer);
    setExpandedId(layer.id);
  };

  const resolveAssetName = (ref?: string) => {
    if (!ref) return '(none)';
    const asset = assets.find(a => a.id === ref);
    return asset ? asset.name : ref;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
          Layers ({layers.length})
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => handleAdd('background')} style={addBtnStyle}>+ BG</button>
          <button onClick={() => handleAdd('foreground')} style={addBtnStyle}>+ FG</button>
          <button onClick={() => handleAdd('parallax')} style={addBtnStyle}>+ PX</button>
        </div>
      </div>

      {layers.length === 0 && (
        <div style={{ color: '#9eb8d4', fontSize: 12, padding: 20, textAlign: 'center' }}>
          No layers yet. Add a background, foreground, or parallax layer.
        </div>
      )}

      {layers.map((layer, idx) => {
        const isExpanded = expandedId === layer.id;
        return (
          <div key={layer.id} style={{
            padding: 10, borderRadius: 8, cursor: 'pointer',
            border: isExpanded ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
            background: isExpanded ? '#0d1a30' : '#08111f',
          }}>
            {/* Header */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : layer.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  background: typeColor(layer.type) + '22', color: typeColor(layer.type),
                  border: `1px solid ${typeColor(layer.type)}44`,
                  textTransform: 'uppercase', fontWeight: 600,
                }}>{layer.type.slice(0, 3)}</span>
                <span style={{ fontSize: 12, color: '#eef6ff', fontWeight: 600 }}>{layer.id}</span>
              </div>

              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {/* Reorder buttons */}
                {idx > 0 && (
                  <button onClick={e => { e.stopPropagation(); onReorder(idx, idx - 1); }} style={smallBtnStyle} title="Move up">^</button>
                )}
                {idx < layers.length - 1 && (
                  <button onClick={e => { e.stopPropagation(); onReorder(idx, idx + 1); }} style={smallBtnStyle} title="Move down">v</button>
                )}
                <button onClick={e => { e.stopPropagation(); onRemove(layer.id); }} style={{
                  ...smallBtnStyle, borderColor: '#6a2a2a', color: '#ff6e6e',
                }}>x</button>
              </div>
            </div>

            {/* Summary when collapsed */}
            {!isExpanded && (
              <div style={{ fontSize: 10, color: '#9eb8d4', marginTop: 4 }}>
                asset: {resolveAssetName(layer.assetRef)}
                {layer.depth != null && ` — depth: ${layer.depth}`}
              </div>
            )}

            {/* Expanded edit form */}
            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <Field label="Type">
                  <select value={layer.type} onChange={e => onUpdate(layer.id, { type: e.target.value as Layer['type'] })} style={inputStyle}>
                    <option value="background">background</option>
                    <option value="foreground">foreground</option>
                    <option value="parallax">parallax</option>
                  </select>
                </Field>

                <Field label="Asset">
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <div style={{
                      flex: 1, padding: '4px 6px', fontSize: 12,
                      background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {resolveAssetName(layer.assetRef)}
                    </div>
                    <button onClick={() => setPickerLayerId(layer.id)} style={pickBtnStyle}>Pick</button>
                  </div>
                </Field>

                <Field label="Depth">
                  <input type="number" value={layer.depth ?? 0}
                    onChange={e => onUpdate(layer.id, { depth: +e.target.value })}
                    style={{ ...inputStyle, width: 80 }} />
                </Field>

                {(layer.type === 'parallax' || layer.type === 'background' || layer.type === 'foreground') && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Field label="Scroll X">
                      <input type="number" value={layer.scrollFactor?.x ?? 1} step={0.05} min={0} max={2}
                        onChange={e => onUpdate(layer.id, { scrollFactor: { x: +e.target.value, y: layer.scrollFactor?.y ?? 1 } })}
                        style={{ ...inputStyle, width: 70 }} />
                    </Field>
                    <Field label="Scroll Y">
                      <input type="number" value={layer.scrollFactor?.y ?? 1} step={0.05} min={0} max={2}
                        onChange={e => onUpdate(layer.id, { scrollFactor: { x: layer.scrollFactor?.x ?? 1, y: +e.target.value } })}
                        style={{ ...inputStyle, width: 70 }} />
                    </Field>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Asset picker modal */}
      {pickerLayerId && (
        <AssetPickerModal
          assets={assets}
          filterCategory="background"
          onSelect={assetId => {
            onUpdate(pickerLayerId, { assetRef: assetId || undefined });
            setPickerLayerId(null);
          }}
          onCancel={() => setPickerLayerId(null)}
        />
      )}
    </div>
  );
}

function typeColor(type: Layer['type']): string {
  switch (type) {
    case 'background': return '#6ed4ff';
    case 'foreground': return '#7dffb0';
    case 'parallax': return '#fbbf24';
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '3px 6px', fontSize: 12,
  background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
};

const addBtnStyle: React.CSSProperties = {
  padding: '3px 8px', fontSize: 10, cursor: 'pointer',
  border: '1px solid #6ed4ff', borderRadius: 5,
  background: '#1a3050', color: '#6ed4ff',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '1px 6px', fontSize: 10, cursor: 'pointer',
  border: '1px solid #1a2a4a', borderRadius: 4,
  background: 'transparent', color: '#9eb8d4',
};

const pickBtnStyle: React.CSSProperties = {
  padding: '3px 10px', fontSize: 11, cursor: 'pointer',
  border: '1px solid #6ed4ff', borderRadius: 5,
  background: '#1a3050', color: '#6ed4ff', whiteSpace: 'nowrap',
};
