import { categoryTarget, countCamo, countInCategory } from './rules';
import { CAMO_LABELS, type Camo, type FeedEvent, type PlayerProgress, type Weapon } from './types';

const CAMO_EMOJI: Record<Camo, string> = {
  ouro: '🟡',
  platina: '⚪',
  dissonancia: '🔷',
  divergencia: '🟣',
};

export function milestones(before: PlayerProgress, after: PlayerProgress, weapons: Weapon[]): string[] {
  const reached = (count: (pp: PlayerProgress) => number, target: number) =>
    target > 0 && count(before) < target && count(after) >= target;
  const messages: string[] = [];

  for (const category of new Set(weapons.map((w) => w.category))) {
    if (reached((pp) => countInCategory(pp, weapons, category, 'ouro'), categoryTarget(weapons, category))) {
      messages.push(`fechou os ouros de **${category}** — Platina liberada!`);
    }
  }
  if (reached((pp) => countCamo(pp, weapons, 'platina'), weapons.length)) {
    messages.push('platinou o arsenal inteiro — **Dissonância liberada!**');
  }
  if (reached((pp) => countCamo(pp, weapons, 'dissonancia'), weapons.length)) {
    messages.push('completou todas as Dissonâncias — **Divergência liberada!**');
  }
  if (reached((pp) => countCamo(pp, weapons, 'divergencia'), weapons.length)) {
    messages.push('é **MESTRE DO ARSENAL**: Divergência em todas as armas! 👑');
  }
  return messages;
}

export function discordMessage(player: string, events: FeedEvent[], achieved: string[]): string | null {
  const unlocks = events.filter((e) => e.action === 'unlock');
  if (!unlocks.length) return null;
  const lines = unlocks.map(
    (e) => `${CAMO_EMOJI[e.camo]} **${player}** desbloqueou **${CAMO_LABELS[e.camo]}** na **${e.weaponName}**`,
  );
  for (const text of achieved) lines.push(`🏆 **${player}** ${text}`);
  return lines.join('\n');
}
