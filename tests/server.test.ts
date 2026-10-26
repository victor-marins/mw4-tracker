import { beforeEach, describe, expect, it } from 'vitest';
import { RuleError } from '@/lib/rules';
import {
  addPlayer,
  addWeapon,
  deleteWeapon,
  getPlayers,
  getState,
  KEYS,
  LEGACY_KEY,
  migrateLegacy,
  removePlayer,
  setCamo,
  ValidationError,
} from '@/lib/server/repo';
import { memoryStore, type Store } from '@/lib/server/store';
import { DEFAULT_PLAYERS } from '@/lib/weapons';

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
    const state = await getState(store);
    expect(state.progress.Marins).toEqual({ ar1: { ouro: 100 } });
    expect(state.progress.Pagno).toEqual({ sg1: { ouro: 200 } });
    expect(state.progress.itnaS).toEqual({});
    expect(state.feed.map((e) => `${e.player}:${e.weaponName}:${e.action}`)).toEqual([
      'Pagno:REZI 12:unlock',
      'Marins:HYEON BURST:unlock',
    ]);
  });

  it('drops an unlock from the feed when it is undone, keeping only the latest re-unlock', async () => {
    await setCamo('Marins', 'ar1', 'ouro', true, 100, store);
    await setCamo('Marins', 'ar2', 'ouro', true, 150, store);
    await setCamo('Marins', 'ar1', 'ouro', false, 200, store);
    let state = await getState(store);
    expect(state.feed.map((e) => `${e.weaponId}:${e.ts}`)).toEqual(['ar2:150']);

    await setCamo('Marins', 'ar1', 'ouro', true, 300, store);
    state = await getState(store);
    expect(state.feed.map((e) => `${e.weaponId}:${e.ts}`)).toEqual(['ar1:300', 'ar2:150']);
  });

  it('also hides unlocks removed by a cascade', async () => {
    await setCamo('Marins', 'sg1', 'ouro', true, 1, store);
    await setCamo('Marins', 'sg2', 'ouro', true, 2, store);
    await setCamo('Marins', 'sg2', 'platina', true, 3, store);
    await setCamo('Marins', 'sg1', 'ouro', false, 4, store);
    const state = await getState(store);
    expect(state.feed.map((e) => `${e.weaponId}:${e.camo}`)).toEqual(['sg2:ouro']);
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
    await deleteWeapon(weapon.id, store);
    const state = await getState(store);
    expect(state.weapons.some((w) => w.id === weapon.id)).toBe(false);
    expect(state.progress.Pagno).toEqual({});
    await expect(deleteWeapon('ar1', store)).rejects.toThrow('Só armas adicionadas');
  });
});

describe('members', () => {
  let store: Store;
  beforeEach(() => {
    store = memoryStore();
  });

  it('starts with the original squad', async () => {
    expect(await getPlayers(store)).toEqual(DEFAULT_PLAYERS);
  });

  it('only Marins can add or remove members', async () => {
    await expect(addPlayer('Pagno', 'Novato', store)).rejects.toThrow('Só Marins');
    await expect(removePlayer('Pagno', 'itnaS', store)).rejects.toThrow('Só Marins');
    await expect(addPlayer(undefined, 'Novato', store)).rejects.toBeInstanceOf(ValidationError);
    expect(await getPlayers(store)).toEqual(DEFAULT_PLAYERS);
  });

  it('adds a member at the end, who can then mark camos', async () => {
    expect(await addPlayer('Marins', '  Novato_1 ', store)).toEqual([...DEFAULT_PLAYERS, 'Novato_1']);
    await setCamo('Novato_1', 'ar1', 'ouro', true, 10, store);
    const state = await getState(store);
    expect(state.players.at(-1)).toBe('Novato_1');
    expect(state.progress.Novato_1).toEqual({ ar1: { ouro: 10 } });
  });

  it('rejects invalid or duplicate names', async () => {
    await expect(addPlayer('Marins', 'x', store)).rejects.toThrow('Nome inválido');
    await expect(addPlayer('Marins', 'nome com espaço', store)).rejects.toThrow('Nome inválido');
    await expect(addPlayer('Marins', 'pagno', store)).rejects.toThrow('já existe');
  });

  it('removes a member but keeps their progress for a later re-add', async () => {
    await setCamo('itnaS', 'ar1', 'ouro', true, 10, store);
    await removePlayer('Marins', 'itnaS', store);
    let state = await getState(store);
    expect(state.players).not.toContain('itnaS');
    expect(state.feed).toEqual([]);
    await expect(setCamo('itnaS', 'ar2', 'ouro', true, 11, store)).rejects.toBeInstanceOf(ValidationError);

    await addPlayer('Marins', 'itnaS', store);
    state = await getState(store);
    expect(state.progress.itnaS).toEqual({ ar1: { ouro: 10 } });
    expect(state.feed.map((e) => e.player)).toEqual(['itnaS']);
  });

  it('never removes Marins', async () => {
    await expect(removePlayer('Marins', 'Marins', store)).rejects.toThrow('não pode ser removido');
  });
});
