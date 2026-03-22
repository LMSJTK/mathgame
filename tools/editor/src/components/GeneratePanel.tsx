/**
 * Asset generation panel — calls the asset-server to generate images via AI.
 * Works in two modes:
 *   - "New" mode: generate a fresh asset from a text description
 *   - "Variant" mode: generate a variant of an existing asset
 */
import { useState } from 'react';
import type { AssetRecord, AssetCategory } from '../types/asset.ts';
import { ASSET_CATEGORIES } from '../types/asset.ts';

const ASSET_SERVER = 'http://localhost:4174';

const STYLE_PRESETS = [
  { label: 'Cartoon', value: 'Colorful cartoon 2D side-view, vibrant, kid-friendly' },
  { label: 'Pixel Art', value: 'Pixel art retro style, 16-bit aesthetic' },
  { label: 'Storybook', value: 'Hand-drawn storybook illustration, soft edges' },
  { label: 'Flat', value: 'Flat design, clean vector look, bright colors' },
];

const VARIANT_PRESETS = [
  { label: 'Facing left', desc: 'Mirror the character so they face left' },
  { label: 'Facing right', desc: 'Mirror the character so they face right' },
  { label: 'Running', desc: 'Show the character in a running pose, mid-stride' },
  { label: 'Jumping', desc: 'Show the character jumping upward' },
  { label: 'Idle', desc: 'Show the character in a relaxed idle pose' },
  { label: 'Celebrating', desc: 'Show the character celebrating with raised arms' },
  { label: 'Damaged', desc: 'Show the character looking hurt or knocked back' },
  { label: 'Thinking', desc: 'Show the character with a thoughtful expression' },
];

const ANIM_PRESETS = [
  { label: 'Walk cycle', clip: 'walk', desc: 'Walking animation cycle', frames: 4 },
  { label: 'Run cycle', clip: 'run', desc: 'Running animation cycle', frames: 4 },
  { label: 'Idle', clip: 'idle', desc: 'Subtle idle breathing animation', frames: 3 },
  { label: 'Jump', clip: 'jump', desc: 'Jump: crouch, launch, peak, land', frames: 4 },
];

type Mode = 'new' | 'variant' | 'animation';

interface Props {
  sourceAsset: AssetRecord | null;
  onAssetGenerated: (asset: AssetRecord) => void;
}

export default function GeneratePanel({ sourceAsset, onAssetGenerated }: Props) {
  const [mode, setMode] = useState<Mode>('new');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');

  // New asset fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AssetCategory>('character');
  const [style, setStyle] = useState(STYLE_PRESETS[0].value);
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(128);

  // Variant fields
  const [variantLabel, setVariantLabel] = useState('');
  const [variantDesc, setVariantDesc] = useState('');

  // Animation fields
  const [clipName, setClipName] = useState('walk');
  const [frameCount, setFrameCount] = useState(4);
  const [animDesc, setAnimDesc] = useState('');

  const handleGenerateNew = async () => {
    if (!name.trim() || !description.trim()) return;
    setGenerating(true);
    setError('');
    setLastResult('');

    try {
      const assetId = name.trim().toLowerCase().replace(/\s+/g, '_');
      const res = await fetch(`${ASSET_SERVER}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category, assetId, width, height, style }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Server error ${res.status}`);
      const result = await res.json();

      const now = new Date().toISOString();
      const asset: AssetRecord = {
        id: assetId,
        name: name.trim(),
        description,
        category,
        state: 'draft',
        imagePath: result.imagePath,
        anchor_x: 0.5,
        anchor_y: 1.0,
        width: result.size?.w ?? width,
        height: result.size?.h ?? height,
        prompt: result.prompt,
        model: result.model,
        createdAt: now,
        updatedAt: now,
      };
      onAssetGenerated(asset);
      setLastResult(`Generated: ${result.imagePath}`);
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateVariant = async () => {
    if (!sourceAsset || !variantLabel.trim() || !variantDesc.trim()) return;
    setGenerating(true);
    setError('');
    setLastResult('');

    try {
      const res = await fetch(`${ASSET_SERVER}/api/generate/variation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAssetId: sourceAsset.id,
          variantLabel: variantLabel.trim(),
          description: variantDesc.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Server error ${res.status}`);
      const result = await res.json();

      const now = new Date().toISOString();
      const asset: AssetRecord = {
        id: `${sourceAsset.id}_${variantLabel.trim().replace(/\s+/g, '_')}`,
        name: `${sourceAsset.name} (${variantLabel})`,
        description: variantDesc,
        category: sourceAsset.category,
        state: 'draft',
        imagePath: result.imagePath,
        anchor_x: sourceAsset.anchor_x,
        anchor_y: sourceAsset.anchor_y,
        width: sourceAsset.width,
        height: sourceAsset.height,
        packId: sourceAsset.packId || sourceAsset.id,
        variantLabel: variantLabel.trim(),
        characterId: sourceAsset.characterId,
        prompt: result.prompt,
        model: result.model ?? 'gemini-2.0-flash-exp',
        createdAt: now,
        updatedAt: now,
      };
      onAssetGenerated(asset);
      setLastResult(`Variant generated: ${result.imagePath}`);
    } catch (err: any) {
      setError(err.message || 'Variant generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAnimation = async () => {
    if (!sourceAsset || !clipName.trim() || !animDesc.trim()) return;
    setGenerating(true);
    setError('');
    setLastResult('');

    try {
      const res = await fetch(`${ASSET_SERVER}/api/generate/animation-frames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: sourceAsset.id,
          clipName: clipName.trim(),
          frameCount,
          description: animDesc.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Server error ${res.status}`);
      const result = await res.json();
      setLastResult(`Generated ${result.frames.length} frames for "${clipName}"`);
    } catch (err: any) {
      setError(err.message || 'Animation generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#6ed4ff' }}>AI Generation</div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 4 }}>
        {(['new', 'variant', 'animation'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '5px 8px', fontSize: 11, cursor: 'pointer',
            border: mode === m ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
            borderRadius: 5,
            background: mode === m ? '#1a3050' : 'transparent',
            color: mode === m ? '#6ed4ff' : '#9eb8d4',
            textTransform: 'capitalize',
          }}>{m === 'new' ? 'New Asset' : m === 'variant' ? 'Variant' : 'Animation'}</button>
        ))}
      </div>

      {/* --- New Asset Mode --- */}
      {mode === 'new' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Field label="Name">
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle}
              placeholder="e.g. professor_pi" />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="A friendly math professor character with glasses and a lab coat..." />
          </Field>
          <Field label="Category">
            <select value={category} onChange={e => setCategory(e.target.value as AssetCategory)} style={inputStyle}>
              {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Art Style">
            <select value={style} onChange={e => setStyle(e.target.value)} style={inputStyle}>
              {STYLE_PRESETS.map(s => <option key={s.label} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Field label="Width">
              <input type="number" value={width} onChange={e => setWidth(+e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Height">
              <input type="number" value={height} onChange={e => setHeight(+e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <button onClick={handleGenerateNew}
            disabled={generating || !name.trim() || !description.trim()}
            style={btnGenStyle(generating)}>
            {generating ? 'Generating...' : 'Generate Asset'}
          </button>
        </div>
      )}

      {/* --- Variant Mode --- */}
      {mode === 'variant' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!sourceAsset ? (
            <div style={{ color: '#9eb8d4', fontSize: 12, padding: 16, textAlign: 'center' }}>
              Select an asset from the browser to generate a variant.
            </div>
          ) : (
            <>
              <SourceInfo asset={sourceAsset} />
              <div style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>Presets</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {VARIANT_PRESETS.map(p => (
                  <button key={p.label} onClick={() => {
                    setVariantDesc(p.desc);
                    setVariantLabel(p.label.toLowerCase().replace(/\s+/g, '_'));
                  }} style={{
                    padding: '3px 8px', fontSize: 10, cursor: 'pointer',
                    border: '1px solid #1a2a4a', borderRadius: 4,
                    background: variantLabel === p.label.toLowerCase().replace(/\s+/g, '_') ? '#1a3050' : 'transparent',
                    color: variantLabel === p.label.toLowerCase().replace(/\s+/g, '_') ? '#6ed4ff' : '#9eb8d4',
                  }}>{p.label}</button>
                ))}
              </div>
              <Field label="Variant Label">
                <input value={variantLabel} onChange={e => setVariantLabel(e.target.value)} style={inputStyle}
                  placeholder="e.g. running_left, happy..." />
              </Field>
              <Field label="Instruction">
                <textarea value={variantDesc} onChange={e => setVariantDesc(e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Describe how this variant should differ..." />
              </Field>
              <button onClick={handleGenerateVariant}
                disabled={generating || !variantLabel.trim() || !variantDesc.trim()}
                style={btnGenStyle(generating)}>
                {generating ? 'Generating variant...' : 'Generate Variant'}
              </button>
            </>
          )}
        </div>
      )}

      {/* --- Animation Mode --- */}
      {mode === 'animation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!sourceAsset ? (
            <div style={{ color: '#9eb8d4', fontSize: 12, padding: 16, textAlign: 'center' }}>
              Select an asset from the browser to generate animation frames.
            </div>
          ) : (
            <>
              <SourceInfo asset={sourceAsset} />
              <div style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>Presets</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ANIM_PRESETS.map(p => (
                  <button key={p.label} onClick={() => {
                    setClipName(p.clip);
                    setAnimDesc(p.desc);
                    setFrameCount(p.frames);
                  }} style={{
                    padding: '3px 8px', fontSize: 10, cursor: 'pointer',
                    border: '1px solid #1a2a4a', borderRadius: 4,
                    background: clipName === p.clip ? '#1a3050' : 'transparent',
                    color: clipName === p.clip ? '#6ed4ff' : '#9eb8d4',
                  }}>{p.label}</button>
                ))}
              </div>
              <Field label="Clip Name">
                <input value={clipName} onChange={e => setClipName(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Frames">
                <input type="number" value={frameCount} min={2} max={12}
                  onChange={e => setFrameCount(Math.max(2, Math.min(12, +e.target.value)))} style={{ ...inputStyle, width: 80 }} />
              </Field>
              <Field label="Description">
                <textarea value={animDesc} onChange={e => setAnimDesc(e.target.value)}
                  rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Describe the motion..." />
              </Field>
              <button onClick={handleGenerateAnimation}
                disabled={generating || !clipName.trim() || !animDesc.trim()}
                style={btnGenStyle(generating)}>
                {generating ? `Generating ${frameCount} frames...` : `Generate ${frameCount} Frames`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Status */}
      {error && (
        <div style={{ padding: 8, borderRadius: 6, background: '#2a0a0a', border: '1px solid #ff6e6e', color: '#ff6e6e', fontSize: 11 }}>
          {error}
        </div>
      )}
      {lastResult && (
        <div style={{ padding: 8, borderRadius: 6, background: '#0a2a0a', border: '1px solid #7dffb0', color: '#7dffb0', fontSize: 11 }}>
          {lastResult}
        </div>
      )}
    </div>
  );
}

function SourceInfo({ asset }: { asset: AssetRecord }) {
  return (
    <div style={{
      padding: 8, borderRadius: 6, border: '1px solid #1a2a4a', background: '#08111f',
      display: 'flex', gap: 8, alignItems: 'center',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 4, background: '#0d1a30',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: '#6ed4ff', fontWeight: 700,
      }}>
        {asset.category[0].toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#eef6ff' }}>{asset.name}</div>
        <div style={{ fontSize: 10, color: '#9eb8d4' }}>{asset.category} | {asset.width}x{asset.height}</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '4px 8px', fontSize: 12,
  background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
};

function btnGenStyle(generating: boolean): React.CSSProperties {
  return {
    width: '100%', padding: 10, borderRadius: 8, border: 0,
    background: generating ? '#333' : 'linear-gradient(180deg, #95efff, #48c1ff)',
    color: '#031321', fontWeight: 'bold', fontSize: 13,
    cursor: generating ? 'wait' : 'pointer',
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      {children}
    </div>
  );
}
