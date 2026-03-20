import type { MathEncounter, Entity } from '../types/level.ts';
import type { Selection } from './LevelEditor.tsx';
import { genId } from './LevelEditor.tsx';
import { ENCOUNTER_TYPE_OPTIONS, SKILL_OPTIONS } from '../types/level.ts';

interface Props {
  encounters: MathEncounter[];
  entities: Entity[];
  onAdd: (enc: MathEncounter) => void;
  onUpdate: (id: string, patch: Partial<MathEncounter>) => void;
  onRemove: (id: string) => void;
  selection: Selection;
  onSelect: (sel: Selection) => void;
}

export default function EncounterPanel({ encounters, entities, onAdd, onUpdate, onRemove, selection, onSelect }: Props) {
  const handleAdd = () => {
    const enc: MathEncounter = {
      id: genId('enc'),
      encounterType: 'gate_unlock',
      skill: 'addition_subtraction',
      difficulty: 'easy',
      successTarget: 1,
      failureLimit: 3,
      reward: { type: 'progress', amount: 1 },
      remediation: { onFailure: 'show_hint_then_retry' },
    };
    onAdd(enc);
    onSelect({ kind: 'encounter', id: enc.id });
  };

  const equationZones = entities.filter(e => e.type === 'equation_zone');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
          Encounters ({encounters.length})
        </span>
        <button onClick={handleAdd} style={{
          padding: '3px 10px', fontSize: 11, cursor: 'pointer',
          border: '1px solid #6ed4ff', borderRadius: 5,
          background: '#1a3050', color: '#6ed4ff',
        }}>+ Add</button>
      </div>

      {encounters.map(enc => {
        const isSelected = selection?.kind === 'encounter' && selection.id === enc.id;
        return (
          <div key={enc.id}
            onClick={() => onSelect({ kind: 'encounter', id: enc.id })}
            style={{
              padding: 10, borderRadius: 8, cursor: 'pointer',
              border: isSelected ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
              background: isSelected ? '#0d1a30' : '#08111f',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#eef6ff' }}>{enc.id}</span>
              <button onClick={e => { e.stopPropagation(); onRemove(enc.id); }} style={{
                padding: '1px 6px', fontSize: 10, cursor: 'pointer',
                border: '1px solid #6a2a2a', borderRadius: 4,
                background: 'transparent', color: '#ff6e6e',
              }}>x</button>
            </div>

            {isSelected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Field label="ID">
                  <input value={enc.id} onChange={e => onUpdate(enc.id, { id: e.target.value })}
                    style={inputStyle} />
                </Field>

                <Field label="Type">
                  <select value={enc.encounterType}
                    onChange={e => onUpdate(enc.id, { encounterType: e.target.value as MathEncounter['encounterType'] })}
                    style={inputStyle}>
                    {ENCOUNTER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </Field>

                <Field label="Skill">
                  <select value={enc.skill}
                    onChange={e => onUpdate(enc.id, { skill: e.target.value })}
                    style={inputStyle}>
                    {SKILL_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </Field>

                <Field label="Difficulty">
                  <select value={enc.difficulty}
                    onChange={e => onUpdate(enc.id, { difficulty: e.target.value })}
                    style={inputStyle}>
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                </Field>

                <div style={{ display: 'flex', gap: 6 }}>
                  <Field label="Success Target">
                    <input type="number" value={enc.successTarget} min={1}
                      onChange={e => onUpdate(enc.id, { successTarget: +e.target.value })}
                      style={{ ...inputStyle, width: 60 }} />
                  </Field>
                  <Field label="Failure Limit">
                    <input type="number" value={enc.failureLimit} min={1}
                      onChange={e => onUpdate(enc.id, { failureLimit: +e.target.value })}
                      style={{ ...inputStyle, width: 60 }} />
                  </Field>
                </div>

                <Field label="Linked Entity">
                  <select value={enc.linkedEntityId ?? ''}
                    onChange={e => onUpdate(enc.id, { linkedEntityId: e.target.value || undefined })}
                    style={inputStyle}>
                    <option value="">— none —</option>
                    {equationZones.map(ez => (
                      <option key={ez.id} value={ez.id}>{ez.id}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {/* Summary when collapsed */}
            {!isSelected && (
              <div style={{ fontSize: 11, color: '#9eb8d4' }}>
                {enc.encounterType.replace(/_/g, ' ')} — {enc.skill.replace(/_/g, ' ')} ({enc.difficulty})
              </div>
            )}
          </div>
        );
      })}

      {encounters.length === 0 && (
        <div style={{ color: '#9eb8d4', fontSize: 12, padding: 20, textAlign: 'center' }}>
          No encounters yet. Click + Add to create one.
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '3px 6px', fontSize: 12,
  background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}
