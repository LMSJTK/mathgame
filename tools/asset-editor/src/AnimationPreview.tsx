/**
 * Math Game Asset Editor — Animation Preview
 * Plays back animation clips defined on an asset.
 */
import React, { useState, useEffect, useRef } from 'react';
import type { AssetRecord } from './api';

interface Props {
  asset: AssetRecord;
}

export default function AnimationPreview({ asset }: Props) {
  const [clipIndex, setClipIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clips = asset.animations || [];
  const clip = clips[clipIndex];

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!clip || !playing) return;

    const ms = 1000 / clip.frameRate;
    intervalRef.current = setInterval(() => {
      setFrameIndex(f => {
        const next = f + 1;
        if (next >= clip.frames.length) return clip.loop ? 0 : f;
        return next;
      });
    }, ms);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [clip, playing]);

  useEffect(() => { setFrameIndex(0); }, [clipIndex]);

  if (!clip) return null;

  return (
    <div style={{ padding: 12, background: '#0b182bdd', border: '1px solid #80adff30', borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ fontSize: 13, color: '#6ed4ff', margin: 0 }}>Animation Preview</h4>
        <div style={{ display: 'flex', gap: 4 }}>
          {clips.map((c, i) => (
            <button
              key={i}
              onClick={() => setClipIndex(i)}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                border: i === clipIndex ? '1px solid #6ed4ff' : '1px solid #80adff20',
                borderRadius: 6,
                background: i === clipIndex ? '#1a3050' : 'transparent',
                color: '#eef6ff',
                cursor: 'pointer',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: 12, background: '#0d1a30', borderRadius: 10 }}>
        <img
          src={clip.frames[frameIndex]}
          alt={`${clip.name} frame ${frameIndex}`}
          style={{ maxWidth: '100%', maxHeight: 200, imageRendering: 'pixelated' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button
          onClick={() => setPlaying(!playing)}
          style={{ padding: '4px 12px', border: '1px solid #80adff40', borderRadius: 6, background: 'transparent', color: '#eef6ff', cursor: 'pointer', fontSize: 12 }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <span style={{ fontSize: 11, color: '#9eb8d4' }}>
          Frame {frameIndex + 1}/{clip.frames.length} • {clip.frameRate}fps
        </span>
      </div>
    </div>
  );
}
