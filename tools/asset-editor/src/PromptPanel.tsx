/**
 * Math Game Asset Editor — Generation Panel
 * Forked from ComplexEngineReference, adapted for math game asset categories.
 */
import React, { useState } from 'react';
import { assetsApi, generateApi, type AssetCategory } from './api';

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'background', label: 'Background' },
  { value: 'foreground', label: 'Foreground / Parallax' },
  { value: 'tile', label: 'Tile / Terrain' },
  { value: 'character', label: 'Character' },
  { value: 'ui', label: 'UI Element' },
  { value: 'portrait', label: 'Portrait / Expression' },
  { value: 'text_panel', label: 'Text Panel / Dialogue Box' },
  { value: 'fx', label: 'Effects' },
  { value: 'prop', label: 'Interactive Prop' },
];

const STYLE_PRESETS = [
  'Colorful cartoon 2D side-view, vibrant, kid-friendly',
  'Pixel art retro style, 16-bit aesthetic',
  'Hand-drawn storybook illustration, soft edges',
  'Flat design, clean vector look, bright colors',
];

interface Props {
  onAssetCreated: () => void;
}

export default function PromptPanel({ onAssetCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AssetCategory>('character');
  const [style, setStyle] = useState(STYLE_PRESETS[0]);
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(128);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!name.trim() || !description.trim()) return;
    setGenerating(true);

    try {
      const assetId = name.trim().toLowerCase().replace(/\s+/g, '_');

      // Generate the image
      const result = await generateApi.generate({
        description,
        category,
        assetId,
        width,
        height,
        style,
      });

      // Create the asset record
      await assetsApi.create({
        id: assetId,
        name: name.trim(),
        description,
        category,
        state: 'draft',
        imagePath: result.imagePath,
        anchor_x: 0.5,
        anchor_y: 1.0,
        width: result.size.w,
        height: result.size.h,
        prompt: result.prompt,
        model: result.model,
      });

      onAssetCreated();
      setName('');
      setDescription('');
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #80adff30',
    borderRadius: 8,
    background: '#0d1a30',
    color: '#eef6ff',
    fontSize: 13,
  } as const;

  const labelStyle = {
    fontSize: 11,
    color: '#9eb8d4',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div style={{ padding: 12, background: '#0b182bdd', border: '1px solid #80adff30', borderRadius: 16 }}>
      <h3 style={{ fontSize: 14, color: '#6ed4ff', marginBottom: 12 }}>Generate Asset</h3>

      <label style={labelStyle}>Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. forest_background_01" style={{ ...inputStyle, marginBottom: 10 }} />

      <label style={labelStyle}>Description</label>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="A lush forest scene with math symbols hidden in the trees..."
        rows={3}
        style={{ ...inputStyle, marginBottom: 10, resize: 'vertical' }}
      />

      <label style={labelStyle}>Category</label>
      <select value={category} onChange={e => setCategory(e.target.value as AssetCategory)} style={{ ...inputStyle, marginBottom: 10 }}>
        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

      <label style={labelStyle}>Art Style</label>
      <select value={style} onChange={e => setStyle(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
        {STYLE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Width</label>
          <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Height</label>
          <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || !name.trim() || !description.trim()}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: 10,
          border: 0,
          background: generating ? '#333' : 'linear-gradient(180deg, #95efff, #48c1ff)',
          color: '#031321',
          fontWeight: 'bold',
          cursor: generating ? 'wait' : 'pointer',
          fontSize: 14,
        }}
      >
        {generating ? 'Generating...' : 'Generate & Create'}
      </button>
    </div>
  );
}
