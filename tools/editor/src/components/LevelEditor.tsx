import { useState, useCallback } from 'react';
import GridCanvas from './GridCanvas.tsx';
import ToolPalette from './ToolPalette.tsx';
import PropertiesPanel from './PropertiesPanel.tsx';
import EncounterPanel from './EncounterPanel.tsx';
import TriggerPanel from './TriggerPanel.tsx';
import DialoguePanel from './DialoguePanel.tsx';
import LevelMetaBar from './LevelMetaBar.tsx';
import type { Level, PhysicsTile, Entity, MathEncounter, Trigger, Dialogue, TileType, EntityType } from '../types/level.ts';

export type Tool =
  | { kind: 'tile'; tileType: TileType }
  | { kind: 'entity'; entityType: EntityType }
  | { kind: 'select' }
  | { kind: 'erase' };

export type Selection =
  | { kind: 'tile'; index: number }
  | { kind: 'entity'; id: string }
  | { kind: 'encounter'; id: string }
  | { kind: 'trigger'; id: string }
  | { kind: 'dialogue'; id: string }
  | null;

type RightTab = 'properties' | 'encounters' | 'triggers' | 'dialogue';

interface Props {
  level: Level | null;
  onChange: (level: Level | null) => void;
}

let nextId = 1;
export function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${nextId++}`;
}

function createBlankLevel(): Level {
  return {
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
    audio: {},
    rewards: [],
    difficultyProfile: { adaptive: false },
  };
}

export default function LevelEditor({ level, onChange }: Props) {
  const [tool, setTool] = useState<Tool>({ kind: 'select' });
  const [selection, setSelection] = useState<Selection>(null);
  const [rightTab, setRightTab] = useState<RightTab>('properties');

  // Auto-create a blank level if none loaded
  const lv = level ?? createBlankLevel();
  if (!level) onChange(lv);

  const update = useCallback((patch: Partial<Level>) => {
    onChange({ ...lv, ...patch });
  }, [lv, onChange]);

  const handleAddTile = useCallback((tile: PhysicsTile) => {
    update({ physicsTiles: [...lv.physicsTiles, tile] });
  }, [lv, update]);

  const handleUpdateTile = useCallback((index: number, tile: PhysicsTile) => {
    const tiles = [...lv.physicsTiles];
    tiles[index] = tile;
    update({ physicsTiles: tiles });
  }, [lv, update]);

  const handleRemoveTile = useCallback((index: number) => {
    update({ physicsTiles: lv.physicsTiles.filter((_, i) => i !== index) });
    if (selection?.kind === 'tile' && selection.index === index) setSelection(null);
  }, [lv, update, selection]);

  const handleAddEntity = useCallback((entity: Entity) => {
    update({ entities: [...lv.entities, entity] });
  }, [lv, update]);

  const handleUpdateEntity = useCallback((id: string, patch: Partial<Entity>) => {
    update({
      entities: lv.entities.map(e => e.id === id ? { ...e, ...patch } : e),
    });
  }, [lv, update]);

  const handleRemoveEntity = useCallback((id: string) => {
    update({ entities: lv.entities.filter(e => e.id !== id) });
    if (selection?.kind === 'entity' && selection.id === id) setSelection(null);
  }, [lv, update, selection]);

  // Encounter CRUD
  const handleAddEncounter = useCallback((enc: MathEncounter) => {
    update({ mathEncounters: [...lv.mathEncounters, enc] });
  }, [lv, update]);

  const handleUpdateEncounter = useCallback((id: string, patch: Partial<MathEncounter>) => {
    update({
      mathEncounters: lv.mathEncounters.map(e => e.id === id ? { ...e, ...patch } : e),
    });
  }, [lv, update]);

  const handleRemoveEncounter = useCallback((id: string) => {
    update({ mathEncounters: lv.mathEncounters.filter(e => e.id !== id) });
  }, [lv, update]);

  // Trigger CRUD
  const handleAddTrigger = useCallback((trigger: Trigger) => {
    update({ triggers: [...(lv.triggers ?? []), trigger] });
  }, [lv, update]);

  const handleUpdateTrigger = useCallback((id: string, patch: Partial<Trigger>) => {
    update({
      triggers: (lv.triggers ?? []).map(t => t.id === id ? { ...t, ...patch } : t),
    });
  }, [lv, update]);

  const handleRemoveTrigger = useCallback((id: string) => {
    update({ triggers: (lv.triggers ?? []).filter(t => t.id !== id) });
  }, [lv, update]);

  // Dialogue CRUD
  const handleAddDialogue = useCallback((dlg: Dialogue) => {
    update({ dialogue: [...(lv.dialogue ?? []), dlg] });
  }, [lv, update]);

  const handleUpdateDialogue = useCallback((id: string, patch: Partial<Dialogue>) => {
    update({
      dialogue: (lv.dialogue ?? []).map(d => d.id === id ? { ...d, ...patch } : d),
    });
  }, [lv, update]);

  const handleRemoveDialogue = useCallback((id: string) => {
    update({ dialogue: (lv.dialogue ?? []).filter(d => d.id !== id) });
  }, [lv, update]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 340px', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      {/* Top meta bar spanning all columns */}
      <div style={{ gridColumn: '1 / -1' }}>
        <LevelMetaBar level={lv} onChange={onChange} />
      </div>

      {/* Left: Tool palette */}
      <div style={{ overflow: 'auto', borderRight: '1px solid #1a2a4a', padding: 8 }}>
        <ToolPalette tool={tool} onToolChange={setTool} />
      </div>

      {/* Center: Grid canvas */}
      <div style={{ overflow: 'hidden', position: 'relative' }}>
        <GridCanvas
          level={lv}
          tool={tool}
          selection={selection}
          onSelect={setSelection}
          onAddTile={handleAddTile}
          onUpdateTile={handleUpdateTile}
          onRemoveTile={handleRemoveTile}
          onAddEntity={handleAddEntity}
          onUpdateEntity={handleUpdateEntity}
          onRemoveEntity={handleRemoveEntity}
        />
      </div>

      {/* Right: Properties / Encounters / Triggers / Dialogue */}
      <div style={{ overflow: 'hidden', borderLeft: '1px solid #1a2a4a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #1a2a4a' }}>
          {(['properties', 'encounters', 'triggers', 'dialogue'] as const).map(t => (
            <button key={t} onClick={() => setRightTab(t)} style={{
              flex: 1, padding: '6px 4px', fontSize: 11, cursor: 'pointer',
              border: 'none', borderBottom: t === rightTab ? '2px solid #6ed4ff' : '2px solid transparent',
              background: t === rightTab ? '#0b182b' : 'transparent',
              color: t === rightTab ? '#6ed4ff' : '#9eb8d4',
              textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
          {rightTab === 'properties' && (
            <PropertiesPanel
              level={lv}
              selection={selection}
              onUpdateTile={handleUpdateTile}
              onRemoveTile={handleRemoveTile}
              onUpdateEntity={handleUpdateEntity}
              onRemoveEntity={handleRemoveEntity}
            />
          )}
          {rightTab === 'encounters' && (
            <EncounterPanel
              encounters={lv.mathEncounters}
              entities={lv.entities}
              onAdd={handleAddEncounter}
              onUpdate={handleUpdateEncounter}
              onRemove={handleRemoveEncounter}
              selection={selection}
              onSelect={setSelection}
            />
          )}
          {rightTab === 'triggers' && (
            <TriggerPanel
              triggers={lv.triggers ?? []}
              onAdd={handleAddTrigger}
              onUpdate={handleUpdateTrigger}
              onRemove={handleRemoveTrigger}
            />
          )}
          {rightTab === 'dialogue' && (
            <DialoguePanel
              dialogues={lv.dialogue ?? []}
              onAdd={handleAddDialogue}
              onUpdate={handleUpdateDialogue}
              onRemove={handleRemoveDialogue}
            />
          )}
        </div>
      </div>
    </div>
  );
}
