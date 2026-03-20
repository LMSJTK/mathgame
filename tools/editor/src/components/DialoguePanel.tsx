import type { Dialogue, DialogueLine } from '../types/level.ts';
import { genId } from './LevelEditor.tsx';
import { useState } from 'react';

interface Props {
  dialogues: Dialogue[];
  onAdd: (dlg: Dialogue) => void;
  onUpdate: (id: string, patch: Partial<Dialogue>) => void;
  onRemove: (id: string) => void;
}

export default function DialoguePanel({ dialogues, onAdd, onUpdate, onRemove }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleAdd = () => {
    const dlg: Dialogue = {
      id: genId('dlg'),
      speaker: 'Professor Pi',
      lines: [{ text: 'Hello!', duration: 2 }],
    };
    onAdd(dlg);
    setExpanded(dlg.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
          Dialogue ({dialogues.length})
        </span>
        <button onClick={handleAdd} style={addBtnStyle}>+ Add</button>
      </div>

      {dialogues.map(dlg => {
        const isExpanded = expanded === dlg.id;
        return (
          <div key={dlg.id} style={{
            padding: 10, borderRadius: 8,
            border: isExpanded ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
            background: isExpanded ? '#0d1a30' : '#08111f',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpanded(isExpanded ? null : dlg.id)}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#eef6ff' }}>{dlg.id}</span>
              <button onClick={e => { e.stopPropagation(); onRemove(dlg.id); }} style={removeBtnStyle}>x</button>
            </div>

            {!isExpanded && (
              <div style={{ fontSize: 11, color: '#9eb8d4', marginTop: 4 }}>
                {dlg.speaker} — {dlg.lines.length} line(s)
              </div>
            )}

            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <Field label="Dialogue ID">
                  <input value={dlg.id} onChange={e => onUpdate(dlg.id, { id: e.target.value })} style={inputStyle} />
                </Field>

                <Field label="Speaker">
                  <input value={dlg.speaker} onChange={e => onUpdate(dlg.id, { speaker: e.target.value })} style={inputStyle} />
                </Field>

                {/* Lines */}
                <div style={{ borderTop: '1px solid #1a2a4a', paddingTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase' }}>Lines ({dlg.lines.length})</span>
                    <button onClick={() => {
                      const lines = [...dlg.lines, { text: '', duration: 2 }];
                      onUpdate(dlg.id, { lines });
                    }} style={{ ...addBtnStyle, fontSize: 10, padding: '2px 8px' }}>+</button>
                  </div>

                  {dlg.lines.map((line, li) => (
                    <div key={li} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, padding: 6, background: '#08111f', borderRadius: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: '#9eb8d4' }}>Line {li + 1}</span>
                        <button onClick={() => {
                          const lines = dlg.lines.filter((_, i) => i !== li);
                          onUpdate(dlg.id, { lines });
                        }} style={removeBtnStyle}>x</button>
                      </div>

                      <textarea
                        value={line.text}
                        onChange={e => {
                          const lines = [...dlg.lines];
                          lines[li] = { ...lines[li], text: e.target.value };
                          onUpdate(dlg.id, { lines });
                        }}
                        rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                        placeholder="Dialogue text..."
                      />

                      <div style={{ display: 'flex', gap: 6 }}>
                        <Field label="Duration (s)">
                          <input type="number" value={line.duration ?? ''} step={0.5} min={0}
                            onChange={e => {
                              const lines = [...dlg.lines];
                              lines[li] = { ...lines[li], duration: +e.target.value || undefined } as DialogueLine;
                              onUpdate(dlg.id, { lines });
                            }}
                            style={{ ...inputStyle, width: 60 }} />
                        </Field>
                        <Field label="Emotion">
                          <input value={line.emotion ?? ''}
                            onChange={e => {
                              const lines = [...dlg.lines];
                              lines[li] = { ...lines[li], emotion: e.target.value || undefined } as DialogueLine;
                              onUpdate(dlg.id, { lines });
                            }}
                            style={inputStyle}
                            placeholder="neutral, happy, sad..." />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {dialogues.length === 0 && (
        <div style={{ color: '#9eb8d4', fontSize: 12, padding: 20, textAlign: 'center' }}>
          No dialogue yet. Click + Add to create one.
        </div>
      )}
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
  background: '#1a3050', color: '#6ed4ff',
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
