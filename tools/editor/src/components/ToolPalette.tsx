import type { Tool } from './LevelEditor.tsx';
import { TILE_TYPE_OPTIONS, ENTITY_TYPE_OPTIONS } from '../types/level.ts';

const TILE_COLORS: Record<string, string> = {
  solid: '#1a2a4a',
  one_way: '#2a4a3a',
  hazard: '#6a2a2a',
  ice: '#2a4a6a',
  conveyor: '#4a3a2a',
};

const ENTITY_ICONS: Record<string, string> = {
  player_spawn: 'S',
  checkpoint: 'C',
  exit: 'E',
  npc: 'N',
  collectible: '$',
  enemy: '!',
  moving_platform: 'M',
  equation_zone: 'Q',
};

interface Props {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

function isActive(tool: Tool, kind: string, sub?: string): boolean {
  if (tool.kind !== kind) return false;
  if (kind === 'tile' && tool.kind === 'tile') return tool.tileType === sub;
  if (kind === 'entity' && tool.kind === 'entity') return tool.entityType === sub;
  return true;
}

export default function ToolPalette({ tool, onToolChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Mode tools */}
      <Section title="Mode">
        <ToolButton label="Select" active={tool.kind === 'select'} onClick={() => onToolChange({ kind: 'select' })} />
        <ToolButton label="Erase" active={tool.kind === 'erase'} onClick={() => onToolChange({ kind: 'erase' })} color="#ff6e6e" />
      </Section>

      {/* Tile tools */}
      <Section title="Tiles">
        {TILE_TYPE_OPTIONS.map(t => (
          <ToolButton
            key={t}
            label={t.replace('_', ' ')}
            active={isActive(tool, 'tile', t)}
            onClick={() => onToolChange({ kind: 'tile', tileType: t })}
            swatch={TILE_COLORS[t]}
          />
        ))}
      </Section>

      {/* Entity tools */}
      <Section title="Entities">
        {ENTITY_TYPE_OPTIONS.map(e => (
          <ToolButton
            key={e}
            label={e.replace(/_/g, ' ')}
            active={isActive(tool, 'entity', e)}
            onClick={() => onToolChange({ kind: 'entity', entityType: e })}
            icon={ENTITY_ICONS[e]}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</div>
    </div>
  );
}

function ToolButton({ label, active, onClick, swatch, icon, color }: {
  label: string; active: boolean; onClick: () => void; swatch?: string; icon?: string; color?: string;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 10px', fontSize: 12, cursor: 'pointer',
      border: active ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
      borderRadius: 6,
      background: active ? '#1a3050' : 'transparent',
      color: color ?? (active ? '#6ed4ff' : '#eef6ff'),
      textTransform: 'capitalize', textAlign: 'left',
    }}>
      {swatch && <span style={{ width: 14, height: 14, borderRadius: 3, background: swatch, flexShrink: 0 }} />}
      {icon && <span style={{ width: 18, textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#6ed4ff' }}>{icon}</span>}
      {label}
    </button>
  );
}
