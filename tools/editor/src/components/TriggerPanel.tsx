import type { Trigger, TriggerAction } from '../types/level.ts';
import { genId } from './LevelEditor.tsx';
import { TRIGGER_CONDITION_OPTIONS, TRIGGER_ACTION_OPTIONS } from '../types/level.ts';
import { useState } from 'react';

interface Props {
  triggers: Trigger[];
  onAdd: (trigger: Trigger) => void;
  onUpdate: (id: string, patch: Partial<Trigger>) => void;
  onRemove: (id: string) => void;
}

export default function TriggerPanel({ triggers, onAdd, onUpdate, onRemove }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleAdd = () => {
    const t: Trigger = {
      id: genId('trig'),
      condition: { type: 'on_level_start' },
      actions: [{ type: 'show_text', params: { text: 'Hello!' } }],
      once: true,
    };
    onAdd(t);
    setExpanded(t.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
          Triggers ({triggers.length})
        </span>
        <button onClick={handleAdd} style={addBtnStyle}>+ Add</button>
      </div>

      {triggers.map(trigger => {
        const isExpanded = expanded === trigger.id;
        return (
          <div key={trigger.id} style={{
            padding: 10, borderRadius: 8,
            border: isExpanded ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
            background: isExpanded ? '#0d1a30' : '#08111f',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpanded(isExpanded ? null : trigger.id)}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#eef6ff' }}>{trigger.id}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={e => { e.stopPropagation(); onRemove(trigger.id); }} style={removeBtnStyle}>x</button>
              </div>
            </div>

            {/* Summary */}
            {!isExpanded && (
              <div style={{ fontSize: 11, color: '#9eb8d4', marginTop: 4 }}>
                {trigger.condition.type.replace(/_/g, ' ')} → {trigger.actions.length} action(s) {trigger.once ? '(once)' : '(repeat)'}
              </div>
            )}

            {/* Expanded editor */}
            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <Field label="Trigger ID">
                  <input value={trigger.id} onChange={e => onUpdate(trigger.id, { id: e.target.value })} style={inputStyle} />
                </Field>

                <Field label="Condition">
                  <select value={trigger.condition.type}
                    onChange={e => onUpdate(trigger.id, { condition: { type: e.target.value as Trigger['condition']['type'], params: trigger.condition.params } })}
                    style={inputStyle}>
                    {TRIGGER_CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </Field>

                {/* Condition params as JSON */}
                <Field label="Condition Params (JSON)">
                  <textarea
                    value={JSON.stringify(trigger.condition.params ?? {}, null, 2)}
                    onChange={e => {
                      try {
                        const params = JSON.parse(e.target.value);
                        onUpdate(trigger.id, { condition: { ...trigger.condition, params } });
                      } catch { /* ignore parse errors while typing */ }
                    }}
                    rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
                  />
                </Field>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#eef6ff' }}>
                  <input type="checkbox" checked={trigger.once}
                    onChange={e => onUpdate(trigger.id, { once: e.target.checked })} />
                  Fire once
                </label>

                {/* Actions */}
                <div style={{ borderTop: '1px solid #1a2a4a', paddingTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase' }}>Actions ({trigger.actions.length})</span>
                    <button onClick={() => {
                      const actions = [...trigger.actions, { type: 'show_text' as const, params: { text: '' } }];
                      onUpdate(trigger.id, { actions });
                    }} style={{ ...addBtnStyle, fontSize: 10, padding: '2px 8px' }}>+</button>
                  </div>

                  {trigger.actions.map((action, ai) => (
                    <div key={ai} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, padding: 6, background: '#08111f', borderRadius: 6 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select value={action.type}
                          onChange={e => {
                            const actions = [...trigger.actions];
                            actions[ai] = { ...actions[ai], type: e.target.value as TriggerAction['type'] };
                            onUpdate(trigger.id, { actions });
                          }}
                          style={{ ...inputStyle, flex: 1 }}>
                          {TRIGGER_ACTION_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                        </select>
                        <button onClick={() => {
                          const actions = trigger.actions.filter((_, i) => i !== ai);
                          onUpdate(trigger.id, { actions });
                        }} style={removeBtnStyle}>x</button>
                      </div>
                      <textarea
                        value={JSON.stringify(action.params ?? {}, null, 2)}
                        onChange={e => {
                          try {
                            const params = JSON.parse(e.target.value);
                            const actions = [...trigger.actions];
                            actions[ai] = { ...actions[ai], params };
                            onUpdate(trigger.id, { actions });
                          } catch { /* ignore */ }
                        }}
                        rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {triggers.length === 0 && (
        <div style={{ color: '#9eb8d4', fontSize: 12, padding: 20, textAlign: 'center' }}>
          No triggers yet. Click + Add to create one.
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
