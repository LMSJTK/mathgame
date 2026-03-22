import { useState } from 'react';
import type { AssetRecord, AssetCategory, AssetState, AnimationClip } from '../types/asset.ts';
import { ASSET_CATEGORIES, ASSET_STATES, EXPRESSIONS } from '../types/asset.ts';
import AnimationPreview from './AnimationPreview.tsx';

const ASSET_SERVER = 'http://localhost:4174';

/** Resolve an asset imagePath to a full URL served by the asset-server. */
function resolveImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  // The asset-server serves /assets/* as static files, and imagePath is like "assets/sprites/..."
  return `${ASSET_SERVER}/${imagePath}`;
}

interface Props {
  asset: AssetRecord;
  onUpdate: (id: string, patch: Partial<AssetRecord>) => void;
}

export default function AssetDetail({ asset, onUpdate }: Props) {
  const [animExpanded, setAnimExpanded] = useState(false);

  const patch = (p: Partial<AssetRecord>) => onUpdate(asset.id, { ...p, updatedAt: new Date().toISOString() });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto', padding: 12 }}>
      {/* Preview area */}
      <div style={{
        background: '#060d18', border: '1px solid #1a2a4a', borderRadius: 8,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 16, minHeight: 180,
      }}>
        {asset.imagePath ? (
          <div style={{ color: '#9eb8d4', fontSize: 11, textAlign: 'center' }}>
            <div style={{
              width: Math.min(asset.width, 200), height: Math.min(asset.height, 200),
              background: checkerboard(), borderRadius: 4, margin: '0 auto 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #1a2a4a', position: 'relative',
              overflow: 'hidden',
            }}>
              <img
                src={resolveImageUrl(asset.imagePath)}
                alt={asset.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {/* Anchor point indicator */}
              <div style={{
                position: 'absolute',
                left: `${asset.anchor_x * 100}%`,
                top: `${asset.anchor_y * 100}%`,
                width: 8, height: 8, borderRadius: '50%',
                background: '#ff4444', border: '2px solid white',
                transform: 'translate(-50%, -50%)',
                zIndex: 1,
              }} />
            </div>
            <span>{asset.imagePath}</span>
          </div>
        ) : (
          <span style={{ color: '#9eb8d4', fontSize: 12 }}>No image assigned</span>
        )}
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>
          {asset.width} x {asset.height}px — anchor ({asset.anchor_x.toFixed(2)}, {asset.anchor_y.toFixed(2)})
        </div>
      </div>

      {/* Basic info */}
      <Section title="Identity">
        <Field label="ID">
          <input value={asset.id} readOnly style={{ ...inputStyle, color: '#6b7280' }} />
        </Field>
        <Field label="Name">
          <input value={asset.name} onChange={e => patch({ name: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Description">
          <textarea value={asset.description} onChange={e => patch({ description: e.target.value })}
            rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>
        <div style={{ display: 'flex', gap: 6 }}>
          <Field label="Category">
            <select value={asset.category} onChange={e => patch({ category: e.target.value as AssetCategory })} style={inputStyle}>
              {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="State">
            <select value={asset.state} onChange={e => patch({ state: e.target.value as AssetState })} style={inputStyle}>
              {ASSET_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* Image */}
      <Section title="Image">
        <Field label="Image Path">
          <input value={asset.imagePath} onChange={e => patch({ imagePath: e.target.value })} style={inputStyle} />
        </Field>
        <div style={{ display: 'flex', gap: 6 }}>
          <Field label="Width">
            <input type="number" value={asset.width} min={1}
              onChange={e => patch({ width: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
          </Field>
          <Field label="Height">
            <input type="number" value={asset.height} min={1}
              onChange={e => patch({ height: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Field label="Anchor X">
            <input type="number" value={asset.anchor_x} min={0} max={1} step={0.05}
              onChange={e => patch({ anchor_x: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
          </Field>
          <Field label="Anchor Y">
            <input type="number" value={asset.anchor_y} min={0} max={1} step={0.05}
              onChange={e => patch({ anchor_y: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
          </Field>
        </div>
      </Section>

      {/* Pack */}
      <Section title="Pack">
        <div style={{ display: 'flex', gap: 6 }}>
          <Field label="Pack ID">
            <input value={asset.packId ?? ''} onChange={e => patch({ packId: e.target.value || undefined })} style={inputStyle} />
          </Field>
          <Field label="Variant">
            <input value={asset.variantLabel ?? ''} onChange={e => patch({ variantLabel: e.target.value || undefined })} style={inputStyle} />
          </Field>
        </div>
      </Section>

      {/* Category-specific sections */}
      {(asset.category === 'character' || asset.category === 'portrait') && (
        <Section title="Character">
          <Field label="Character ID">
            <input value={asset.characterId ?? ''} onChange={e => patch({ characterId: e.target.value || undefined })} style={inputStyle} />
          </Field>
          <Field label="Expression">
            <select value={asset.expression ?? 'neutral'} onChange={e => patch({ expression: e.target.value })} style={inputStyle}>
              {EXPRESSIONS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </Field>
        </Section>
      )}

      {(asset.category === 'background' || asset.category === 'foreground') && (
        <Section title="Parallax">
          <div style={{ display: 'flex', gap: 6 }}>
            <Field label="Scroll X">
              <input type="number" value={asset.scrollFactor?.x ?? 1} step={0.1}
                onChange={e => patch({ scrollFactor: { x: +e.target.value, y: asset.scrollFactor?.y ?? 1 } })} style={{ ...inputStyle, width: 70 }} />
            </Field>
            <Field label="Scroll Y">
              <input type="number" value={asset.scrollFactor?.y ?? 1} step={0.1}
                onChange={e => patch({ scrollFactor: { x: asset.scrollFactor?.x ?? 1, y: +e.target.value } })} style={{ ...inputStyle, width: 70 }} />
            </Field>
            <Field label="Depth">
              <input type="number" value={asset.depth ?? 0}
                onChange={e => patch({ depth: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
            </Field>
          </div>
        </Section>
      )}

      {(asset.category === 'tile' || asset.category === 'prop') && (
        <Section title="Collision Box">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Field label="X">
              <input type="number" value={asset.collisionBox?.x ?? 0}
                onChange={e => patch({ collisionBox: { ...defaultCollisionBox(asset), x: +e.target.value } })} style={{ ...inputStyle, width: 60 }} />
            </Field>
            <Field label="Y">
              <input type="number" value={asset.collisionBox?.y ?? 0}
                onChange={e => patch({ collisionBox: { ...defaultCollisionBox(asset), y: +e.target.value } })} style={{ ...inputStyle, width: 60 }} />
            </Field>
            <Field label="W">
              <input type="number" value={asset.collisionBox?.w ?? asset.width} min={0}
                onChange={e => patch({ collisionBox: { ...defaultCollisionBox(asset), w: +e.target.value } })} style={{ ...inputStyle, width: 60 }} />
            </Field>
            <Field label="H">
              <input type="number" value={asset.collisionBox?.h ?? asset.height} min={0}
                onChange={e => patch({ collisionBox: { ...defaultCollisionBox(asset), h: +e.target.value } })} style={{ ...inputStyle, width: 60 }} />
            </Field>
          </div>
        </Section>
      )}

      {asset.category === 'text_panel' && (
        <Section title="Nine-Slice">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['top', 'right', 'bottom', 'left'] as const).map(side => (
              <Field key={side} label={side}>
                <input type="number" value={asset.nineSlice?.[side] ?? 0} min={0}
                  onChange={e => patch({ nineSlice: { ...(asset.nineSlice ?? { top: 0, right: 0, bottom: 0, left: 0 }), [side]: +e.target.value } })}
                  style={{ ...inputStyle, width: 60 }} />
              </Field>
            ))}
          </div>
        </Section>
      )}

      {/* Animation Preview */}
      {(asset.animations?.length ?? 0) > 0 && (
        <Section title="Preview">
          <AnimationPreview clips={asset.animations!} />
        </Section>
      )}

      {/* Animations */}
      <Section title={`Animations (${asset.animations?.length ?? 0})`}>
        <button onClick={() => setAnimExpanded(!animExpanded)} style={{
          ...btnStyle, fontSize: 10, padding: '2px 8px',
        }}>
          {animExpanded ? 'Collapse' : 'Expand'}
        </button>

        {animExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {(asset.animations ?? []).map((clip, i) => (
              <AnimClipEditor
                key={i}
                clip={clip}
                onChange={updated => {
                  const anims = [...(asset.animations ?? [])];
                  anims[i] = updated;
                  patch({ animations: anims });
                }}
                onRemove={() => {
                  const anims = (asset.animations ?? []).filter((_, j) => j !== i);
                  patch({ animations: anims });
                }}
              />
            ))}

            <button onClick={() => {
              const clip: AnimationClip = { name: 'idle', frames: [], frameRate: 12, loop: true };
              patch({ animations: [...(asset.animations ?? []), clip] });
            }} style={btnStyle}>
              + Add Clip
            </button>
          </div>
        )}
      </Section>

      {/* Generation metadata (read-only) */}
      {asset.prompt && (
        <Section title="Generation">
          <Field label="Prompt">
            <div style={{ fontSize: 11, color: '#9eb8d4', padding: 4, background: '#060d18', borderRadius: 4, border: '1px solid #1a2a4a' }}>
              {asset.prompt}
            </div>
          </Field>
          {asset.model && (
            <Field label="Model">
              <span style={{ fontSize: 11, color: '#9eb8d4' }}>{asset.model}</span>
            </Field>
          )}
        </Section>
      )}

      {/* Timestamps */}
      <div style={{ fontSize: 10, color: '#6b7280', padding: '4px 0' }}>
        Created: {new Date(asset.createdAt).toLocaleDateString()} — Updated: {new Date(asset.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}

function AnimClipEditor({ clip, onChange, onRemove }: { clip: AnimationClip; onChange: (c: AnimationClip) => void; onRemove: () => void }) {
  return (
    <div style={{ padding: 8, borderRadius: 6, border: '1px solid #1a2a4a', background: '#060d18' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <input value={clip.name} onChange={e => onChange({ ...clip, name: e.target.value })}
          style={{ ...inputStyle, fontWeight: 600, width: 120 }} />
        <button onClick={onRemove} style={{
          padding: '1px 6px', fontSize: 10, cursor: 'pointer',
          border: '1px solid #6a2a2a', borderRadius: 4,
          background: 'transparent', color: '#ff6e6e',
        }}>x</button>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Field label="FPS">
          <input type="number" value={clip.frameRate} min={1} max={60}
            onChange={e => onChange({ ...clip, frameRate: +e.target.value })}
            style={{ ...inputStyle, width: 50 }} />
        </Field>
        <Field label="Loop">
          <input type="checkbox" checked={clip.loop}
            onChange={e => onChange({ ...clip, loop: e.target.checked })} />
        </Field>
        <Field label="Frames">
          <span style={{ fontSize: 11, color: '#9eb8d4' }}>{clip.frames.length}</span>
        </Field>
      </div>
      <Field label="Frame Paths (one per line)">
        <textarea
          value={clip.frames.join('\n')}
          onChange={e => onChange({ ...clip, frames: e.target.value.split('\n').filter(f => f.trim()) })}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontSize: 10, fontFamily: 'monospace' }}
        />
      </Field>
    </div>
  );
}

function defaultCollisionBox(asset: AssetRecord) {
  return asset.collisionBox ?? { x: 0, y: 0, w: asset.width, h: asset.height };
}

function checkerboard() {
  return `repeating-conic-gradient(#1a2a4a 0% 25%, #0f1a2d 0% 50%) 50% / 16px 16px`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
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

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: 11, cursor: 'pointer',
  border: '1px solid #6ed4ff', borderRadius: 5,
  background: '#1a3050', color: '#6ed4ff',
};
