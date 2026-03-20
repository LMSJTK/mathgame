import { useState } from 'react';
import LevelEditor from './components/LevelEditor.tsx';
import type { Level } from './types/level.ts';

const TABS = ['Level Editor', 'Assets'] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>('Level Editor');
  const [level, setLevel] = useState<Level | null>(null);

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
          <LevelEditor level={level} onChange={setLevel} />
        )}
        {tab === 'Assets' && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9eb8d4' }}>
            Asset editor — coming soon (stubs in tools/asset-editor)
          </div>
        )}
      </div>
    </div>
  );
}
