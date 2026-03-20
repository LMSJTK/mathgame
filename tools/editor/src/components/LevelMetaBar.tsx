import { useRef } from 'react';
import type { Level } from '../types/level.ts';
import { genId } from './LevelEditor.tsx';

interface Props {
  level: Level;
  onChange: (level: Level) => void;
}

export default function LevelMetaBar({ level, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = JSON.stringify(level, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${level.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        onChange(parsed as Level);
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleNew = () => {
    if (!confirm('Create a new blank level? Unsaved changes will be lost.')) return;
    onChange({
      id: genId('level'),
      name: 'Untitled Level',
      description: '',
      difficulty: 'easy',
      scene: { width: 40, height: 20, tileSize: 32, gravity: 800 },
      layers: [],
      physicsTiles: [],
      entities: [{ id: genId('ent'), type: 'player_spawn', x: 64, y: 576 }],
      triggers: [],
      mathEncounters: [],
      dialogue: [],
    });
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 12px', background: '#0d1a30',
      borderBottom: '1px solid #1a2a4a', fontSize: 12,
    }}>
      {/* Name */}
      <label style={{ color: '#9eb8d4' }}>Name:</label>
      <input
        value={level.name}
        onChange={e => onChange({ ...level, name: e.target.value })}
        style={{
          width: 200, padding: '3px 8px', fontSize: 12,
          background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
        }}
      />

      {/* ID */}
      <label style={{ color: '#9eb8d4' }}>ID:</label>
      <input
        value={level.id}
        onChange={e => onChange({ ...level, id: e.target.value })}
        style={{
          width: 140, padding: '3px 8px', fontSize: 12,
          background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
        }}
      />

      {/* Difficulty */}
      <select
        value={level.difficulty ?? 'easy'}
        onChange={e => onChange({ ...level, difficulty: e.target.value as Level['difficulty'] })}
        style={{
          padding: '3px 8px', fontSize: 12,
          background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
        }}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      {/* Grid dimensions */}
      <label style={{ color: '#9eb8d4' }}>Grid:</label>
      <input
        type="number" value={level.scene.width} min={5} max={200}
        onChange={e => onChange({ ...level, scene: { ...level.scene, width: +e.target.value } })}
        style={{ width: 50, padding: '3px 4px', fontSize: 12, background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff', textAlign: 'center' }}
      />
      <span style={{ color: '#3a5a8a' }}>x</span>
      <input
        type="number" value={level.scene.height} min={5} max={200}
        onChange={e => onChange({ ...level, scene: { ...level.scene, height: +e.target.value } })}
        style={{ width: 50, padding: '3px 4px', fontSize: 12, background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff', textAlign: 'center' }}
      />

      <span style={{ flex: 1 }} />

      {/* File operations */}
      <Btn label="New" onClick={handleNew} />
      <Btn label="Import" onClick={() => fileRef.current?.click()} />
      <Btn label="Export JSON" onClick={handleExport} primary />
      <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />

      {/* Stats */}
      <span style={{ color: '#9eb8d4', fontSize: 11 }}>
        {level.physicsTiles.length} tiles | {level.entities.length} entities | {level.mathEncounters.length} encounters
      </span>
    </div>
  );
}

function Btn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', fontSize: 11, cursor: 'pointer',
      border: primary ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
      borderRadius: 5,
      background: primary ? '#1a3050' : 'transparent',
      color: primary ? '#6ed4ff' : '#eef6ff',
    }}>
      {label}
    </button>
  );
}
