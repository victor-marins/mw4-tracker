export const CAMOS = ['ouro', 'platina', 'dissonancia', 'divergencia'] as const;
export type StandardCamo = (typeof CAMOS)[number];
export const PRESTIGE_CAMOS = ['piroclasto', 'terminus', 'dispersao', 'cascata'] as const;
export type PrestigeCamo = (typeof PRESTIGE_CAMOS)[number];
export const ALL_CAMOS = [...CAMOS, ...PRESTIGE_CAMOS] as const;
export type Camo = StandardCamo | PrestigeCamo;

export function isPrestigeCamo(camo: Camo): camo is PrestigeCamo {
  return (PRESTIGE_CAMOS as readonly string[]).includes(camo);
}

export const CAMO_LABELS: Record<Camo, string> = {
  ouro: 'Ouro',
  platina: 'Platina',
  dissonancia: 'Dissonância',
  divergencia: 'Divergência',
  piroclasto: 'Piroclasto',
  terminus: 'Terminus de Piroclasto',
  dispersao: 'Dispersão de Piroclasto',
  cascata: 'Cascata de Piroclasto',
};

export const CAMO_SHORT_LABELS: Record<Camo, string> = {
  ouro: 'Ouro',
  platina: 'Platina',
  dissonancia: 'Dissonância',
  divergencia: 'Divergência',
  piroclasto: 'Piroclasto',
  terminus: 'Terminus',
  dispersao: 'Dispersão',
  cascata: 'Cascata',
};

export const PRESTIGE_CONDITIONS: Record<PrestigeCamo, string> = {
  piroclasto: 'Bater o prestígio na arma, totalmente upada. Ela reseta de nível.',
  terminus: 'Tornar-se Mestre do prestígio no nível máximo padrão da arma.',
  dispersao: 'Tornar-se Mestre do prestígio no nível 150.',
  cascata: 'Tornar-se Mestre do prestígio no nível 250.',
};

export const CAMO_POINTS: Record<Camo, number> = {
  ouro: 1,
  platina: 2,
  dissonancia: 3,
  divergencia: 4,
  piroclasto: 1,
  terminus: 2,
  dispersao: 3,
  cascata: 4,
};

// Unlock timestamp in ms. 0 = unlocked before the history started being recorded.
export type WeaponProgress = Partial<Record<Camo, number>>;
export type PlayerProgress = Record<string, WeaponProgress>;
export type Progress = Record<string, PlayerProgress>;

export interface Weapon {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
}

export interface FeedEvent {
  id: string;
  ts: number;
  player: string;
  weaponId: string;
  weaponName: string;
  camo: Camo;
  action: 'unlock' | 'remove';
}

export interface TrackerState {
  players: string[];
  weapons: Weapon[];
  progress: Progress;
  feed: FeedEvent[];
}
