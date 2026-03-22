/**
 * Variant Generation Panel
 *
 * Takes an existing asset and generates a variation:
 * - Same character in a different pose ("running left")
 * - Same object with a different state ("door open")
 * - Expression variants ("happy", "sad")
 *
 * Also supports multi-frame animation generation.
 */
import React, { useState } from 'react';
import { generateApi, assetsApi, type AssetRecord, type AnimationClip } from './api';

const VARIANT_PRESETS = [
  { label: 'Facing left', desc: 'Mirror the character so they face left' },
  { label: 'Facing right', desc: 'Mirror the character so they face right' },
  { label: 'Running', desc: 'Show the character in a running pose, mid-stride' },
  { label: 'Jumping', desc: 'Show the character jumping upward with arms raised' },
  { label: 'Idle', desc: 'Show the character standing still in a relaxed idle pose' },
  { label: 'Celebrating', desc: 'Show the character celebrating with a happy expression and raised arms' },
  { label: 'Damaged', desc: 'Show the character looking hurt or taking damage, knocked back slightly' },
  { label: 'Thinking', desc: 'Show the character with a thoughtful expression, hand on chin' },
];

const ANIMATION_PRESETS = [
  { label: 'Walk cycle', clipName: 'walk', desc: 'Walking animation cycle', frames: 4 },
  { label: 'Run cycle', clipName: 'run', desc: 'Running animation cycle', frames: 4 },
  { label: 'Idle breathing', clipName: 'idle', desc: 'Subtle idle breathing animation', frames: 3 },
  { label: 'Jump arc', clipName: 'jump', desc: 'Jump animation: crouch, launch, peak, fall, land', frames: 5 },
  { label: 'Celebrate', clipName: 'celebrate', desc: 'Victory celebration animation', frames: 4 },
  { label: 'Fail reaction', clipName: 'fail', desc: 'Disappointed or fail reaction animation', frames: 3 },
];

interface Props {
  sourceAsset: AssetRecord | null;
  onVariantCreated: () => void;
}

export default function VariantPanel({ sourceAsset, onVariantCreated }: Props) {
  const [mode, setMode] = useState<'variant' | 'animation'>('variant');

  // Variant state
  const [variantLabel, setVariantLabel] = useState('');
  const [variantDesc, setVariantDesc] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Animation state
  const [clipName, setClipName] = useState('walk');
  const [frameCount, setFrameCount] = useState(4);
  const [animDesc, setAnimDesc] = useState('');

  if (!sourceAsset) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#9eb8d4', fontSize: 12 }}>
        Select an asset to generate variants or animation frames.
      </div>
    );
  }

  const handlePreset = (desc: string, label: string) => {
    setVariantDesc(desc);
    setVariantLabel(label.toLowerCase().replace(/\s+/g, '_'));
  };

  const handleAnimPreset = (preset: typeof ANIMATION_PRESETS[0]) => {
    setClipName(preset.clipName);
    setAnimDesc(preset.desc);
    setFrameCount(preset.frames);
  };

  const handleGenerateVariant = async () => {
    if (!variantLabel.trim() || !variantDesc.trim()) return;
    setGenerating(true);
    setError('');
    setLastResult(null);

    try {
      const result = await generateApi.generateVariation({
        sourceAssetId: sourceAsset.id,
        variantLabel: variantLabel.trim(),
        description: variantDesc.trim(),
      });

      // Create an asset record for the variant
      await assetsApi.create({
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
        model: 'gemini-2.0-flash-exp',
      } as Partial<AssetRecord>);

      setLastResult(result.imagePath);
      onVariantCreated();
    } catch (err: any) {
      setError(err.message || 'Variant generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAnimation = async () => {
    if (!clipName.trim() || !animDesc.trim()) return;
    setGenerating(true);
    setError('');
    setLastResult(null);

    try {
      const result = await generateApi.generateAnimationFrames({
        assetId: sourceAsset.id,
        clipName: clipName.trim(),
        frameCount,
        description: animDesc.trim(),
      });

      // Add animation clip to the source asset
      const clip: AnimationClip = {
        name: clipName.trim(),
        frames: result.frames,
        frameRate: 8,
        loop: true,
      };

      await assetsApi.addAnimation(sourceAsset.id, clip);
      setLastResult(result.frames[0]);
      onVariantCreated();
    } catch (err: any) {
      setError(err.message || 'Animation generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Source asset info */}
      <div style={{
        padding: 10, borderRadius: 8, border: '1px solid #1a2a4a', background: '#08111f',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 6, background: '#0d1a30',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: '#6ed4ff',
        }}>
          {sourceAsset.category === 'character' ? 'C' : sourceAsset.category[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#eef6ff' }}>{sourceAsset.name}</div>
          <div style={{ fontSize: 10, color: '#9eb8d4' }}>
            {sourceAsset.category} | {sourceAsset.width}x{sourceAsset.height} | {sourceAsset.id}
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 4 }}>
        <ModeBtn label="Variant" active={mode === 'variant'} onClick={() => setMode('variant')} />
        <ModeBtn label="Animation" active={mode === 'animation'} onClick={() => setMode('animation')} />
      </div>

      {mode === 'variant' && (
        <>
          {/* Preset buttons */}
          <div style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
            Quick Presets
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {VARIANT_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.desc, p.label)}
                style={{
                  padding: '3px 8px', fontSize: 10, cursor: 'pointer',
                  border: '1px solid #1a2a4a', borderRadius: 4,
                  background: variantLabel === p.label.toLowerCase().replace(/\s+/g, '_') ? '#1a3050' : 'transparent',
                  color: variantLabel === p.label.toLowerCase().replace(/\s+/g, '_') ? '#6ed4ff' : '#9eb8d4',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Field label="Variant Label">
            <input
              value={variantLabel}
              onChange={e => setVariantLabel(e.target.value)}
              style={inputStyle}
              placeholder="e.g. running_left, happy, damaged..."
            />
          </Field>

          <Field label="Description / Instruction">
            <textarea
              value={variantDesc}
              onChange={e => setVariantDesc(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Describe how this variant should differ from the original..."
            />
          </Field>

          <button
            onClick={handleGenerateVariant}
            disabled={generating || !variantLabel.trim() || !variantDesc.trim()}
            style={generateBtnStyle(generating)}
          >
            {generating ? 'Generating variant...' : 'Generate Variant'}
          </button>
        </>
      )}

      {mode === 'animation' && (
        <>
          {/* Animation presets */}
          <div style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
            Animation Presets
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ANIMATION_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => handleAnimPreset(p)}
                style={{
                  padding: '3px 8px', fontSize: 10, cursor: 'pointer',
                  border: '1px solid #1a2a4a', borderRadius: 4,
                  background: clipName === p.clipName ? '#1a3050' : 'transparent',
                  color: clipName === p.clipName ? '#6ed4ff' : '#9eb8d4',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Field label="Clip Name">
            <input
              value={clipName}
              onChange={e => setClipName(e.target.value)}
              style={inputStyle}
              placeholder="e.g. walk, run, idle..."
            />
          </Field>

          <Field label="Frame Count">
            <input
              type="number"
              value={frameCount}
              onChange={e => setFrameCount(Math.max(2, Math.min(12, Number(e.target.value))))}
              min={2}
              max={12}
              style={{ ...inputStyle, width: 80 }}
            />
            <span style={{ fontSize: 10, color: '#6b8aaa', marginTop: 2 }}>2–12 frames per clip</span>
          </Field>

          <Field label="Animation Description">
            <textarea
              value={animDesc}
              onChange={e => setAnimDesc(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Describe the motion sequence..."
            />
          </Field>

          <button
            onClick={handleGenerateAnimation}
            disabled={generating || !clipName.trim() || !animDesc.trim()}
            style={generateBtnStyle(generating)}
          >
            {generating ? `Generating ${frameCount} frames...` : `Generate ${frameCount} Frames`}
          </button>
        </>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 8, borderRadius: 6, background: '#2a0a0a', border: '1px solid #ff6e6e', color: '#ff6e6e', fontSize: 11 }}>
          {error}
        </div>
      )}

      {/* Success */}
      {lastResult && (
        <div style={{ padding: 8, borderRadius: 6, background: '#0a2a0a', border: '1px solid #7dffb0', color: '#7dffb0', fontSize: 11 }}>
          Generated: {lastResult}
        </div>
      )}
    </div>
  );
}

// --- Shared styles ---

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', fontSize: 12,
  background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
};

function generateBtnStyle(generating: boolean): React.CSSProperties {
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
      <label style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ModeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
      border: active ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
      borderRadius: 6,
      background: active ? '#1a3050' : 'transparent',
      color: active ? '#6ed4ff' : '#9eb8d4',
      fontWeight: active ? 600 : 400,
    }}>
      {label}
    </button>
  );
}
