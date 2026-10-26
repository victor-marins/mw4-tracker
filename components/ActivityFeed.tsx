'use client';
import { useState } from 'react';
import { dayKey, DAY_MS } from '@/lib/stats';
import { CAMO_LABELS, type FeedEvent, type TrackerState } from '@/lib/types';
import { CAMO_STYLE, formatDate, PlayerName, playerColor, SectionTitle, timeAgo } from './ui';

function dayLabel(ts: number, now: number): string {
  if (dayKey(ts) === dayKey(now)) return 'Hoje';
  if (dayKey(ts) === dayKey(now - DAY_MS)) return 'Ontem';
  return formatDate(ts);
}

export function ActivityFeed({ state, now }: { state: TrackerState; now: number }) {
  const [filter, setFilter] = useState<string | null>(null);
  const events = state.feed.filter((e) => !filter || e.player === filter);

  const groups: Array<{ label: string; events: FeedEvent[] }> = [];
  for (const event of events) {
    const label = dayLabel(event.ts, now);
    if (groups[groups.length - 1]?.label === label) groups[groups.length - 1].events.push(event);
    else groups.push({ label, events: [event] });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <SectionTitle hint="Tudo que o esquadrão marcou ou desmarcou. Atualiza sozinho.">Atividade</SectionTitle>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip active={filter === null} onClick={() => setFilter(null)}>
          Todos
        </FilterChip>
        {state.players.map((player) => (
          <FilterChip key={player} active={filter === player} onClick={() => setFilter(player)}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: playerColor(state.players, player) }} />
            {player}
          </FilterChip>
        ))}
      </div>

      {groups.length === 0 && <p className="text-slate-500 text-sm">Nenhuma atividade ainda.</p>}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{group.label}</div>
            <ul className="space-y-2">
              {group.events.map((event) => (
                <li
                  key={event.id}
                  className={`flex items-center justify-between gap-3 bg-[#14171c] border border-slate-800 rounded-lg px-4 py-3 ${
                    event.action === 'remove' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-3 h-3 rounded-sm shrink-0 ${CAMO_STYLE[event.camo].swatch}`} />
                    <span className="text-sm text-slate-300 truncate">
                      <PlayerName players={state.players} player={event.player} />{' '}
                      {event.action === 'unlock' ? 'desbloqueou' : 'removeu'}{' '}
                      <span className={`font-bold ${CAMO_STYLE[event.camo].text}`}>{CAMO_LABELS[event.camo]}</span>{' '}
                      {event.action === 'unlock' ? 'na' : 'da'} <span className="font-bold text-slate-100">{event.weaponName}</span>
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{timeAgo(event.ts, Math.max(now, event.ts))}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
        active ? 'bg-cyan-900/40 text-cyan-300 border-cyan-800' : 'text-slate-400 border-slate-800 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
