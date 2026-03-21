import { useRef, useCallback, useState } from 'react';

const MAX_HISTORY = 50;

export interface HistoryControls<T> {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Push current value to history without changing it (e.g. before a batch of changes) */
  checkpoint: () => void;
}

/**
 * Wraps a state value with undo/redo history.
 * Returns [value, setValue, controls].
 */
export function useHistory<T>(
  initial: T | null,
): [T | null, (next: T | null) => void, HistoryControls<T>] {
  const [value, setValueRaw] = useState<T | null>(initial);
  const undoStack = useRef<(T | null)[]>([]);
  const redoStack = useRef<(T | null)[]>([]);
  const lastValue = useRef<T | null>(initial);

  const setValue = useCallback((next: T | null) => {
    undoStack.current.push(lastValue.current);
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    lastValue.current = next;
    setValueRaw(next);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push(lastValue.current);
    lastValue.current = prev;
    setValueRaw(prev);
  }, []);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(lastValue.current);
    lastValue.current = next;
    setValueRaw(next);
  }, []);

  const checkpoint = useCallback(() => {
    undoStack.current.push(lastValue.current);
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, []);

  // We need canUndo/canRedo to be reactive. Since refs don't trigger re-renders,
  // we derive them from the current render's knowledge: we track stack lengths via state.
  // However, to keep it simple, we use a trick: the stacks change only when setValue/undo/redo
  // are called, all of which also call setValueRaw, triggering a re-render.
  // At render time we can read the refs safely.
  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return [value, setValue, { undo, redo, canUndo, canRedo, checkpoint }];
}
