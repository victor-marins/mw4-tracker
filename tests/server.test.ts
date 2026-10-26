import { beforeEach, describe, expect, it } from 'vitest';
import { RuleError } from '@/lib/rules';
import {
  addWeapon,
  deleteWeapon,
  getState,
  KEYS,
  LEGACY_KEY,
  migrateLegacy,
  setCamo,
  ValidationError,
} from '@/lib/server/repo';
import { memoryStore, type Store } from '@/lib/server/store';

describe('repository', () => {
  let store: Store;
  beforeEach(() => {
    store = memoryStore();
  });

  it('migrates the legacy blob once, without overwriting newer data', async () => {
    await store.set(
      LEGACY_KEY,
      JSON.stringify({
        weapons: [{ id: 'custom_1', name: 'NOVA', category: 'SMTs', isCustom: true }, { id: 'ar2', name: 'M4', category: 'Fuzis de Assalto' }],
        progress: {
          Marins: { ar1: { ouro: true, platina: false }, ar2: { ouro: true }, ar3: { ouro: false } },
        },
      }),
    );
    await store.hSet(KEYS.progress('Marins'), { ar2: JSON.stringify({ ouro: 777 }) });

    expect(await migrateLegacy(store, 5)).toBe(true);
    expect(await migrateLegacy(store, 6)).toBe(false);

    const progress = await store.hGetAll(KEYS.progress('Marins'));
    expect(JSON.parse(progress.ar1)).toEqual({ ouro: 0 });
    expect(JSON.parse(progress.ar2)).toEqual({ ouro: 777 });
    expect(progress.ar3).toBeUndefined();
    expect(Object.keys(await store.hGetAll(KEYS.customWeapons))).toEqual(['custom_1']);
    expect(await store.get(LEGACY_KEY)).not.toBeNull();
  });

  it('writes only the acting player and records feed events', async () => {
    await setCamo('Marins', 'ar1', 'ouro', true, 100, store);
    await setCamo('Pagno', 'sg1', 'ouro', true, 200, store);
    const state = await getState(['Marins', 'Pagno'], store);
    expect(state.progress).toEqual({ Marins: { ar1: { ouro: 100 } }, Pagno: { sg1: { ouro: 200 } } });
    expect(state.feed.map((e) => `${e.player}:${e.weaponName}:${e.action}`)).toEqual([
      'Pagno:REZI 12:unlock',
      'Marins:HYEON BURST:unlock',
    ]);
  });

  it('enforces the camo rules and the player list on the server', async () => {
    await expect(setCamo('Marins', 'ar1', 'platina', true, 1, store)).rejects.toBeInstanceOf(RuleError);
    await expect(setCamo('Hacker', 'ar1', 'ouro', true, 1, store)).rejects.toBeInstanceOf(ValidationError);
    expect(await store.hGetAll(KEYS.progress('Hacker'))).toEqual({});
  });

  it('adds and deletes custom weapons, cleaning everyone’s progress', async () => {
    const weapon = await addWeapon({ name: ' nova arma ', category: 'SMTs' }, 42, store);
    expect(weapon).toMatchObject({ id: 'custom_42', name: 'NOVA ARMA', isCustom: true });
    await expect(addWeapon({ name: 'nova arma', category: 'SMTs' }, 43, store)).rejects.toBeInstanceOf(ValidationError);

    await setCamo('Pagno', weapon.id, 'ouro', true, 1, store);
    await deleteWeapon(weapon.id, ['Marins', 'Pagno'], store);
    const state = await getState(['Marins', 'Pagno'], store);
    expect(state.weapons.some((w) => w.id === weapon.id)).toBe(false);
    expect(state.progress.Pagno).toEqual({});
    await expect(deleteWeapon('ar1', ['Pagno'], store)).rejects.toThrow('Só armas adicionadas');
  });
});
