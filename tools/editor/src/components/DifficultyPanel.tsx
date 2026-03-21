import type { DifficultyProfile } from '../types/level.ts';

interface Props {
  profile: DifficultyProfile;
  onChange: (profile: DifficultyProfile) => void;
}

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'] as const;

export default function DifficultyPanel({ profile, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 11, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2 }}>
        Difficulty Profile
      </span>

      {/* Adaptive toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 10, borderRadius: 8, border: '1px solid #1a2a4a',
        background: profile.adaptive ? '#0d1a30' : '#08111f',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#eef6ff' }}>
          <input
            type="checkbox"
            checked={profile.adaptive}
            onChange={e => onChange({ ...profile, adaptive: e.target.checked })}
            style={{ accentColor: '#6ed4ff' }}
          />
          Adaptive Difficulty
        </label>
      </div>

      {profile.adaptive && (
        <div style={{ fontSize: 11, color: '#6b8aaa', padding: '0 4px' }}>
          When enabled, the game adjusts encounter difficulty based on player performance in real time.
        </div>
      )}

      {/* Min / Max difficulty */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Min Difficulty">
          <select
            value={profile.minDifficulty ?? ''}
            onChange={e => onChange({ ...profile, minDifficulty: e.target.value || undefined })}
            style={inputStyle}
          >
            <option value="">None</option>
            {DIFFICULTY_OPTIONS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>

        <Field label="Max Difficulty">
          <select
            value={profile.maxDifficulty ?? ''}
            onChange={e => onChange({ ...profile, maxDifficulty: e.target.value || undefined })}
            style={inputStyle}
          >
            <option value="">None</option>
            {DIFFICULTY_OPTIONS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Escalation rate */}
      <Field label="Escalation Rate">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min={0} max={2} step={0.1}
            value={profile.escalationRate ?? 1}
            onChange={e => onChange({ ...profile, escalationRate: +e.target.value })}
            style={{ flex: 1, accentColor: '#6ed4ff' }}
          />
          <span style={{ fontSize: 12, color: '#eef6ff', minWidth: 32, textAlign: 'right' }}>
            {(profile.escalationRate ?? 1).toFixed(1)}x
          </span>
        </div>
      </Field>

      <div style={{ fontSize: 11, color: '#6b8aaa', padding: '0 4px' }}>
        Controls how fast difficulty increases. 1.0x is normal, 0.5x is slower, 2.0x is faster.
      </div>

      {/* Summary */}
      <div style={{
        padding: 10, borderRadius: 8, border: '1px solid #1a2a4a', background: '#08111f',
        fontSize: 11, color: '#9eb8d4', lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: '#eef6ff' }}>Summary</div>
        <div>Adaptive: {profile.adaptive ? 'On' : 'Off'}</div>
        {profile.minDifficulty && <div>Floor: {profile.minDifficulty}</div>}
        {profile.maxDifficulty && <div>Ceiling: {profile.maxDifficulty}</div>}
        <div>Escalation: {(profile.escalationRate ?? 1).toFixed(1)}x</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '3px 6px', fontSize: 12,
  background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <label style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}
