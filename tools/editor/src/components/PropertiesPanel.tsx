import type { Level, PhysicsTile, Entity } from '../types/level.ts';
import type { Selection } from './LevelEditor.tsx';
import { TILE_TYPE_OPTIONS, ENTITY_TYPE_OPTIONS } from '../types/level.ts';

interface Props {
  level: Level;
  selection: Selection;
  onUpdateTile: (index: number, tile: PhysicsTile) => void;
  onRemoveTile: (index: number) => void;
  onUpdateEntity: (id: string, patch: Partial<Entity>) => void;
  onRemoveEntity: (id: string) => void;
}

export default function PropertiesPanel({
  level, selection,
  onUpdateTile, onRemoveTile,
  onUpdateEntity, onRemoveEntity,
}: Props) {
  if (!selection) {
    return <Empty>Click a tile or entity to view its properties.</Empty>;
  }

  if (selection.kind === 'tile') {
    const tile = level.physicsTiles[selection.index];
    if (!tile) return <Empty>Tile not found.</Empty>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Header>Tile Properties</Header>
        <Field label="Type">
          <select value={tile.type} onChange={e => onUpdateTile(selection.index, { ...tile, type: e.target.value as PhysicsTile['type'] })}>
            {TILE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Row>
          <Field label="X"><NumInput value={tile.x} onChange={v => onUpdateTile(selection.index, { ...tile, x: v })} /></Field>
          <Field label="Y"><NumInput value={tile.y} onChange={v => onUpdateTile(selection.index, { ...tile, y: v })} /></Field>
        </Row>
        <Row>
          <Field label="Width"><NumInput value={tile.w} min={1} onChange={v => onUpdateTile(selection.index, { ...tile, w: v })} /></Field>
          <Field label="Height"><NumInput value={tile.h} min={1} onChange={v => onUpdateTile(selection.index, { ...tile, h: v })} /></Field>
        </Row>
        <Field label="Asset Ref">
          <TextInput value={tile.assetRef ?? ''} onChange={v => onUpdateTile(selection.index, { ...tile, assetRef: v || undefined })} />
        </Field>
        <DangerBtn label="Delete Tile" onClick={() => onRemoveTile(selection.index)} />
      </div>
    );
  }

  if (selection.kind === 'entity') {
    const entity = level.entities.find(e => e.id === selection.id);
    if (!entity) return <Empty>Entity not found.</Empty>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Header>Entity Properties</Header>
        <Field label="ID">
          <TextInput value={entity.id} onChange={v => onUpdateEntity(entity.id, { id: v })} />
        </Field>
        <Field label="Type">
          <select value={entity.type} onChange={e => onUpdateEntity(entity.id, { type: e.target.value as Entity['type'] })}>
            {ENTITY_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Row>
          <Field label="X"><NumInput value={entity.x} onChange={v => onUpdateEntity(entity.id, { x: v })} /></Field>
          <Field label="Y"><NumInput value={entity.y} onChange={v => onUpdateEntity(entity.id, { y: v })} /></Field>
        </Row>
        <Field label="Asset Ref">
          <TextInput value={entity.assetRef ?? ''} onChange={v => onUpdateEntity(entity.id, { assetRef: v || undefined })} />
        </Field>

        {/* Dynamic properties */}
        {entity.type === 'equation_zone' && (
          <>
            <SubHeader>Equation Zone</SubHeader>
            <Row>
              <Field label="Width">
                <NumInput value={(entity.properties?.width as number) ?? 64} min={16}
                  onChange={v => onUpdateEntity(entity.id, { properties: { ...entity.properties, width: v } })} />
              </Field>
              <Field label="Height">
                <NumInput value={(entity.properties?.height as number) ?? 64} min={16}
                  onChange={v => onUpdateEntity(entity.id, { properties: { ...entity.properties, height: v } })} />
              </Field>
            </Row>
            <Field label="Encounter ID">
              <select
                value={(entity.properties?.encounterId as string) ?? ''}
                onChange={e => onUpdateEntity(entity.id, { properties: { ...entity.properties, encounterId: e.target.value } })}
              >
                <option value="">— none —</option>
                {level.mathEncounters.map(enc => (
                  <option key={enc.id} value={enc.id}>{enc.id} ({enc.encounterType})</option>
                ))}
              </select>
            </Field>
          </>
        )}

        {entity.type === 'collectible' && (
          <Field label="Value">
            <NumInput value={(entity.properties?.value as number) ?? 5} min={1}
              onChange={v => onUpdateEntity(entity.id, { properties: { ...entity.properties, value: v } })} />
          </Field>
        )}

        <DangerBtn label="Delete Entity" onClick={() => onRemoveEntity(entity.id)} />
      </div>
    );
  }

  return <Empty>Select a tile or entity to view properties.</Empty>;
}

// ─── Shared sub-components ────────────────────────────────────

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#9eb8d4', fontSize: 12, padding: 20, textAlign: 'center' }}>{children}</div>;
}

function Header({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: '#6ed4ff', margin: 0 }}>{children}</h3>;
}

function SubHeader({ children }: { children: React.ReactNode }) {
  return <h4 style={{ fontSize: 11, fontWeight: 600, color: '#9eb8d4', margin: 0, textTransform: 'uppercase', letterSpacing: 1, paddingTop: 6, borderTop: '1px solid #1a2a4a' }}>{children}</h4>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 10, color: '#9eb8d4', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 8 }}>{children}</div>;
}

function NumInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width: '100%', padding: '4px 6px', fontSize: 12,
        background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
      }}
    />
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '4px 6px', fontSize: 12,
        background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
      }}
    />
  );
}

function DangerBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', fontSize: 11, cursor: 'pointer', marginTop: 8,
      border: '1px solid #6a2a2a', borderRadius: 5,
      background: '#2a1010', color: '#ff6e6e',
    }}>
      {label}
    </button>
  );
}
