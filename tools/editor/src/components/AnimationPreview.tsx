import { useState, useEffect, useRef } from 'react';
import type { AnimationClip } from '../types/asset.ts';

interface Props {
  clips: AnimationClip[];
}

export default function AnimationPreview({ clips }: Props) {
  const [activeClip, setActiveClip] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clip = clips[activeClip];

  useEffect(() => {
    setFrameIndex(0);
    setPlaying(false);
  }, [activeClip]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!playing || !clip || clip.frames.length === 0) return;

    const interval = 1000 / clip.frameRate;
    timerRef.current = setInterval(() => {
      setFrameIndex(prev => {
        const next = prev + 1;
        if (next >= clip.frames.length) {
          if (clip.loop) return 0;
          setPlaying(false);
          return prev;
        }
        return next;
      });
    }, interval);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, clip]);

  if (!clips.length) {
    return (
      <div style={{ color: '#9eb8d4', fontSize: 12, padding: 16, textAlign: 'center' }}>
        No animation clips defined.
      </div>
    );
  }

  if (!clip) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Clip tabs */}
      {clips.length > 1 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {clips.map((c, i) => (
            <button key={i} onClick={() => setActiveClip(i)} style={{
              padding: '3px 10px', fontSize: 10, cursor: 'pointer',
              border: i === activeClip ? '1px solid #6ed4ff' : '1px solid #1a2a4a',
              borderRadius: 5,
              background: i === activeClip ? '#1a3050' : 'transparent',
              color: i === activeClip ? '#6ed4ff' : '#9eb8d4',
            }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Preview area */}
      <div style={{
        background: checkerboard(), border: '1px solid #1a2a4a', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 140, position: 'relative',
      }}>
        {clip.frames.length > 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 11, color: '#eef6ff', padding: '4px 8px',
              background: '#0b182b', borderRadius: 4, border: '1px solid #1a2a4a',
            }}>
              {clip.frames[frameIndex]}
            </div>
          </div>
        ) : (
          <span style={{ color: '#6b7280', fontSize: 11 }}>No frames</span>
        )}

        {/* Frame counter overlay */}
        <div style={{
          position: 'absolute', bottom: 6, right: 8,
          fontSize: 10, color: '#9eb8d4', background: '#08111fcc', padding: '2px 6px', borderRadius: 4,
        }}>
          {frameIndex + 1}/{clip.frames.length}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setPlaying(!playing)} style={{
          padding: '4px 12px', fontSize: 11, cursor: 'pointer',
          border: '1px solid #6ed4ff', borderRadius: 5,
          background: playing ? '#2a1040' : '#1a3050',
          color: playing ? '#ff6e6e' : '#6ed4ff', fontWeight: 600,
        }}>
          {playing ? 'Pause' : 'Play'}
        </button>

        <button onClick={() => { setFrameIndex(0); setPlaying(false); }} style={{
          padding: '4px 8px', fontSize: 11, cursor: 'pointer',
          border: '1px solid #1a2a4a', borderRadius: 5,
          background: 'transparent', color: '#9eb8d4',
        }}>
          Reset
        </button>

        {/* Scrub buttons */}
        <button
          onClick={() => setFrameIndex(Math.max(0, frameIndex - 1))}
          disabled={frameIndex === 0}
          style={{ ...scrubBtnStyle, opacity: frameIndex === 0 ? 0.3 : 1 }}
        >&lt;</button>
        <button
          onClick={() => setFrameIndex(Math.min(clip.frames.length - 1, frameIndex + 1))}
          disabled={frameIndex >= clip.frames.length - 1}
          style={{ ...scrubBtnStyle, opacity: frameIndex >= clip.frames.length - 1 ? 0.3 : 1 }}
        >&gt;</button>

        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#9eb8d4' }}>
          {clip.frameRate} FPS {clip.loop ? '(loop)' : '(once)'}
        </div>
      </div>
    </div>
  );
}

function checkerboard() {
  return `repeating-conic-gradient(#1a2a4a 0% 25%, #0f1a2d 0% 50%) 50% / 16px 16px`;
}

const scrubBtnStyle: React.CSSProperties = {
  padding: '3px 8px', fontSize: 12, cursor: 'pointer',
  border: '1px solid #1a2a4a', borderRadius: 4,
  background: 'transparent', color: '#9eb8d4', fontWeight: 700,
};
