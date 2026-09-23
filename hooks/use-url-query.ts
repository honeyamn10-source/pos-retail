'use client';
import { useSyncExternalStore } from 'react';

const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
};
const snapshot = () => window.location.search;
const serverSnapshot = () => '';

export function useUrlQuery(name: string): string | null {
  const search = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return new URLSearchParams(search).get(name);
}
