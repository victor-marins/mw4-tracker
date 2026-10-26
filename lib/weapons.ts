import type { Weapon } from './types';

export const CATEGORIES = [
  'Fuzis de Assalto',
  'SMTs',
  'Escopetas',
  'MLs',
  'Fuzis de Atirador',
  'Fuzis de Precisão',
  'Pistolas',
  'Lançadores',
  'Corpo a Corpo',
] as const;

export const DEFAULT_PLAYERS = ['Marins', 'NoobMaszter', 'Pagno', 'Willlemes', 'itnaS'];
export const ADMIN_PLAYER = 'Marins';

export const DEFAULT_WEAPONS: Weapon[] = [
  { id: 'ar1', name: 'HYEON BURST', category: 'Fuzis de Assalto' },
  { id: 'ar2', name: 'M4', category: 'Fuzis de Assalto' },
  { id: 'ar3', name: 'HAN 86', category: 'Fuzis de Assalto' },
  { id: 'ar4', name: 'KASTOV 762', category: 'Fuzis de Assalto' },
  { id: 'ar5', name: 'AXION', category: 'Fuzis de Assalto' },
  { id: 'ar6', name: 'CRONEN SQUALL', category: 'Fuzis de Assalto' },
  { id: 'ar7', name: 'PATRIOT XMR', category: 'Fuzis de Assalto' },
  { id: 'ar8', name: 'ODEN', category: 'Fuzis de Assalto' },
  { id: 'smg1', name: 'X-58 NYX', category: 'SMTs' },
  { id: 'smg2', name: 'VEL 46', category: 'SMTs' },
  { id: 'smg3', name: 'ISO NIGHTSHADE', category: 'SMTs' },
  { id: 'smg4', name: 'PPSH-41', category: 'SMTs' },
  { id: 'smg5', name: 'WZ.55 STRIGA', category: 'SMTs' },
  { id: 'sg1', name: 'REZI 12', category: 'Escopetas' },
  { id: 'sg2', name: 'WARLORD', category: 'Escopetas' },
  { id: 'lmg1', name: 'APOC-338', category: 'MLs' },
  { id: 'lmg2', name: 'ML FINN', category: 'MLs' },
  { id: 'lmg3', name: 'TYPE 73', category: 'MLs' },
  { id: 'mr1', name: 'MAR-9', category: 'Fuzis de Atirador' },
  { id: 'mr2', name: 'ORIS 8.6', category: 'Fuzis de Atirador' },
  { id: 'mr3', name: 'MOSIN-NAGANT', category: 'Fuzis de Atirador' },
  { id: 'sn1', name: 'SIGNAL 50', category: 'Fuzis de Precisão' },
  { id: 'sn2', name: 'ASTAROTH .57', category: 'Fuzis de Precisão' },
  { id: 'sn3', name: 'KG-7 VULCAN', category: 'Fuzis de Precisão' },
  { id: 'pi1', name: '.50 GS', category: 'Pistolas' },
  { id: 'pi2', name: 'SANG 9 MM', category: 'Pistolas' },
  { id: 'pi3', name: 'MOJAVE .357', category: 'Pistolas' },
  { id: 'pi4', name: 'KRAIT P68', category: 'Pistolas' },
  { id: 'la1', name: 'PILA', category: 'Lançadores' },
  { id: 'la2', name: 'RPG-8', category: 'Lançadores' },
  { id: 'la3', name: 'JOKR', category: 'Lançadores' },
  { id: 'la4', name: 'PM-40 ANVIL', category: 'Lançadores' },
  { id: 'me1', name: 'FSS CARBON EDGE 1095', category: 'Corpo a Corpo' },
];

export function isCategory(value: unknown): value is string {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
