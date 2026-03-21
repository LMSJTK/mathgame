import { useState } from 'react';
import type { AssetRecord } from '../types/asset.ts';

interface AudioConfig {
  backgroundMusic?: string;
  ambience?: string;
  soundEffects?: Record<string, string>;
}

interface Props {
  audio: AudioConfig;
  assets: AssetRecord[];
  onChange: (audio: AudioConfig) => void;
}

export default function AudioPanel({ audio, assets, onChange }: Props) {
  const [newEffectKey, setNewEffectKey] = useState('');

  const sfx = audio.soundEffects ?? {};
  const sfxEntries = Object.entries(sfx);

  const handleAddEffect = () => {
    const key = newEffectKey.trim();
    if (!key || key in sfx) return;
    onChange({ ...audio, soundEffects: { ...sfx, [key]: '' } });
    setNewEffectKey('');
  };

  const handleUpdateEffect = (key: string, value: string) => {
    onChange({ ...audio, soundEffects: { ...sfx, [key]: value } });
  };

  const handleRemoveEffect = (key: string) => {
    const next = { ...sfx };
    delete next[key];
    onChange({ ...audio, soundEffects: next });
  };

  const handleRenameEffect = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || (newKey !== oldKey && newKey in sfx)) return;
    const entries = Object.entries(sfx);
    const next: Record<string, string> = {};
    for (const [k, v] of entries) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange({ ...audio, soundEffects: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 11, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
        Audio Configuration
      </span>

      {/* Background Music */}
      <Field label="Background Music">
        <input
          value={audio.backgroundMusic ?? ''}
          onChange={e => onChange({ ...audio, backgroundMusic: e.target.value || undefined })}
          style={inputStyle}
          placeholder="Asset path or ID..."
        />
      </Field>

      {/* Ambience */}
      <Field label="Ambience">
        <input
          value={audio.ambience ?? ''}
          onChange={e => onChange({ ...audio, ambience: e.target.value || undefined })}
          style={inputStyle}
          placeholder="Asset path or ID..."
        />
      </Field>

      {/* Sound Effects map */}
      <div style={{ borderTop: '1px solid #1a2a4a', paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
            Sound Effects ({sfxEntries.length})
          </span>
        </div>

        {/* Add new effect */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <input
            value={newEffectKey}
            onChange={e => setNewEffectKey(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddEffect(); }}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Effect key (e.g. jump, coin)..."
          />
          <button onClick={handleAddEffect} style={addBtnStyle}>+ Add</button>
        </div>

        {sfxEntries.map(([key, value]) => (
          <div key={key} style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            marginBottom: 6, padding: 8, background: '#08111f', borderRadius: 6,
            border: '1px solid #1a2a4a',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                value={key}
                onChange={e => handleRenameEffect(key, e.target.value)}
                style={{ ...inputStyle, width: 'auto', flex: 1, fontWeight: 600, background: 'transparent', border: 'none', padding: 0 }}
              />
              <button onClick={() => handleRemoveEffect(key)} style={removeBtnStyle}>x</button>
            </div>
            <input
              value={value}
              onChange={e => handleUpdateEffect(key, e.target.value)}
              style={inputStyle}
              placeholder="Asset path or ID..."
            />
          </div>
        ))}

        {sfxEntries.length === 0 && (
          <div style={{ color: '#9eb8d4', fontSize: 11, padding: 12, textAlign: 'center' }}>
            No sound effects. Add one above.
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '3px 6px', fontSize: 12,
  background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
};

const addBtnStyle: React.CSSProperties = {
  padding: '3px 10px', fontSize: 11, cursor: 'pointer',
  border: '1px solid #6ed4ff', borderRadius: 5,
  background: '#1a3050', color: '#6ed4ff', whiteSpace: 'nowrap',
};

const removeBtnStyle: React.CSSProperties = {
  padding: '1px 6px', fontSize: 10, cursor: 'pointer',
  border: '1px solid #6a2a2a', borderRadius: 4,
  background: 'transparent', color: '#ff6e6e',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}
