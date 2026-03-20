import { useRef, useEffect, useCallback, useState } from 'react';
import type { Level, PhysicsTile, Entity } from '../types/level.ts';
import type { Tool, Selection } from './LevelEditor.tsx';
import { genId } from './LevelEditor.tsx';

const TILE_COLORS: Record<string, string> = {
  solid: '#1a2a4a',
  one_way: '#2a5a3a',
  hazard: '#6a2a2a',
  ice: '#2a4a6a',
  conveyor: '#4a3a2a',
};

const ENTITY_COLORS: Record<string, string> = {
  player_spawn: '#6ed4ff',
  checkpoint: '#7dffb0',
  exit: '#40b7ff',
  npc: '#f59e0b',
  collectible: '#fbbf24',
  enemy: '#ff6e6e',
  moving_platform: '#9eb8d4',
  equation_zone: '#c084fc',
};

interface Props {
  level: Level;
  tool: Tool;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onAddTile: (tile: PhysicsTile) => void;
  onUpdateTile: (index: number, tile: PhysicsTile) => void;
  onRemoveTile: (index: number) => void;
  onAddEntity: (entity: Entity) => void;
  onUpdateEntity: (id: string, patch: Partial<Entity>) => void;
  onRemoveEntity: (id: string) => void;
}

export default function GridCanvas({
  level, tool, selection, onSelect,
  onAddTile, onRemoveTile,
  onAddEntity, onRemoveEntity,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const panStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const paintedCells = useRef(new Set<string>());

  const ts = level.scene.tileSize;
  const worldW = level.scene.width * ts;
  const worldH = level.scene.height * ts;

  // Convert screen coords to world coords
  const screenToWorld = useCallback((sx: number, sy: number) => {
    return {
      wx: (sx - camera.x) / camera.zoom,
      wy: (sy - camera.y) / camera.zoom,
    };
  }, [camera]);

  // Convert world coords to grid coords
  const worldToGrid = useCallback((wx: number, wy: number) => {
    return {
      gx: Math.floor(wx / ts) * ts,
      gy: Math.floor(wy / ts) * ts,
    };
  }, [ts]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Grid background
    ctx.fillStyle = '#060d18';
    ctx.fillRect(0, 0, worldW, worldH);

    // Grid lines
    ctx.strokeStyle = '#0f1a2d';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= worldW; x += ts) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, worldH);
      ctx.stroke();
    }
    for (let y = 0; y <= worldH; y += ts) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(worldW, y);
      ctx.stroke();
    }

    // Physics tiles
    level.physicsTiles.forEach((tile, i) => {
      const selected = selection?.kind === 'tile' && selection.index === i;
      ctx.fillStyle = TILE_COLORS[tile.type] ?? '#1a2a4a';
      ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

      // Tile type indicator
      ctx.strokeStyle = selected ? '#6ed4ff' : '#3a5a8a';
      ctx.lineWidth = selected ? 2 : 0.5;
      ctx.strokeRect(tile.x, tile.y, tile.w, tile.h);

      // Label for non-solid
      if (tile.type !== 'solid') {
        ctx.fillStyle = '#ffffff60';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tile.type, tile.x + tile.w / 2, tile.y + tile.h / 2 + 3);
      }
    });

    // Entities
    level.entities.forEach(entity => {
      const color = ENTITY_COLORS[entity.type] ?? '#eef6ff';
      const selected = selection?.kind === 'entity' && selection.id === entity.id;
      const size = entity.type === 'equation_zone'
        ? { w: (entity.properties?.width as number) ?? 64, h: (entity.properties?.height as number) ?? 64 }
        : { w: 24, h: 24 };

      if (entity.type === 'equation_zone') {
        // Equation zones draw as translucent rectangles
        ctx.fillStyle = color + '25';
        ctx.fillRect(entity.x - size.w / 2, entity.y - size.h / 2, size.w, size.h);
        ctx.strokeStyle = selected ? '#ffffff' : color;
        ctx.lineWidth = selected ? 2 : 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(entity.x - size.w / 2, entity.y - size.h / 2, size.w, size.h);
        ctx.setLineDash([]);
      }

      // Entity marker dot/icon
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(entity.x, entity.y, selected ? 10 : 8, 0, Math.PI * 2);
      ctx.fill();

      if (selected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = '#08111f';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon: Record<string, string> = {
        player_spawn: 'S', checkpoint: 'C', exit: 'E', npc: 'N',
        collectible: '$', enemy: '!', moving_platform: 'M', equation_zone: 'Q',
      };
      ctx.fillText(icon[entity.type] ?? '?', entity.x, entity.y);

      // Name label below
      ctx.fillStyle = color;
      ctx.font = '9px Inter, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(entity.id, entity.x, entity.y + 12);
    });

    ctx.restore();
  }, [level, camera, selection, ts, worldW, worldH]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { wx, wy } = screenToWorld(sx, sy);

    // Middle mouse or space+click = pan
    if (e.button === 1) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, camX: camera.x, camY: camera.y };
      return;
    }

    if (e.button !== 0) return;

    if (tool.kind === 'select') {
      // Try to select an entity
      const entity = [...level.entities].reverse().find(ent => {
        const dx = Math.abs(wx - ent.x);
        const dy = Math.abs(wy - ent.y);
        return dx < 16 && dy < 16;
      });
      if (entity) {
        onSelect({ kind: 'entity', id: entity.id });
        return;
      }

      // Try to select a tile
      const tileIdx = level.physicsTiles.findIndex(t =>
        wx >= t.x && wx < t.x + t.w && wy >= t.y && wy < t.y + t.h
      );
      if (tileIdx >= 0) {
        onSelect({ kind: 'tile', index: tileIdx });
        return;
      }

      onSelect(null);
    }

    if (tool.kind === 'tile') {
      const { gx, gy } = worldToGrid(wx, wy);
      if (gx >= 0 && gy >= 0 && gx < worldW && gy < worldH) {
        paintedCells.current.clear();
        const key = `${gx},${gy}`;
        paintedCells.current.add(key);
        onAddTile({ x: gx, y: gy, w: ts, h: ts, type: tool.tileType });
        setIsPainting(true);
      }
    }

    if (tool.kind === 'entity') {
      const { gx, gy } = worldToGrid(wx, wy);
      const cx = gx + ts / 2;
      const cy = gy + ts / 2;
      const entity: Entity = {
        id: genId(tool.entityType),
        type: tool.entityType,
        x: cx,
        y: cy,
      };
      if (tool.entityType === 'equation_zone') {
        entity.properties = { width: 80, height: 80, encounterId: '' };
      }
      if (tool.entityType === 'collectible') {
        entity.properties = { value: 5 };
      }
      onAddEntity(entity);
      onSelect({ kind: 'entity', id: entity.id });
    }

    if (tool.kind === 'erase') {
      // Remove entity under cursor
      const entity = [...level.entities].reverse().find(ent => {
        const dx = Math.abs(wx - ent.x);
        const dy = Math.abs(wy - ent.y);
        return dx < 16 && dy < 16;
      });
      if (entity) {
        onRemoveEntity(entity.id);
        return;
      }

      // Remove tile under cursor
      const tileIdx = level.physicsTiles.findIndex(t =>
        wx >= t.x && wx < t.x + t.w && wy >= t.y && wy < t.y + t.h
      );
      if (tileIdx >= 0) {
        onRemoveTile(tileIdx);
      }
    }
  }, [tool, level, camera, screenToWorld, worldToGrid, worldW, worldH, ts, onAddTile, onAddEntity, onRemoveEntity, onRemoveTile, onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setCamera(c => ({
        ...c,
        x: panStart.current.camX + (e.clientX - panStart.current.x),
        y: panStart.current.camY + (e.clientY - panStart.current.y),
      }));
      return;
    }

    if (isPainting && tool.kind === 'tile') {
      const rect = canvasRef.current!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { wx, wy } = screenToWorld(sx, sy);
      const { gx, gy } = worldToGrid(wx, wy);
      const key = `${gx},${gy}`;
      if (gx >= 0 && gy >= 0 && gx < worldW && gy < worldH && !paintedCells.current.has(key)) {
        paintedCells.current.add(key);
        onAddTile({ x: gx, y: gy, w: ts, h: ts, type: tool.tileType });
      }
    }
  }, [isPanning, isPainting, tool, screenToWorld, worldToGrid, worldW, worldH, ts, onAddTile]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsPainting(false);
    paintedCells.current.clear();
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setCamera(c => {
      const newZoom = Math.min(4, Math.max(0.15, c.zoom * factor));
      // Zoom toward cursor
      const wx = (sx - c.x) / c.zoom;
      const wy = (sy - c.y) / c.zoom;
      return {
        zoom: newZoom,
        x: sx - wx * newZoom,
        y: sy - wy * newZoom,
      };
    });
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: isPanning ? 'grabbing' : tool.kind === 'select' ? 'default' : 'crosshair' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      />
    </div>
  );
}
