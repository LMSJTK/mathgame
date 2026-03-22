import { useState, useCallback, useMemo } from 'react';
import GridCanvas from './GridCanvas.tsx';
import ToolPalette from './ToolPalette.tsx';
import PropertiesPanel from './PropertiesPanel.tsx';
import EncounterPanel from './EncounterPanel.tsx';
import TriggerPanel from './TriggerPanel.tsx';
import DialoguePanel from './DialoguePanel.tsx';
import LayerPanel from './LayerPanel.tsx';
import AudioPanel from './AudioPanel.tsx';
import DifficultyPanel from './DifficultyPanel.tsx';
import LevelMetaBar from './LevelMetaBar.tsx';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.ts';
import type { HistoryControls } from '../hooks/useHistory.ts';
import type { Level, PhysicsTile, Entity, MathEncounter, Trigger, Dialogue, Layer, DifficultyProfile, TileType, EntityType } from '../types/level.ts';
import type { AssetRecord } from '../types/asset.ts';

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

type RightTab = 'properties' | 'encounters' | 'triggers' | 'dialogue' | 'layers' | 'audio' | 'difficulty';

interface Props {
  level: Level | null;
  onChange: (level: Level | null) => void;
  assets: AssetRecord[];
  history: HistoryControls<Level>;
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

export default function LevelEditor({ level, onChange, assets, history }: Props) {
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

  // Layer CRUD
  const handleAddLayer = useCallback((layer: Layer) => {
    update({ layers: [...(lv.layers ?? []), layer] });
  }, [lv, update]);

  const handleUpdateLayer = useCallback((id: string, patch: Partial<Layer>) => {
    update({
      layers: (lv.layers ?? []).map(l => l.id === id ? { ...l, ...patch } : l),
    });
  }, [lv, update]);

  const handleRemoveLayer = useCallback((id: string) => {
    update({ layers: (lv.layers ?? []).filter(l => l.id !== id) });
  }, [lv, update]);

  const handleReorderLayer = useCallback((fromIndex: number, toIndex: number) => {
    const layers = [...(lv.layers ?? [])];
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved);
    update({ layers });
  }, [lv, update]);

  // Audio
  const handleUpdateAudio = useCallback((audio: Level['audio']) => {
    update({ audio });
  }, [update]);

  // Difficulty profile
  const handleUpdateDifficulty = useCallback((difficultyProfile: DifficultyProfile) => {
    update({ difficultyProfile });
  }, [update]);

  // Delete currently selected item
  const deleteSelection = useCallback(() => {
    if (!selection) return;
    if (selection.kind === 'tile') handleRemoveTile(selection.index);
    else if (selection.kind === 'entity') handleRemoveEntity(selection.id);
    else if (selection.kind === 'encounter') handleRemoveEncounter(selection.id);
    else if (selection.kind === 'trigger') handleRemoveTrigger(selection.id);
    else if (selection.kind === 'dialogue') handleRemoveDialogue(selection.id);
    setSelection(null);
  }, [selection, handleRemoveTile, handleRemoveEntity, handleRemoveEncounter, handleRemoveTrigger, handleRemoveDialogue]);

  // Wire up keyboard shortcuts
  const shortcutActions = useMemo(() => ({
    undo: history.undo,
    redo: history.redo,
    setToolSelect: () => setTool({ kind: 'select' }),
    setToolErase: () => setTool({ kind: 'erase' }),
    setToolTileSolid: () => setTool({ kind: 'tile', tileType: 'solid' }),
    setToolTileOneWay: () => setTool({ kind: 'tile', tileType: 'one_way' }),
    setToolTileHazard: () => setTool({ kind: 'tile', tileType: 'hazard' }),
    setToolTileIce: () => setTool({ kind: 'tile', tileType: 'ice' }),
    setToolTileConveyor: () => setTool({ kind: 'tile', tileType: 'conveyor' }),
    deleteSelection,
    deselect: () => setSelection(null),
  }), [history.undo, history.redo, deleteSelection]);

  useKeyboardShortcuts(shortcutActions);

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
        {/* Undo / Redo bar */}
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 10,
          display: 'flex', gap: 4, background: '#0b182bee', borderRadius: 6,
          padding: '4px 6px', border: '1px solid #1a2a4a',
        }}>
          <button
            onClick={history.undo}
            disabled={!history.canUndo}
            title="Undo (Ctrl+Z)"
            style={{
              padding: '3px 10px', fontSize: 13, cursor: history.canUndo ? 'pointer' : 'default',
              border: '1px solid #1a2a4a', borderRadius: 4,
              background: history.canUndo ? '#1a3050' : 'transparent',
              color: history.canUndo ? '#6ed4ff' : '#3a5a7a',
            }}
          >Undo</button>
          <button
            onClick={history.redo}
            disabled={!history.canRedo}
            title="Redo (Ctrl+Shift+Z)"
            style={{
              padding: '3px 10px', fontSize: 13, cursor: history.canRedo ? 'pointer' : 'default',
              border: '1px solid #1a2a4a', borderRadius: 4,
              background: history.canRedo ? '#1a3050' : 'transparent',
              color: history.canRedo ? '#6ed4ff' : '#3a5a7a',
            }}
          >Redo</button>
        </div>
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
          {(['properties', 'layers', 'encounters', 'triggers', 'dialogue', 'audio', 'difficulty'] as const).map(t => (
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
              assets={assets}
              onUpdateTile={handleUpdateTile}
              onRemoveTile={handleRemoveTile}
              onUpdateEntity={handleUpdateEntity}
              onRemoveEntity={handleRemoveEntity}
            />
          )}
          {rightTab === 'layers' && (
            <LayerPanel
              layers={lv.layers ?? []}
              assets={assets}
              onAdd={handleAddLayer}
              onUpdate={handleUpdateLayer}
              onRemove={handleRemoveLayer}
              onReorder={handleReorderLayer}
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
          {rightTab === 'audio' && (
            <AudioPanel
              audio={lv.audio ?? {}}
              assets={assets}
              onChange={handleUpdateAudio}
            />
          )}
          {rightTab === 'difficulty' && (
            <DifficultyPanel
              profile={lv.difficultyProfile ?? { adaptive: false }}
              onChange={handleUpdateDifficulty}
            />
          )}
        </div>
      </div>
    </div>
  );
}
