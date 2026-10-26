import { applyCamo, hasCamo, lockReason } from '../rules';
import { DAY_MS } from '../stats';
import { CAMOS, type FeedEvent, type PlayerProgress } from '../types';
import { DEFAULT_WEAPONS } from '../weapons';
import { KEYS, appendFeed } from './repo';
import type { Store } from './store';

const SEEDED_KEY = 'mw4:v2:dev-seeded';

function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seedDevData(store: Store, players: string[], now = Date.now()) {
  if (await store.get(SEEDED_KEY)) return;
  await store.set(SEEDED_KEY, String(now));
  const weapons = DEFAULT_WEAPONS;
  const events: FeedEvent[] = [];

  for (const [index, player] of players.entries()) {
    const rand = random(index + 7);
    const effort = 0.35 + rand() * 0.6;
    let pp: PlayerProgress = {};
    let last = now - 31 * DAY_MS;
    for (let day = 30; day >= 0; day--) {
      if (rand() > effort) continue;
      const attempts = 1 + Math.floor(rand() * 5 * effort);
      for (let i = 0; i < attempts; i++) {
        const ts = Math.max(last + 60_000, now - day * DAY_MS - Math.floor(rand() * 12 * 60 * 60 * 1000));
        if (ts >= now) break;
        last = ts;
        const candidates = weapons.flatMap((w) =>
          CAMOS.filter((c) => !hasCamo(pp, w.id, c) && lockReason(pp, weapons, w, c) === null).map((c) => ({ w, c })),
        );
        if (!candidates.length) break;
        const { w, c } = candidates[Math.floor(rand() * candidates.length)];
        pp = applyCamo(pp, weapons, w.id, c, true, ts).next;
        events.push({ id: `${player}-${ts}-${w.id}-${c}`, ts, player, weaponId: w.id, weaponName: w.name, camo: c, action: 'unlock' });
      }
    }
    await store.hSet(
      KEYS.progress(player),
      Object.fromEntries(Object.entries(pp).map(([id, wp]) => [id, JSON.stringify(wp)])),
    );
  }

  events.sort((a, b) => a.ts - b.ts);
  await appendFeed(store, events.slice(-200));
}
