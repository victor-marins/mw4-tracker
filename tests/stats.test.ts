import { describe, expect, it } from 'vitest';
import { milestones, discordMessage } from '@/lib/milestones';
import { DAY_MS, HISTORY_START, nextSteps, pointsInWindow, scoreHistory } from '@/lib/stats';
import type { Progress, Weapon } from '@/lib/types';

const weapons: Weapon[] = [
  { id: 'a1', name: 'A1', category: 'Fuzis de Assalto' },
  { id: 'a2', name: 'A2', category: 'Fuzis de Assalto' },
  { id: 's1', name: 'S1', category: 'SMTs' },
];
const NOW = Date.UTC(2026, 9, 26, 18);

describe('scoreHistory', () => {
  it('starts on 24/10, puts undated unlocks in the baseline and steps up at each dated unlock', () => {
    const progress: Progress = { ana: { a1: { ouro: 0 }, a2: { ouro: NOW - 2 * DAY_MS } } };
    const { start, series } = scoreHistory(progress, ['ana', 'bia'], weapons, NOW);
    expect(start).toBe(HISTORY_START);
    expect(series.ana).toEqual([
      { ts: start, score: 1 },
      { ts: NOW - 2 * DAY_MS, score: 2 },
      { ts: NOW, score: 2 },
    ]);
    expect(series.bia).toEqual([
      { ts: start, score: 0 },
      { ts: NOW, score: 0 },
    ]);
  });

  it('shows the rise when the only dated unlock is today', () => {
    const progress: Progress = { ana: { a1: { ouro: HISTORY_START }, s1: { ouro: NOW - 1000 } } };
    const { series } = scoreHistory(progress, ['ana'], weapons, NOW);
    expect(series.ana.map((p) => p.score)).toEqual([1, 2, 2]);
  });

  it('starts earlier when there are unlocks before 24/10', () => {
    const early = HISTORY_START - 3 * DAY_MS;
    expect(scoreHistory({ ana: { a1: { ouro: early } } }, ['ana'], weapons, NOW).start).toBe(early);
  });
});

describe('pointsInWindow', () => {
  it('sums only the unlocks inside the window', () => {
    const pp = { a1: { ouro: NOW - 10 * DAY_MS, platina: NOW - DAY_MS }, a2: { ouro: 0 } };
    expect(pointsInWindow(pp, weapons, NOW - 7 * DAY_MS, NOW)).toBe(2);
    expect(pointsInWindow(pp, weapons, 0, NOW)).toBe(4);
  });
});

describe('nextSteps', () => {
  it('lists camos ready to mark and the closest category', () => {
    const steps = nextSteps({ a1: { ouro: 1 }, a2: { ouro: 1 } }, weapons);
    expect(steps[0]).toMatchObject({ kind: 'ready', detail: 'Já dá para marcar: A1, A2' });
    expect(steps.find((s) => s.kind === 'category')?.title).toContain('SMTs');
  });
});

describe('milestones', () => {
  it('announces when a category closes and when dissonance unlocks', () => {
    const before = { a1: { ouro: 1, platina: 1 }, a2: { ouro: 1, platina: 1 }, s1: { ouro: 1 } };
    const after = { ...before, s1: { ouro: 1, platina: 2 } };
    expect(milestones(before, after, weapons)).toEqual(['platinou o arsenal inteiro — **Dissonância liberada!**']);
    expect(milestones({}, { s1: { ouro: 1 } }, weapons)).toEqual(['fechou os ouros de **SMTs** — Platina liberada!']);
  });

  it('only posts unlocks to Discord', () => {
    const event = { id: '1', ts: 1, player: 'ana', weaponId: 'a1', weaponName: 'A1', camo: 'ouro' as const };
    expect(discordMessage('ana', [{ ...event, action: 'remove' }], [])).toBeNull();
    expect(discordMessage('ana', [{ ...event, action: 'unlock' }], [])).toBe('🟡 **ana** desbloqueou **Ouro** na **A1**');
  });
});
