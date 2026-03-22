/**
 * Math Game Asset Editor — Main Layout
 * Forked from ComplexEngineReference/src/editor/EditorView.tsx
 *
 * Three-column layout:
 *   Left:   Generation panel + Asset browser
 *   Center: Canvas with anchor, collision box, nine-slice, and animation preview
 *   Right:  Metadata form with math-game-specific fields
 */
import React, { useState, useCallback } from 'react';
import PromptPanel from './PromptPanel';
import VariantPanel from './VariantPanel';
import AssetBrowser from './AssetBrowser';
import SpriteCanvas from './SpriteCanvas';
import MetadataForm from './MetadataForm';
import AnimationPreview from './AnimationPreview';
import type { AssetRecord, AssetCategory } from './api';

export default function EditorView() {
  const [currentAsset, setCurrentAsset] = useState<AssetRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [canvasMode, setCanvasMode] = useState<'anchor' | 'collision' | 'nine-slice'>('anchor');
  const [leftTab, setLeftTab] = useState<'generate' | 'variants'>('generate');

  const handleAssetCreated = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleAssetSelected = useCallback((asset: AssetRecord) => {
    setCurrentAsset(asset);
  }, []);

  const handleAssetUpdated = useCallback((asset: AssetRecord) => {
    setCurrentAsset(asset);
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: 16, height: '100vh', padding: 16, background: '#08111f', color: '#eef6ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        {/* Generate / Variants toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setLeftTab('generate')} style={{
            flex: 1, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
            border: leftTab === 'generate' ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
            borderRadius: 6,
            background: leftTab === 'generate' ? '#1a3050' : 'transparent',
            color: leftTab === 'generate' ? '#6ed4ff' : '#9eb8d4',
          }}>New Asset</button>
          <button onClick={() => setLeftTab('variants')} style={{
            flex: 1, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
            border: leftTab === 'variants' ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
            borderRadius: 6,
            background: leftTab === 'variants' ? '#1a3050' : 'transparent',
            color: leftTab === 'variants' ? '#6ed4ff' : '#9eb8d4',
          }}>Variants</button>
        </div>
        {leftTab === 'generate' && <PromptPanel onAssetCreated={handleAssetCreated} />}
        {leftTab === 'variants' && <VariantPanel sourceAsset={currentAsset} onVariantCreated={handleAssetCreated} onAssetUpdated={handleAssetUpdated} />}
        <AssetBrowser
          refreshKey={refreshKey}
          currentAssetId={currentAsset?.id}
          onSelect={handleAssetSelected}
        />
      </div>

      {/* Center column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
          {(['anchor', 'collision', 'nine-slice'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setCanvasMode(mode)}
              style={{
                padding: '6px 12px',
                border: canvasMode === mode ? '2px solid #6ed4ff' : '1px solid #80adff40',
                borderRadius: 8,
                background: canvasMode === mode ? '#1a3050' : '#0b182b',
                color: '#eef6ff',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {mode === 'nine-slice' ? 'Nine-Slice' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <SpriteCanvas asset={currentAsset} mode={canvasMode} onUpdate={handleAssetUpdated} />
        {currentAsset?.animations && currentAsset.animations.length > 0 && (
          <AnimationPreview asset={currentAsset} />
        )}
      </div>

      {/* Right column */}
      <div style={{ overflow: 'auto' }}>
        <MetadataForm asset={currentAsset} onUpdate={handleAssetUpdated} />
      </div>
    </div>
  );
}
