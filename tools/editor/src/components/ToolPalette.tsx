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

const TILE_SHORTCUTS: Record<string, string> = {
  solid: '1', one_way: '2', hazard: '3', ice: '4', conveyor: '5',
};

export default function ToolPalette({ tool, onToolChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Mode tools */}
      <Section title="Mode">
        <ToolButton label="Select" shortcut="S" active={tool.kind === 'select'} onClick={() => onToolChange({ kind: 'select' })} />
        <ToolButton label="Erase" shortcut="X" active={tool.kind === 'erase'} onClick={() => onToolChange({ kind: 'erase' })} color="#ff6e6e" />
      </Section>

      {/* Tile tools */}
      <Section title="Tiles">
        {TILE_TYPE_OPTIONS.map(t => (
          <ToolButton
            key={t}
            label={t.replace('_', ' ')}
            shortcut={TILE_SHORTCUTS[t]}
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

      {/* Shortcut reference */}
      <Section title="Shortcuts">
        <div style={{ fontSize: 10, color: '#6b8aaa', lineHeight: 1.8 }}>
          <div><Kbd>Ctrl+Z</Kbd> Undo</div>
          <div><Kbd>Ctrl+Shift+Z</Kbd> Redo</div>
          <div><Kbd>Del</Kbd> Delete selected</div>
          <div><Kbd>Esc</Kbd> Deselect</div>
        </div>
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

function ToolButton({ label, active, onClick, swatch, icon, color, shortcut }: {
  label: string; active: boolean; onClick: () => void; swatch?: string; icon?: string; color?: string; shortcut?: string;
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
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-block', padding: '1px 5px', fontSize: 10,
      background: '#0f1a2d', border: '1px solid #1a2a4a', borderRadius: 3,
      color: '#6b8aaa', fontFamily: 'inherit', lineHeight: 1.4,
    }}>{children}</kbd>
  );
}
