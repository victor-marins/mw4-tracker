export const CAMOS = ['ouro', 'platina', 'dissonancia', 'divergencia'] as const;
export type Camo = (typeof CAMOS)[number];

export const CAMO_LABELS: Record<Camo, string> = {
  ouro: 'Ouro',
  platina: 'Platina',
  dissonancia: 'Dissonância',
  divergencia: 'Divergência',
};

export const CAMO_POINTS: Record<Camo, number> = {
  ouro: 1,
  platina: 2,
  dissonancia: 3,
  divergencia: 4,
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
