import { useEffect } from 'react';

export interface ShortcutActions {
  undo: () => void;
  redo: () => void;
  setToolSelect: () => void;
  setToolErase: () => void;
  setToolTileSolid: () => void;
  setToolTileOneWay: () => void;
  setToolTileHazard: () => void;
  setToolTileIce: () => void;
  setToolTileConveyor: () => void;
  deleteSelection: () => void;
  deselect: () => void;
}

/**
 * Global keyboard shortcut handler for the level editor.
 * Only fires when no input/textarea/select is focused.
 */
export function useKeyboardShortcuts(actions: ShortcutActions | null) {
  useEffect(() => {
    if (!actions) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        actions!.undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        actions!.redo();
        return;
      }
      if (ctrl && e.key === 'y') {
        e.preventDefault();
        actions!.redo();
        return;
      }

      // Tool shortcuts (no modifiers)
      if (ctrl || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'v':
        case 's':
          e.preventDefault();
          actions!.setToolSelect();
          break;
        case 'x':
          e.preventDefault();
          actions!.setToolErase();
          break;
        case 'b':
          e.preventDefault();
          actions!.setToolTileSolid();
          break;
        case '1':
          e.preventDefault();
          actions!.setToolTileSolid();
          break;
        case '2':
          e.preventDefault();
          actions!.setToolTileOneWay();
          break;
        case '3':
          e.preventDefault();
          actions!.setToolTileHazard();
          break;
        case '4':
          e.preventDefault();
          actions!.setToolTileIce();
          break;
        case '5':
          e.preventDefault();
          actions!.setToolTileConveyor();
          break;
        case 'delete':
        case 'backspace':
          e.preventDefault();
          actions!.deleteSelection();
          break;
        case 'escape':
          e.preventDefault();
          actions!.deselect();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
