'use client';
import { useEffect, useState } from 'react';
import { camoTotals, categoryTarget, countInCategory } from '@/lib/rules';
import { highestCamo } from '@/lib/stats';
import { ALL_CAMOS, CAMOS, CAMO_LABELS, MAX_OPERATOR_PRESTIGE, type StandardCamo, type TrackerState, type Weapon } from '@/lib/types';
import { CATEGORIES } from '@/lib/weapons';
import { CAMO_STYLE, inputClass, playerColor, SectionTitle } from './ui';

const rank = (camo: StandardCamo | null) => (camo ? CAMOS.indexOf(camo) + 1 : 0);
const DUEL_KEY = 'mw4_duel';

export function Duel({ state, me }: { state: TrackerState; me: string }) {
  const [selectedA, setA] = useState(me);
  const [selectedB, setB] = useState(state.players.find((p) => p !== me) ?? me);
  const a = state.players.includes(selectedA) ? selectedA : me;
  const b = state.players.includes(selectedB) ? selectedB : (state.players.find((p) => p !== a) ?? me);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DUEL_KEY) ?? 'null');
      if (state.players.includes(saved?.a) && state.players.includes(saved?.b)) {
        queueMicrotask(() => {
          setA(saved.a);
          setB(saved.b);
        });
      }
    } catch {
      return;
    }
  }, [state.players]);

  const choose = (side: 'a' | 'b', player: string) => {
    const pair = side === 'a' ? { a: player, b } : { a, b: player };
    setA(pair.a);
    setB(pair.b);
    try {
      localStorage.setItem(DUEL_KEY, JSON.stringify(pair));
    } catch {
      return;
    }
  };
  const ppA = state.progress[a] ?? {};
  const ppB = state.progress[b] ?? {};
  const totalsA = camoTotals(ppA, state.weapons);
  const totalsB = camoTotals(ppB, state.weapons);

  const advantageA: Weapon[] = [];
  const advantageB: Weapon[] = [];
  for (const weapon of state.weapons) {
    const diff = rank(highestCamo(ppA[weapon.id])) - rank(highestCamo(ppB[weapon.id]));
    if (diff > 0) advantageA.push(weapon);
    if (diff < 0) advantageB.push(weapon);
  }

  const rows: Array<{ label: string; a: number; b: number; max?: number }> = [
    { label: 'Score', a: totalsA.score, b: totalsB.score },
    { label: 'Prestígio de operador', a: state.operatorPrestige[a] ?? 0, b: state.operatorPrestige[b] ?? 0, max: MAX_OPERATOR_PRESTIGE },
    ...ALL_CAMOS.map((camo) => ({ label: CAMO_LABELS[camo], a: totalsA[camo], b: totalsB[camo], max: state.weapons.length })),
    ...CATEGORIES.map((cat) => ({
      label: `Ouros · ${cat}`,
      a: countInCategory(ppA, state.weapons, cat, 'ouro'),
      b: countInCategory(ppB, state.weapons, cat, 'ouro'),
      max: categoryTarget(state.weapons, cat),
    })),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <SectionTitle hint="Compare dois operadores lado a lado">1v1</SectionTitle>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-8">
        <PlayerSelect players={state.players} value={a} onChange={(p) => choose('a', p)} label="Operador A" />
        <span className="text-slate-500 font-black">VS</span>
        <PlayerSelect players={state.players} value={b} onChange={(p) => choose('b', p)} label="Operador B" />
      </div>

      <div className="bg-[#14171c] border border-slate-800 rounded-xl divide-y divide-slate-800">
        {rows.map((row) => {
          const scale = Math.max(row.max ?? 0, row.a, row.b, 1);
          return (
            <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5">
              <div className="flex items-center justify-end gap-2">
                <span className={`font-mono text-sm ${row.a > row.b ? 'text-slate-100 font-bold' : 'text-slate-400'}`}>{row.a}</span>
                <div className="w-full max-w-[200px] h-2 bg-slate-800 rounded-full overflow-hidden flex justify-end">
                  <div className="h-full rounded-full" style={{ width: `${(row.a / scale) * 100}%`, backgroundColor: playerColor(state.players, a) }} />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider text-center w-36 sm:w-48">{row.label}</div>
              <div className="flex items-center gap-2">
                <div className="w-full max-w-[200px] h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(row.b / scale) * 100}%`, backgroundColor: playerColor(state.players, b) }} />
                </div>
                <span className={`font-mono text-sm ${row.b > row.a ? 'text-slate-100 font-bold' : 'text-slate-400'}`}>{row.b}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <AdvantageList title={`Onde ${a} está na frente`} weapons={advantageA} pp={ppA} />
        <AdvantageList title={`Onde ${b} está na frente`} weapons={advantageB} pp={ppB} />
      </div>
    </div>
  );
}

function PlayerSelect({
  players,
  value,
  onChange,
  label,
}: {
  players: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: playerColor(players, value) }} />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} font-bold`}>
        {players.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}

function AdvantageList({
  title,
  weapons,
  pp,
}: {
  title: string;
  weapons: Weapon[];
  pp: TrackerState['progress'][string];
}) {
  return (
    <div className="bg-[#14171c] border border-slate-800 rounded-xl p-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        {title} ({weapons.length})
      </div>
      {weapons.length === 0 && <p className="text-sm text-slate-600">Nenhuma arma.</p>}
      <div className="flex flex-wrap gap-2">
        {weapons.map((w) => {
          const top = highestCamo(pp[w.id])!;
          return (
            <span key={w.id} className={`text-xs font-bold px-2 py-1 rounded border ${CAMO_STYLE[top].border} ${CAMO_STYLE[top].text} ${CAMO_STYLE[top].bg}`}>
              {w.name} · {CAMO_LABELS[top]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
