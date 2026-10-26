import { CATEGORIES } from './weapons';
import { countCamo, hasCamo, lockReason } from './rules';
import {
  CAMOS,
  CAMO_LABELS,
  CAMO_POINTS,
  type Camo,
  type PlayerProgress,
  type Progress,
  type Weapon,
  type WeaponProgress,
} from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = 'America/Sao_Paulo';
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dayKey(ts: number): string {
  return dayFormat.format(ts);
}

export interface Unlock {
  weaponId: string;
  camo: Camo;
  ts: number;
}

export function unlocksOf(pp: PlayerProgress, weapons: Weapon[]): Unlock[] {
  const list: Unlock[] = [];
  for (const w of weapons) {
    for (const camo of CAMOS) {
      const ts = pp[w.id]?.[camo];
      if (ts !== undefined) list.push({ weaponId: w.id, camo, ts });
    }
  }
  return list.sort((a, b) => a.ts - b.ts);
}

export function highestCamo(wp: WeaponProgress | undefined): Camo | null {
  if (!wp) return null;
  for (let i = CAMOS.length - 1; i >= 0; i--) {
    if (wp[CAMOS[i]] !== undefined) return CAMOS[i];
  }
  return null;
}

export interface ScorePoint {
  ts: number;
  score: number;
}

export interface ScoreHistory {
  start: number;
  end: number;
  series: Record<string, ScorePoint[]>;
}

export function scoreHistory(progress: Progress, players: string[], weapons: Weapon[], now: number): ScoreHistory {
  const unlocks = Object.fromEntries(players.map((p) => [p, unlocksOf(progress[p] ?? {}, weapons)]));
  const dated = Object.values(unlocks)
    .flat()
    .filter((u) => u.ts > 0)
    .map((u) => u.ts);
  const start = dated.length ? Math.min(...dated) : now - 7 * DAY_MS;

  const series: Record<string, ScorePoint[]> = {};
  for (const player of players) {
    let score = unlocks[player].filter((u) => u.ts === 0).reduce((acc, u) => acc + CAMO_POINTS[u.camo], 0);
    const points: ScorePoint[] = [{ ts: start, score }];
    for (const u of unlocks[player].filter((x) => x.ts > 0)) {
      score += CAMO_POINTS[u.camo];
      points.push({ ts: u.ts, score });
    }
    points.push({ ts: Math.max(now, start), score });
    series[player] = dedupeByTs(points);
  }
  return { start, end: now, series };
}

function dedupeByTs(points: ScorePoint[]): ScorePoint[] {
  const out: ScorePoint[] = [];
  for (const p of points) {
    if (out.length && out[out.length - 1].ts === p.ts) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

export interface Suggestion {
  kind: 'ready' | 'category' | 'global';
  title: string;
  detail: string;
}

export function nextSteps(pp: PlayerProgress, weapons: Weapon[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const camo of CAMOS.slice(1)) {
    const ready = weapons.filter((w) => !hasCamo(pp, w.id, camo) && lockReason(pp, weapons, w, camo) === null);
    if (ready.length) {
      suggestions.push({
        kind: 'ready',
        title: `${CAMO_LABELS[camo]} liberada em ${ready.length} arma${ready.length > 1 ? 's' : ''}`,
        detail: `Já dá para marcar: ${ready.map((w) => w.name).join(', ')}`,
      });
    }
  }

  const pending = CATEGORIES.map((category) => {
    const missing = weapons.filter((w) => w.category === category && !hasCamo(pp, w.id, 'ouro'));
    return { category, missing };
  })
    .filter((c) => c.missing.length > 0)
    .sort((a, b) => a.missing.length - b.missing.length)
    .slice(0, 3);
  for (const { category, missing } of pending) {
    suggestions.push({
      kind: 'category',
      title: `${category}: falta${missing.length > 1 ? 'm' : ''} ${missing.length} ouro${missing.length > 1 ? 's' : ''} para a Platina`,
      detail: missing.map((w) => w.name).join(', '),
    });
  }

  const platinas = countCamo(pp, weapons, 'platina');
  const dissonancias = countCamo(pp, weapons, 'dissonancia');
  if (platinas < weapons.length) {
    suggestions.push({
      kind: 'global',
      title: `Dissonância: faltam ${weapons.length - platinas} platinas`,
      detail: `${platinas}/${weapons.length} platinas no arsenal`,
    });
  } else if (dissonancias < weapons.length) {
    suggestions.push({
      kind: 'global',
      title: `Divergência: faltam ${weapons.length - dissonancias} dissonâncias`,
      detail: `${dissonancias}/${weapons.length} dissonâncias no arsenal`,
    });
  }

  return suggestions;
}

export function pointsInWindow(pp: PlayerProgress, weapons: Weapon[], from: number, to: number): number {
  return unlocksOf(pp, weapons)
    .filter((u) => u.ts >= from && u.ts <= to)
    .reduce((acc, u) => acc + CAMO_POINTS[u.camo], 0);
}
