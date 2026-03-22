import { useState, useCallback } from 'react';
import LevelEditor from './components/LevelEditor.tsx';
import AssetBrowser from './components/AssetBrowser.tsx';
import AssetDetail from './components/AssetDetail.tsx';
import GeneratePanel from './components/GeneratePanel.tsx';
import { useHistory } from './hooks/useHistory.ts';
import type { Level } from './types/level.ts';
import type { AssetRecord } from './types/asset.ts';

const TABS = ['Level Editor', 'Assets'] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>('Level Editor');
  const [level, setLevel, history] = useHistory<Level>(null);

  // Asset state
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const handleAddAsset = useCallback((asset: AssetRecord) => {
    setAssets(prev => [...prev, asset]);
  }, []);

  const handleUpdateAsset = useCallback((id: string, patch: Partial<AssetRecord>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }, []);

  const handleRemoveAsset = useCallback((id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    setSelectedAssetId(prev => prev === id ? null : prev);
  }, []);

  const handleImportAssets = useCallback((imported: AssetRecord[]) => {
    setAssets(prev => {
      const existing = new Set(prev.map(a => a.id));
      const newOnes = imported.filter(a => !existing.has(a.id));
      const updated = prev.map(a => {
        const match = imported.find(i => i.id === a.id);
        return match ? { ...a, ...match } : a;
      });
      return [...updated, ...newOnes];
    });
  }, []);

  const handleExportAssets = useCallback(() => {
    const json = JSON.stringify(assets, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [assets]);

  const selectedAsset = assets.find(a => a.id === selectedAssetId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', background: '#0b182b',
        borderBottom: '1px solid #1a2a4a',
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#6ed4ff', marginRight: 16 }}>
          Math Game Editor
        </span>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '5px 14px', fontSize: 13, cursor: 'pointer',
            border: t === tab ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
            borderRadius: 6,
            background: t === tab ? '#1a3050' : 'transparent',
            color: t === tab ? '#6ed4ff' : '#9eb8d4',
          }}>
            {t}
          </button>
        ))}
      </header>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'Level Editor' && (
          <LevelEditor level={level} onChange={setLevel} assets={assets} history={history} />
        )}
        {tab === 'Assets' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 320px 1fr', height: '100%' }}>
            <div style={{ borderRight: '1px solid #1a2a4a', overflow: 'hidden' }}>
              <AssetBrowser
                assets={assets}
                selectedId={selectedAssetId}
                onSelect={setSelectedAssetId}
                onAdd={handleAddAsset}
                onRemove={handleRemoveAsset}
                onImport={handleImportAssets}
                onExport={handleExportAssets}
              />
            </div>
            <div style={{ borderRight: '1px solid #1a2a4a', overflow: 'auto' }}>
              <GeneratePanel sourceAsset={selectedAsset} onAssetGenerated={handleAddAsset} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              {selectedAsset ? (
                <AssetDetail asset={selectedAsset} onUpdate={handleUpdateAsset} />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#9eb8d4' }}>
                  Select an asset to view its details, or create a new one.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
