import { randomUUID } from 'node:crypto';
import { applyCamo, type CamoChange } from '../rules';
import {
  CAMOS,
  type Camo,
  type FeedEvent,
  type PlayerProgress,
  type Progress,
  type TrackerState,
  type Weapon,
  type WeaponProgress,
} from '../types';
import { ADMIN_PLAYER, DEFAULT_PLAYERS, DEFAULT_WEAPONS, isCategory } from '../weapons';
import { getStore, type Store } from './store';

const PREFIX = 'mw4:v2:';
export const KEYS = {
  customWeapons: `${PREFIX}weapons:custom`,
  progress: (player: string) => `${PREFIX}progress:${player}`,
  feed: `${PREFIX}feed`,
  migrated: `${PREFIX}migrated`,
  players: `${PREFIX}players`,
};
export const LEGACY_KEY = 'mw4_tracker_data';
const FEED_LIMIT = 200;

export class ValidationError extends Error {}

function parse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseHash<T>(hash: Record<string, string>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [field, raw] of Object.entries(hash)) {
    const value = parse<T>(raw);
    if (value) out[field] = value;
  }
  return out;
}

export async function migrateLegacy(store: Store, now = Date.now()): Promise<boolean> {
  if (await store.get(KEYS.migrated)) return false;
  const legacy = parse<{ weapons?: Weapon[]; progress?: Record<string, Record<string, Record<string, boolean>>> }>(
    await store.get(LEGACY_KEY),
  );
  if (legacy) {
    for (const weapon of legacy.weapons ?? []) {
      if (weapon.isCustom && weapon.id && weapon.name && isCategory(weapon.category)) {
        const { id, name, category } = weapon;
        await store.hSetNx(KEYS.customWeapons, id, JSON.stringify({ id, name, category, isCustom: true }));
      }
    }
    for (const [player, weapons] of Object.entries(legacy.progress ?? {})) {
      for (const [weaponId, flags] of Object.entries(weapons ?? {})) {
        const wp: WeaponProgress = {};
        for (const camo of CAMOS) if (flags?.[camo]) wp[camo] = 0;
        if (Object.keys(wp).length) await store.hSetNx(KEYS.progress(player), weaponId, JSON.stringify(wp));
      }
    }
  }
  await store.set(KEYS.migrated, String(now));
  return true;
}

async function ensureReady(store: Store, players: string[]) {
  await migrateLegacy(store);
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_SEED === '1') {
    const { seedDevData } = await import('./dev-seed');
    await seedDevData(store, players);
  }
}

export async function getWeapons(store: Store = getStore()): Promise<Weapon[]> {
  const custom = Object.values(parseHash<Weapon>(await store.hGetAll(KEYS.customWeapons))).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  return [...DEFAULT_WEAPONS, ...custom];
}

export async function getPlayers(store: Store = getStore()): Promise<string[]> {
  const players = parse<string[]>(await store.get(KEYS.players));
  return Array.isArray(players) && players.length ? players : DEFAULT_PLAYERS;
}

export async function getState(store: Store = getStore()): Promise<TrackerState> {
  const players = await getPlayers(store);
  await ensureReady(store, players);
  const [weapons, feedRaw, progressHashes] = await Promise.all([
    getWeapons(store),
    store.lRange(KEYS.feed, 0, FEED_LIMIT - 1),
    Promise.all(players.map((p) => store.hGetAll(KEYS.progress(p)))),
  ]);
  const progress: Progress = {};
  players.forEach((p, i) => {
    progress[p] = parseHash<WeaponProgress>(progressHashes[i]);
  });
  return {
    players,
    weapons,
    progress,
    feed: feedRaw
      .map((raw) => parse<FeedEvent>(raw))
      .filter((e): e is FeedEvent => e !== null && isStillUnlocked(e, progress)),
  };
}

function isStillUnlocked(event: FeedEvent, progress: Progress): boolean {
  return event.action === 'unlock' && progress[event.player]?.[event.weaponId]?.[event.camo] === event.ts;
}

export interface CamoUpdate {
  before: PlayerProgress;
  after: PlayerProgress;
  weapons: Weapon[];
  events: FeedEvent[];
}

export async function setCamo(
  player: string,
  weaponId: string,
  camo: Camo,
  value: boolean,
  now = Date.now(),
  store: Store = getStore(),
): Promise<CamoUpdate> {
  if (!(await getPlayers(store)).includes(player)) throw new ValidationError('Jogador desconhecido');
  const weapons = await getWeapons(store);
  const before = parseHash<WeaponProgress>(await store.hGetAll(KEYS.progress(player)));
  const { next, changes } = applyCamo(before, weapons, weaponId, camo, value, now);
  if (!changes.length) return { before, after: before, weapons, events: [] };

  await writeProgress(store, player, next, changes);
  const events = changes.map<FeedEvent>((change) => ({
    id: randomUUID(),
    ts: now,
    player,
    weaponId: change.weaponId,
    weaponName: weapons.find((w) => w.id === change.weaponId)?.name ?? change.weaponId,
    camo: change.camo,
    action: change.action,
  }));
  await appendFeed(
    store,
    events.filter((e) => e.action === 'unlock'),
  );
  return { before, after: next, weapons, events };
}

async function writeProgress(store: Store, player: string, next: PlayerProgress, changes: CamoChange[]) {
  const toSet: Record<string, string> = {};
  const toDelete: string[] = [];
  for (const id of new Set(changes.map((c) => c.weaponId))) {
    if (next[id]) toSet[id] = JSON.stringify(next[id]);
    else toDelete.push(id);
  }
  await Promise.all([store.hSet(KEYS.progress(player), toSet), store.hDel(KEYS.progress(player), toDelete)]);
}

export async function appendFeed(store: Store, events: FeedEvent[]) {
  if (!events.length) return;
  await store.lPush(
    KEYS.feed,
    events.map((e) => JSON.stringify(e)),
  );
  await store.lTrim(KEYS.feed, 0, FEED_LIMIT - 1);
}

export async function addWeapon(input: { name?: unknown; category?: unknown }, now = Date.now(), store: Store = getStore()) {
  const name = typeof input.name === 'string' ? input.name.trim().toUpperCase() : '';
  if (!name || name.length > 40) throw new ValidationError('Nome da arma inválido (1 a 40 caracteres)');
  if (!isCategory(input.category)) throw new ValidationError('Categoria inválida');
  const weapons = await getWeapons(store);
  if (weapons.some((w) => w.name === name)) throw new ValidationError('Já existe uma arma com esse nome');
  const weapon: Weapon = { id: `custom_${now}`, name, category: input.category, isCustom: true };
  await store.hSet(KEYS.customWeapons, { [weapon.id]: JSON.stringify(weapon) });
  return weapon;
}

export async function deleteWeapon(weaponId: string, store: Store = getStore()) {
  const weapons = await getWeapons(store);
  const weapon = weapons.find((w) => w.id === weaponId);
  if (!weapon) throw new ValidationError('Arma não encontrada');
  if (!weapon.isCustom) throw new ValidationError('Só armas adicionadas pelo esquadrão podem ser excluídas');
  await store.hDel(KEYS.customWeapons, [weaponId]);
  await Promise.all((await getPlayers(store)).map((p) => store.hDel(KEYS.progress(p), [weaponId])));
}

function assertAdmin(actor: unknown) {
  if (actor !== ADMIN_PLAYER) throw new ValidationError(`Só ${ADMIN_PLAYER} pode gerenciar os membros`);
}

export async function addPlayer(actor: unknown, input: unknown, store: Store = getStore()): Promise<string[]> {
  assertAdmin(actor);
  const name = typeof input === 'string' ? input.trim() : '';
  if (!/^[\p{L}\p{N}_.-]{2,20}$/u.test(name)) {
    throw new ValidationError('Nome inválido: 2 a 20 letras, números, ponto, hífen ou _');
  }
  const players = await getPlayers(store);
  if (players.some((p) => p.toLowerCase() === name.toLowerCase())) throw new ValidationError('Esse membro já existe');
  const next = [...players, name];
  await store.set(KEYS.players, JSON.stringify(next));
  return next;
}

export async function removePlayer(actor: unknown, name: string, store: Store = getStore()): Promise<string[]> {
  assertAdmin(actor);
  if (name === ADMIN_PLAYER) throw new ValidationError(`${ADMIN_PLAYER} não pode ser removido`);
  const players = await getPlayers(store);
  if (!players.includes(name)) throw new ValidationError('Membro não encontrado');
  const next = players.filter((p) => p !== name);
  await store.set(KEYS.players, JSON.stringify(next));
  return next;
}
