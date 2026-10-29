import { ALL_CAMOS, CAMOS, CAMO_LABELS, CAMO_POINTS, PRESTIGE_CAMOS, isPrestigeCamo, type Camo, type PlayerProgress, type Weapon } from './types';

export interface CamoChange {
  weaponId: string;
  camo: Camo;
  action: 'unlock' | 'remove';
}

export class RuleError extends Error {}

export type CamoTotals = Record<Camo, number> & { score: number };

export function hasCamo(pp: PlayerProgress, weaponId: string, camo: Camo): boolean {
  return pp[weaponId]?.[camo] !== undefined;
}

export function categoryTarget(weapons: Weapon[], category: string): number {
  return weapons.filter((w) => w.category === category).length;
}

export function countInCategory(pp: PlayerProgress, weapons: Weapon[], category: string, camo: Camo): number {
  return weapons.filter((w) => w.category === category && hasCamo(pp, w.id, camo)).length;
}

export function countCamo(pp: PlayerProgress, weapons: Weapon[], camo: Camo): number {
  return weapons.filter((w) => hasCamo(pp, w.id, camo)).length;
}

export function lockReason(pp: PlayerProgress, weapons: Weapon[], weapon: Weapon, camo: Camo): string | null {
  switch (camo) {
    case 'ouro':
      return null;
    case 'platina': {
      if (!hasCamo(pp, weapon.id, 'ouro')) return 'REQUER OURO';
      const missing = categoryTarget(weapons, weapon.category) - countInCategory(pp, weapons, weapon.category, 'ouro');
      return missing > 0 ? `FALTAM ${missing}` : null;
    }
    case 'dissonancia': {
      if (!hasCamo(pp, weapon.id, 'platina')) return 'REQUER PLATINA';
      const missing = weapons.length - countCamo(pp, weapons, 'platina');
      return missing > 0 ? `FALTAM ${missing}` : null;
    }
    case 'divergencia': {
      if (!hasCamo(pp, weapon.id, 'dissonancia')) return 'REQUER DISS.';
      const missing = weapons.length - countCamo(pp, weapons, 'dissonancia');
      return missing > 0 ? `FALTAM ${missing}` : null;
    }
    case 'piroclasto':
      return null;
    case 'terminus':
      return hasCamo(pp, weapon.id, 'piroclasto') ? null : 'REQUER PIROCLASTO';
    case 'dispersao':
      return hasCamo(pp, weapon.id, 'terminus') ? null : 'REQUER TERMINUS';
    case 'cascata':
      return hasCamo(pp, weapon.id, 'dispersao') ? null : 'REQUER DISPERSÃO';
  }
}

function dependents(camo: Camo): readonly Camo[] {
  if (isPrestigeCamo(camo)) return PRESTIGE_CAMOS.slice(PRESTIGE_CAMOS.indexOf(camo));
  return CAMOS.slice(CAMOS.indexOf(camo));
}

export function applyCamo(
  pp: PlayerProgress,
  weapons: Weapon[],
  weaponId: string,
  camo: Camo,
  value: boolean,
  now: number,
): { next: PlayerProgress; changes: CamoChange[] } {
  const weapon = weapons.find((w) => w.id === weaponId);
  if (!weapon) throw new RuleError('Arma não encontrada');

  if (value) {
    if (hasCamo(pp, weaponId, camo)) return { next: pp, changes: [] };
    const reason = lockReason(pp, weapons, weapon, camo);
    if (reason) throw new RuleError(`${CAMO_LABELS[camo]} bloqueada: ${reason}`);
    return {
      next: { ...pp, [weaponId]: { ...pp[weaponId], [camo]: now } },
      changes: [{ weaponId, camo, action: 'unlock' }],
    };
  }

  if (!hasCamo(pp, weaponId, camo)) return { next: pp, changes: [] };

  const next: PlayerProgress = structuredClone(pp);
  const changes: CamoChange[] = [];
  const removeFrom = (id: string, from: Camo) => {
    const wp = next[id];
    if (!wp) return;
    for (const c of dependents(from)) {
      if (wp[c] !== undefined) {
        delete wp[c];
        changes.push({ weaponId: id, camo: c, action: 'remove' });
      }
    }
    if (Object.keys(wp).length === 0) delete next[id];
  };

  removeFrom(weaponId, camo);

  const target = categoryTarget(weapons, weapon.category);
  if (
    countInCategory(pp, weapons, weapon.category, 'ouro') >= target &&
    countInCategory(next, weapons, weapon.category, 'ouro') < target
  ) {
    for (const w of weapons.filter((x) => x.category === weapon.category)) removeFrom(w.id, 'platina');
  }
  if (countCamo(pp, weapons, 'platina') >= weapons.length && countCamo(next, weapons, 'platina') < weapons.length) {
    for (const w of weapons) removeFrom(w.id, 'dissonancia');
  }
  if (
    countCamo(pp, weapons, 'dissonancia') >= weapons.length &&
    countCamo(next, weapons, 'dissonancia') < weapons.length
  ) {
    for (const w of weapons) removeFrom(w.id, 'divergencia');
  }

  return { next, changes };
}

export function camoTotals(pp: PlayerProgress, weapons: Weapon[]): CamoTotals {
  const totals = Object.fromEntries([...ALL_CAMOS.map((c) => [c, 0]), ['score', 0]]) as CamoTotals;
  for (const w of weapons) {
    for (const c of ALL_CAMOS) {
      if (hasCamo(pp, w.id, c)) {
        totals[c]++;
        totals.score += CAMO_POINTS[c];
      }
    }
  }
  return totals;
}
