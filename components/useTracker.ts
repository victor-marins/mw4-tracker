'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerProgress, TrackerState } from '@/lib/types';

const POLL_MS = 15_000;

export function useTracker() {
  const [state, setState] = useState<TrackerState | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(0);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    setSyncing(true);
    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Falha ao carregar');
      if (!inFlight.current) {
        setState(body);
        setLastSync(Date.now());
      }
    } catch {
      setError('Sem conexão com o servidor');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const mutate = useCallback(
    async (url: string, method: string, body?: unknown, optimistic?: (s: TrackerState) => TrackerState) => {
      inFlight.current++;
      if (optimistic) setState((s) => (s ? optimistic(s) : s));
      let ok = false;
      try {
        const response = await fetch(url, {
          method,
          headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error ?? 'Algo deu errado');
        } else {
          setState(data);
          setLastSync(Date.now());
          ok = true;
        }
      } catch {
        setError('Sem conexão com o servidor');
      } finally {
        inFlight.current--;
      }
      if (!ok) await load();
      return ok;
    },
    [load],
  );

  const setProgress = useCallback(
    (player: string, weaponId: string, camo: string, value: boolean, next: PlayerProgress) =>
      mutate('/api/progress', 'POST', { player, weaponId, camo, value }, (s) => ({
        ...s,
        progress: { ...s.progress, [player]: next },
      })),
    [mutate],
  );

  const setOperatorPrestige = useCallback(
    (player: string, level: number) =>
      mutate('/api/operator-prestige', 'POST', { player, level }, (s) => ({
        ...s,
        operatorPrestige: { ...s.operatorPrestige, [player]: level },
      })),
    [mutate],
  );

  const clearError = useCallback(() => setError(null), []);

  return { state, lastSync, syncing, error, clearError, reload: load, mutate, setProgress, setOperatorPrestige };
}

export type Tracker = ReturnType<typeof useTracker>;
