import { useSyncExternalStore } from 'react';

let currentTime = 0;
const listeners = new Set<() => void>();

export function setPlayerTime(t: number): void {
  currentTime = t;
  listeners.forEach((l) => l());
}

export function getPlayerTime(): number {
  return currentTime;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePlayerTime(): number {
  return useSyncExternalStore(subscribe, getPlayerTime);
}
