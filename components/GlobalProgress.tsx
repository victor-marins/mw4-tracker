'use client';
import { categoryTarget, countCamo, countInCategory } from '@/lib/rules';
import { nextSteps, type Suggestion } from '@/lib/stats';
import type { TrackerState } from '@/lib/types';
import { CATEGORIES } from '@/lib/weapons';
import { SectionTitle } from './ui';

const SUGGESTION_STYLE: Record<Suggestion['kind'], string> = {
  ready: 'border-emerald-700/60 bg-emerald-950/30',
  category: 'border-yellow-700/40 bg-yellow-950/20',
  global: 'border-cyan-800/50 bg-cyan-950/20',
};

const SUGGESTION_LABEL: Record<Suggestion['kind'], string> = {
  ready: 'Pronto para marcar',
  category: 'Mais perto da Platina',
  global: 'Meta global',
};

export function GlobalProgress({ state, viewed }: { state: TrackerState; viewed: string }) {
  const pp = state.progress[viewed] ?? {};
  const total = state.weapons.length;
  const platinas = countCamo(pp, state.weapons, 'platina');
  const dissonancias = countCamo(pp, state.weapons, 'dissonancia');
  const pct = (value: number, max: number) => (max ? Math.min(100, Math.round((value / max) * 100)) : 0);

  return (
    <div className="space-y-8">
      <div className="bg-[#14171c] border border-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-black text-slate-100 tracking-wider mb-6 uppercase">Relatório de maestria: {viewed}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BigBar label="Progresso global: Dissonância" color="cyan" value={platinas} max={total} unit="Platinas" pct={pct(platinas, total)} />
          <BigBar
            label="Progresso global: Divergência"
            color="purple"
            value={dissonancias}
            max={total}
            unit="Dissonâncias"
            pct={pct(dissonancias, total)}
          />
        </div>
      </div>

      <div>
        <SectionTitle hint="Calculado a partir do arsenal atual">Próximos passos</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nextSteps(pp, state.weapons).map((s) => (
            <div key={s.title} className={`border rounded-lg p-4 ${SUGGESTION_STYLE[s.kind]}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{SUGGESTION_LABEL[s.kind]}</div>
              <div className="font-bold text-slate-100">{s.title}</div>
              <div className="text-sm text-slate-400 mt-1">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Status para Platina (por categoria)</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const target = categoryTarget(state.weapons, cat);
            const current = countInCategory(pp, state.weapons, cat, 'ouro');
            const complete = target > 0 && current >= target;
            return (
              <div
                key={cat}
                className={`border rounded-lg p-4 ${complete ? 'border-yellow-600/50 bg-yellow-900/10' : 'border-slate-800 bg-[#14171c]'}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">{cat}</h4>
                  <span className={`text-xs font-bold ${complete ? 'text-yellow-500' : 'text-slate-600'}`}>
                    {complete ? 'LIBERADA' : 'BLOQUEADA'}
                  </span>
                </div>
                <div className="flex justify-between items-end mb-2">
                  <div className="text-2xl font-black text-yellow-500">{pct(current, target)}%</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {current}/{target} Ouros
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full transition-all duration-1000" style={{ width: `${pct(current, target)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BigBar({
  label,
  color,
  value,
  max,
  unit,
  pct,
}: {
  label: string;
  color: 'cyan' | 'purple';
  value: number;
  max: number;
  unit: string;
  pct: number;
}) {
  return (
    <div className="border border-slate-700/50 bg-[#0f1217] rounded-lg p-5">
      <div className="flex justify-between items-end mb-4">
        <div>
          <div className={`font-bold text-sm tracking-widest uppercase mb-1 ${color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}`}>
            {label}
          </div>
          <div className="text-4xl font-black text-white">{pct}%</div>
        </div>
        <div className="text-slate-400 text-xs font-mono">
          {value} / {max} {unit}
        </div>
      </div>
      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color === 'cyan' ? 'bg-cyan-500' : 'bg-purple-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
