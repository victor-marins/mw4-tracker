import { describe, expect, it } from 'vitest';
import { applyCamo, camoTotals, lockReason, RuleError } from '@/lib/rules';
import type { PlayerProgress, Weapon } from '@/lib/types';

const weapons: Weapon[] = [
  { id: 'a1', name: 'A1', category: 'Fuzis de Assalto' },
  { id: 'a2', name: 'A2', category: 'Fuzis de Assalto' },
  { id: 's1', name: 'S1', category: 'SMTs' },
];

const full = (camo: 'ouro' | 'platina' | 'dissonancia' | 'divergencia'): PlayerProgress => {
  const order = ['ouro', 'platina', 'dissonancia', 'divergencia'] as const;
  const wp = Object.fromEntries(order.slice(0, order.indexOf(camo) + 1).map((c) => [c, 1]));
  return Object.fromEntries(weapons.map((w) => [w.id, { ...wp }]));
};

describe('lockReason', () => {
  it('requires every gold in the category before platinum', () => {
    const pp: PlayerProgress = { a1: { ouro: 1 } };
    expect(lockReason(pp, weapons, weapons[0], 'platina')).toBe('FALTAM 1');
    expect(lockReason({ ...pp, a2: { ouro: 1 } }, weapons, weapons[0], 'platina')).toBeNull();
    expect(lockReason(pp, weapons, weapons[1], 'platina')).toBe('REQUER OURO');
  });

  it('derives the dissonance target from the weapon count, including custom weapons', () => {
    const pp = full('platina');
    expect(lockReason(pp, weapons, weapons[0], 'dissonancia')).toBeNull();
    const withCustom = [...weapons, { id: 'c1', name: 'C1', category: 'SMTs', isCustom: true }];
    expect(lockReason(pp, withCustom, weapons[0], 'dissonancia')).toBe('FALTAM 1');
  });
});

describe('applyCamo', () => {
  it('records the unlock timestamp', () => {
    const { next, changes } = applyCamo({}, weapons, 'a1', 'ouro', true, 123);
    expect(next).toEqual({ a1: { ouro: 123 } });
    expect(changes).toEqual([{ weaponId: 'a1', camo: 'ouro', action: 'unlock' }]);
  });

  it('rejects a locked camo', () => {
    expect(() => applyCamo({}, weapons, 'a1', 'platina', true, 1)).toThrow(RuleError);
  });

  it('is a no-op when the value already matches', () => {
    const pp: PlayerProgress = { a1: { ouro: 5 } };
    expect(applyCamo(pp, weapons, 'a1', 'ouro', true, 9)).toEqual({ next: pp, changes: [] });
    expect(applyCamo({}, weapons, 'a1', 'ouro', false, 9)).toEqual({ next: {}, changes: [] });
  });

  it('removing a gold that closes the category also removes its platinums', () => {
    const pp: PlayerProgress = { a1: { ouro: 1, platina: 2 }, a2: { ouro: 1, platina: 3 }, s1: { ouro: 1 } };
    const { next, changes } = applyCamo(pp, weapons, 'a2', 'ouro', false, 9);
    expect(next).toEqual({ a1: { ouro: 1 }, s1: { ouro: 1 } });
    expect(changes).toHaveLength(3);
  });

  it('removing a platinum when all were done removes every dissonance and divergence', () => {
    const { next } = applyCamo(full('divergencia'), weapons, 's1', 'platina', false, 9);
    expect(next.s1).toEqual({ ouro: 1 });
    expect(next.a1).toEqual({ ouro: 1, platina: 1 });
    expect(next.a2).toEqual({ ouro: 1, platina: 1 });
  });

  it('keeps grandfathered camos when the threshold was already broken by a new weapon', () => {
    const withCustom = [...weapons, { id: 'c1', name: 'C1', category: 'Fuzis de Assalto', isCustom: true }];
    const pp = full('platina');
    const { next } = applyCamo(pp, withCustom, 'a1', 'ouro', false, 9);
    expect(next.a1).toBeUndefined();
    expect(next.a2).toEqual({ ouro: 1, platina: 1 });
  });

  it('does not mutate the input', () => {
    const pp = full('platina');
    const snapshot = structuredClone(pp);
    applyCamo(pp, weapons, 'a1', 'ouro', false, 9);
    expect(pp).toEqual(snapshot);
  });
});

describe('camoTotals', () => {
  it('scores ouro 1, platina 2, dissonancia 3, divergencia 4 and ignores unknown weapons', () => {
    const pp: PlayerProgress = { ...full('dissonancia'), ghost: { ouro: 1 } };
    expect(camoTotals(pp, weapons)).toEqual({ ouro: 3, platina: 3, dissonancia: 3, divergencia: 0, score: 18 });
  });
});
