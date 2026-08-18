'use client';

import { useCallback, useSyncExternalStore } from 'react';

export interface Box {
  id: number;
  description: string;
}

export const MAX_BOXES = 4;

const STORAGE_KEY = 'pp.boxes';
const EMPTY: Box[] = [];

const listeners = new Set<() => void>();

// getSnapshot must return a stable reference, so the parsed value is cached
// and only re-parsed when the underlying raw string actually changes.
let cachedRaw: string | null = null;
let cachedBoxes: Box[] = EMPTY;

function getSnapshot(): Box[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : EMPTY;
      cachedBoxes = Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      cachedBoxes = EMPTY;
    }
  }
  return cachedBoxes;
}

// localStorage does not exist during SSR, so the server renders an empty list.
function getServerSnapshot(): Box[] {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function write(next: Box[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode) - fall back to in-memory only.
    cachedRaw = null;
    cachedBoxes = next;
  }
  listeners.forEach((l) => l());
}

/**
 * Boxes are a front-end grouping only - sensor-api has no device registry,
 * so the list is persisted locally and shared across routes rather than
 * being invented separately on each page.
 */
export function useBoxes() {
  const boxes = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addBox = useCallback(
    (description: string) => {
      const current = getSnapshot();
      if (current.length >= MAX_BOXES) return;
      const nextId = current.reduce((max, b) => Math.max(max, b.id), 0) + 1;
      write([...current, { id: nextId, description }]);
    },
    []
  );

  const updateBox = useCallback((id: number, description: string) => {
    write(getSnapshot().map((b) => (b.id === id ? { ...b, description } : b)));
  }, []);

  const removeBox = useCallback((id: number) => {
    write(getSnapshot().filter((b) => b.id !== id));
  }, []);

  return { boxes, addBox, updateBox, removeBox };
}
