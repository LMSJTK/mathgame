/**
 * Math Game Asset Editor — Metadata Form
 * Forked from ComplexEngineReference, replaced park-game metadata with math game fields.
 */
import React, { useState } from 'react';
import { assetsApi, exportApi, type AssetRecord, type AssetState, type NineSlice } from './api';

interface Props {
  asset: AssetRecord | null;
  onUpdate: (asset: AssetRecord) => void;
}

const EXPRESSIONS = ['neutral', 'happy', 'sad', 'surprised', 'thinking', 'celebrating', 'confused'];

export default function MetadataForm({ asset, onUpdate }: Props) {
  const [exporting, setExporting] = useState(false);

  if (!asset) {
    return (
      <div style={{ padding: 20, background: '#0b182bdd', border: '1px solid #80adff30', borderRadius: 16, textAlign: 'center', color: '#9eb8d4' }}>
        Select an asset to view its metadata.
      </div>
    );
  }

  const handleStateChange = async (state: AssetState) => {
    const updated = await assetsApi.setState(asset.id, state);
    onUpdate(updated);
  };

  const handleFieldUpdate = async (field: string, value: unknown) => {
    const updated = await assetsApi.update(asset.id, { [field]: value });
    onUpdate(updated);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportApi.exportManifest();
    } finally {
      setExporting(false);
    }
  };

  const sectionStyle = { marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 };
  const labelStyle = { fontSize: 11, color: '#9eb8d4', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4, display: 'block' };
  const valueStyle = { fontSize: 14, color: '#eef6ff', marginBottom: 8 };
  const inputStyle = { width: '100%', padding: '6px 8px', border: '1px solid #80adff30', borderRadius: 6, background: '#0d1a30', color: '#eef6ff', fontSize: 13, marginBottom: 8 };
  const btnStyle = (color: string) => ({
    padding: '6px 12px',
    border: `1px solid ${color}`,
    borderRadius: 8,
    background: 'transparent',
    color,
    cursor: 'pointer',
    fontSize: 12,
    marginRight: 6,
  });

  return (
    <div style={{ padding: 12, background: '#0b182bdd', border: '1px solid #80adff30', borderRadius: 16 }}>
      <h3 style={{ fontSize: 14, color: '#6ed4ff', marginBottom: 12 }}>Metadata</h3>

      {/* Basic info */}
      <div style={sectionStyle}>
        <span style={labelStyle}>ID</span>
        <div style={valueStyle}>{asset.id}</div>

        <span style={labelStyle}>Name</span>
        <div style={valueStyle}>{asset.name}</div>

        <span style={labelStyle}>Category</span>
        <div style={valueStyle}>{asset.category}</div>

        <span style={labelStyle}>Created</span>
        <div style={{ ...valueStyle, fontSize: 12 }}>{asset.createdAt}</div>

        {asset.prompt && (
          <>
            <span style={labelStyle}>Generation Prompt</span>
            <div style={{ ...valueStyle, fontSize: 12, color: '#9eb8d4' }}>{asset.prompt}</div>
          </>
        )}
      </div>

      {/* Pack / variant */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Pack ID</span>
        <input
          value={asset.packId || ''}
          onChange={e => handleFieldUpdate('packId', e.target.value)}
          placeholder="e.g. forest_theme"
          style={inputStyle}
        />

        <span style={labelStyle}>Variant Label</span>
        <input
          value={asset.variantLabel || ''}
          onChange={e => handleFieldUpdate('variantLabel', e.target.value)}
          placeholder="e.g. autumn, night"
          style={inputStyle}
        />
      </div>

      {/* Category-specific fields */}
      {asset.category === 'character' && (
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 12, color: '#6ed4ff', marginBottom: 8 }}>Character</h4>
          <span style={labelStyle}>Character ID</span>
          <input
            value={asset.characterId || ''}
            onChange={e => handleFieldUpdate('characterId', e.target.value)}
            placeholder="e.g. professor_pi"
            style={inputStyle}
          />
          <span style={labelStyle}>Expression</span>
          <select
            value={asset.expression || 'neutral'}
            onChange={e => handleFieldUpdate('expression', e.target.value)}
            style={inputStyle}
          >
            {EXPRESSIONS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
          </select>
        </div>
      )}

      {(asset.category === 'background' || asset.category === 'foreground') && (
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 12, color: '#6ed4ff', marginBottom: 8 }}>Parallax</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <span style={labelStyle}>Scroll Factor X</span>
              <input
                type="number"
                step="0.1"
                value={asset.scrollFactor?.x ?? 1}
                onChange={e => handleFieldUpdate('scrollFactor', { ...asset.scrollFactor, x: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <span style={labelStyle}>Scroll Factor Y</span>
              <input
                type="number"
                step="0.1"
                value={asset.scrollFactor?.y ?? 1}
                onChange={e => handleFieldUpdate('scrollFactor', { ...asset.scrollFactor, y: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
          </div>
          <span style={labelStyle}>Depth</span>
          <input
            type="number"
            value={asset.depth ?? 0}
            onChange={e => handleFieldUpdate('depth', Number(e.target.value))}
            style={inputStyle}
          />
        </div>
      )}

      {asset.category === 'text_panel' && (
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 12, color: '#6ed4ff', marginBottom: 8 }}>Nine-Slice</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['top', 'right', 'bottom', 'left'] as const).map(side => (
              <div key={side}>
                <span style={labelStyle}>{side}</span>
                <input
                  type="number"
                  value={asset.nineSlice?.[side] ?? 0}
                  onChange={e => {
                    const ns: NineSlice = { top: 0, right: 0, bottom: 0, left: 0, ...asset.nineSlice, [side]: Number(e.target.value) };
                    assetsApi.setNineSlice(asset.id, ns).then(onUpdate);
                  }}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Animations */}
      {asset.animations && asset.animations.length > 0 && (
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 12, color: '#6ed4ff', marginBottom: 8 }}>Animation Clips</h4>
          {asset.animations.map((clip, i) => (
            <div key={i} style={{ fontSize: 12, color: '#9eb8d4', marginBottom: 4 }}>
              <strong style={{ color: '#eef6ff' }}>{clip.name}</strong> — {clip.frames.length} frames @ {clip.frameRate}fps {clip.loop ? '(loop)' : ''}
            </div>
          ))}
        </div>
      )}

      {/* Workflow */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: 12, color: '#6ed4ff', marginBottom: 8 }}>Workflow</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {asset.state === 'draft' && <button onClick={() => handleStateChange('review')} style={btnStyle('#f59e0b')}>Submit for Review</button>}
          {asset.state === 'review' && <button onClick={() => handleStateChange('approved')} style={btnStyle('#10b981')}>Approve</button>}
          {asset.state !== 'deprecated' && <button onClick={() => handleStateChange('deprecated')} style={btnStyle('#ef4444')}>Deprecate</button>}
          {asset.state === 'deprecated' && <button onClick={() => handleStateChange('draft')} style={btnStyle('#71717a')}>Restore to Draft</button>}
        </div>
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: 10,
          border: '1px solid #6ed4ff',
          background: 'transparent',
          color: '#6ed4ff',
          cursor: exporting ? 'wait' : 'pointer',
          fontSize: 13,
        }}
      >
        {exporting ? 'Exporting...' : 'Export Manifest'}
      </button>
    </div>
  );
}
