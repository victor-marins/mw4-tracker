import { randomUUID } from 'node:crypto';
import { applyCamo, type CamoChange } from '../rules';
import { HISTORY_START, UNDATED_AT } from '../stats';
import {
  ALL_CAMOS,
  CAMOS,
  MAX_OPERATOR_PRESTIGE,
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
  backfilled: `${PREFIX}backfilled`,
  operatorPrestige: `${PREFIX}operator-prestige`,
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

export const KNOWN_UNLOCK_DATES: Array<{ player: string; weaponId: string; camo: Camo; ts: number }> = [
  { player: 'Marins', weaponId: 'ar2', camo: 'ouro', ts: Date.parse('2026-10-24T21:00:00-03:00') },
  { player: 'Pagno', weaponId: 'smg2', camo: 'ouro', ts: Date.parse('2026-10-25T21:00:00-03:00') },
];

export async function backfillUndated(store: Store, players: string[]): Promise<boolean> {
  if (await store.get(KEYS.backfilled)) return false;
  const weapons = await getWeapons(store);
  const events: FeedEvent[] = [];
  for (const player of players) {
    const progress = parseHash<WeaponProgress>(await store.hGetAll(KEYS.progress(player)));
    const updates: Record<string, string> = {};
    for (const [weaponId, wp] of Object.entries(progress)) {
      let changed = false;
      for (const camo of ALL_CAMOS) {
        if (wp[camo] !== 0) continue;
        const known = KNOWN_UNLOCK_DATES.find((k) => k.player === player && k.weaponId === weaponId && k.camo === camo);
        wp[camo] = known?.ts ?? UNDATED_AT;
        changed = true;
        if (known) {
          events.push({
            id: randomUUID(),
            ts: known.ts,
            player,
            weaponId,
            weaponName: weapons.find((w) => w.id === weaponId)?.name ?? weaponId,
            camo,
            action: 'unlock',
          });
        }
      }
      if (changed) updates[weaponId] = JSON.stringify(wp);
    }
    await store.hSet(KEYS.progress(player), updates);
  }
  await appendFeed(store, events);
  await store.set(KEYS.backfilled, String(HISTORY_START));
  return true;
}

const devSeeding = new WeakMap<Store, Promise<void>>();

function seedDev(store: Store, players: string[]): Promise<void> {
  const mode = process.env.DEV_SEED;
  if (process.env.NODE_ENV === 'production' || store.kind !== 'memory' || !mode) return Promise.resolve();
  let seeding = devSeeding.get(store);
  if (!seeding) {
    seeding = import('./dev-seed').then((dev) =>
      mode === 'prod'
        ? dev.seedFromProduction(store, process.env.DEV_PROD_URL || 'https://mw4-tracker.vercel.app')
        : dev.seedDevData(store, players),
    );
    seeding.catch((error) => {
      devSeeding.delete(store);
      console.warn('[dev] não foi possível carregar os dados de desenvolvimento', error);
    });
    devSeeding.set(store, seeding);
  }
  return seeding.catch(() => undefined);
}

async function ensureReady(store: Store) {
  await seedDev(store, await getPlayers(store));
  await migrateLegacy(store);
  await backfillUndated(store, await getPlayers(store));
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
  await ensureReady(store);
  const players = await getPlayers(store);
  const [weapons, feedRaw, progressHashes, prestigeRaw] = await Promise.all([
    getWeapons(store),
    store.lRange(KEYS.feed, 0, FEED_LIMIT - 1),
    Promise.all(players.map((p) => store.hGetAll(KEYS.progress(p)))),
    store.hGetAll(KEYS.operatorPrestige),
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
      .filter((e): e is FeedEvent => e !== null && isStillUnlocked(e, progress))
      .sort((a, b) => b.ts - a.ts),
    operatorPrestige: Object.fromEntries(
      players.map((p) => [p, validPrestige(Number(prestigeRaw[p])) ? Number(prestigeRaw[p]) : 0]),
    ),
  };
}

function validPrestige(level: unknown): level is number {
  return Number.isInteger(level) && (level as number) >= 0 && (level as number) <= MAX_OPERATOR_PRESTIGE;
}

export async function setOperatorPrestige(player: unknown, level: unknown, store: Store = getStore()) {
  if (typeof player !== 'string' || !(await getPlayers(store)).includes(player)) {
    throw new ValidationError('Jogador desconhecido');
  }
  if (!validPrestige(level)) throw new ValidationError(`Prestígio deve ser de 0 a ${MAX_OPERATOR_PRESTIGE}`);
  await store.hSet(KEYS.operatorPrestige, { [player]: String(level) });
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
