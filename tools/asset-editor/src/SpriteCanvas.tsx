/**
 * Math Game Asset Editor — Sprite Canvas
 * Forked from ComplexEngineReference, extended with collision box and nine-slice editing.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { assetsApi, type AssetRecord } from './api';

interface Props {
  asset: AssetRecord | null;
  mode: 'anchor' | 'collision' | 'nine-slice';
  onUpdate: (asset: AssetRecord) => void;
}

const CANVAS_SIZE = 512;

export default function SpriteCanvas({ asset, mode, onUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Checkerboard background
    const tileSize = 16;
    for (let y = 0; y < CANVAS_SIZE; y += tileSize) {
      for (let x = 0; x < CANVAS_SIZE; x += tileSize) {
        ctx.fillStyle = ((x + y) / tileSize) % 2 === 0 ? '#1a1a2e' : '#16162a';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    const img = imageRef.current;
    if (!img || !asset) return;

    // Center image
    const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height, 1) * 0.8;
    const w = img.width * scale;
    const h = img.height * scale;
    const ox = (CANVAS_SIZE - w) / 2;
    const oy = (CANVAS_SIZE - h) / 2;

    ctx.drawImage(img, ox, oy, w, h);

    // Draw anchor
    if (mode === 'anchor' && asset.anchor_x !== undefined) {
      const ax = ox + asset.anchor_x * w;
      const ay = oy + asset.anchor_y * h;
      ctx.beginPath();
      ctx.arc(ax, ay, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax - 12, ay);
      ctx.lineTo(ax + 12, ay);
      ctx.moveTo(ax, ay - 12);
      ctx.lineTo(ax, ay + 12);
      ctx.stroke();
    }

    // Draw collision box
    if (mode === 'collision' && asset.collisionBox) {
      const { x, y, w: bw, h: bh } = asset.collisionBox;
      ctx.strokeStyle = '#7dffb0';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(ox + x * scale, oy + y * scale, bw * scale, bh * scale);
      ctx.setLineDash([]);
    }

    // Draw nine-slice guides
    if (mode === 'nine-slice' && asset.nineSlice) {
      const { top, right, bottom, left } = asset.nineSlice;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      // Horizontal guides
      ctx.beginPath();
      ctx.moveTo(ox, oy + top * scale);
      ctx.lineTo(ox + w, oy + top * scale);
      ctx.moveTo(ox, oy + h - bottom * scale);
      ctx.lineTo(ox + w, oy + h - bottom * scale);
      // Vertical guides
      ctx.moveTo(ox + left * scale, oy);
      ctx.lineTo(ox + left * scale, oy + h);
      ctx.moveTo(ox + w - right * scale, oy);
      ctx.lineTo(ox + w - right * scale, oy + h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [asset, mode]);

  useEffect(() => {
    if (!asset?.imagePath) {
      imageRef.current = null;
      draw();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      draw();
    };
    img.src = asset.imagePath;
  }, [asset?.imagePath, draw]);

  useEffect(() => { draw(); }, [draw]);

  const handleClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!asset || !imageRef.current) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const img = imageRef.current;
    const imgScale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height, 1) * 0.8;
    const w = img.width * imgScale;
    const h = img.height * imgScale;
    const ox = (CANVAS_SIZE - w) / 2;
    const oy = (CANVAS_SIZE - h) / 2;

    if (mode === 'anchor') {
      const ax = Math.max(0, Math.min(1, (cx - ox) / w));
      const ay = Math.max(0, Math.min(1, (cy - oy) / h));
      const updated = await assetsApi.setAnchor(asset.id, +ax.toFixed(3), +ay.toFixed(3));
      onUpdate(updated);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b182bdd', border: '1px solid #80adff30', borderRadius: 16, padding: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: '#6ed4ff' }}>
          Canvas — {mode === 'anchor' ? 'Anchor Point' : mode === 'collision' ? 'Collision Box' : 'Nine-Slice Guides'}
        </span>
        {asset && (
          <span style={{ fontSize: 11, color: '#9eb8d4' }}>
            {asset.width}×{asset.height}px
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onClick={handleClick}
        style={{ width: '100%', maxHeight: '100%', aspectRatio: '1', borderRadius: 10, cursor: mode === 'anchor' ? 'crosshair' : 'default' }}
      />
    </div>
  );
}
