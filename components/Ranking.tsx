'use client';
import { camoTotals } from '@/lib/rules';
import type { TrackerState } from '@/lib/types';
import { playerColor } from './ui';

const PODIUM_STYLES: Record<number, string> = {
  1: 'border-yellow-500 bg-yellow-500/10 text-yellow-400 h-72 md:h-80 shadow-[0_0_20px_rgba(234,179,8,0.2)] md:-translate-y-4',
  2: 'border-slate-300 bg-slate-300/10 text-slate-300 h-60 md:h-72',
  3: 'border-orange-700 bg-orange-700/10 text-orange-600 h-56 md:h-64',
};

function CamoCounts({ totals, className }: { totals: ReturnType<typeof camoTotals>; className: string }) {
  return (
    <div className={className}>
      <div className="text-yellow-500 text-center" title="Ouros">O: {totals.ouro}</div>
      <div className="text-slate-300 text-center" title="Platinas">P: {totals.platina}</div>
      <div className="text-cyan-400 text-center" title="Dissonâncias">D: {totals.dissonancia}</div>
      <div className="text-purple-400 text-center" title="Divergências">V: {totals.divergencia}</div>
      <div
        className="text-orange-400 text-center col-span-2 md:col-span-1"
        title={`Prestígio: Piroclasto ${totals.piroclasto} · Terminus ${totals.terminus} · Dispersão ${totals.dispersao} · Cascata ${totals.cascata}`}
      >
        🔥 {totals.piroclasto + totals.terminus + totals.dispersao + totals.cascata}
      </div>
    </div>
  );
}

export function Ranking({ state }: { state: TrackerState }) {
  const ranked = state.players
    .map((player) => ({ player, totals: camoTotals(state.progress[player] ?? {}, state.weapons) }))
    .sort((a, b) => b.totals.score - a.totals.score);
  const podium = [
    ranked[1] && { ...ranked[1], rank: 2 },
    ranked[0] && { ...ranked[0], rank: 1 },
    ranked[2] && { ...ranked[2], rank: 3 },
  ].filter(Boolean) as Array<(typeof ranked)[number] & { rank: number }>;

  return (
    <div className="space-y-8 pb-12 mt-2">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-wider text-slate-100 uppercase">Classificação Geral</h2>
        <p className="text-slate-400 mt-2 text-sm">Ouro 1 pt · Platina 2 · Dissonância 3 · Divergência 4 · Prestígio: Piroclasto 1 · Terminus 2 · Dispersão 3 · Cascata 4</p>
      </div>

      <div className="flex flex-row justify-center items-end gap-2 md:gap-6 mt-12 mb-8 px-2">
        {podium.map(({ player, totals, rank }) => (
          <div
            key={player}
            className={`relative flex flex-col items-center justify-between p-4 rounded-t-lg border-t-4 border-l border-r w-1/3 max-w-[200px] transition-all duration-500 ${PODIUM_STYLES[rank]}`}
          >
            <div className="absolute -top-6 text-3xl md:text-5xl drop-shadow-lg" aria-hidden="true">
              {rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}
            </div>
            <div className="mt-4 text-center w-full">
              <div className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-80 mb-1">{rank}º LUGAR</div>
              <div className="text-sm md:text-xl font-black truncate px-1 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: playerColor(state.players, player) }} />
                {player}
              </div>
              <div className="text-xs mt-2 opacity-70">SCORE</div>
              <div className="text-2xl md:text-4xl font-mono font-bold">{totals.score}</div>
            </div>
            <CamoCounts
              totals={totals}
              className="w-full mt-auto bg-slate-900/50 rounded p-2 grid grid-cols-2 gap-1 text-[10px] md:text-xs"
            />
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto space-y-3 px-4">
        {ranked.slice(3).map(({ player, totals }, index) => (
          <div
            key={player}
            className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="text-slate-500 font-mono font-bold text-xl w-8 text-center">#{index + 4}</div>
              <div className="text-slate-200 font-bold text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: playerColor(state.players, player) }} />
                {player}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <CamoCounts totals={totals} className="hidden md:flex gap-4 text-sm font-mono" />
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Score</div>
                <div className="text-xl font-mono text-slate-300 font-bold">{totals.score}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
