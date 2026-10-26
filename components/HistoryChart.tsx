'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DAY_MS, pointsInWindow, scoreHistory, type ScorePoint } from '@/lib/stats';
import type { TrackerState } from '@/lib/types';
import { formatDate, formatDateTime, playerColor, SectionTitle } from './ui';

const RANGES = [
  { id: '7', label: '7 dias', ms: 7 * DAY_MS },
  { id: '30', label: '30 dias', ms: 30 * DAY_MS },
  { id: 'all', label: 'Tudo', ms: Infinity },
] as const;

const HEIGHT = 320;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 40 };

function valueAt(points: ScorePoint[], ts: number): number {
  let value = points[0]?.score ?? 0;
  for (const p of points) {
    if (p.ts > ts) break;
    value = p.score;
  }
  return value;
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  for (const m of [1, 2, 5, 10]) if (m * power >= raw) return m * power;
  return 10 * power;
}

export function HistoryChart({ state, now }: { state: TrackerState; now: number }) {
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('30');
  const [showTable, setShowTable] = useState(false);
  const [hoverTs, setHoverTs] = useState<number | null>(null);
  const [width, setWidth] = useState(800);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTable]);

  const history = useMemo(
    () => scoreHistory(state.progress, state.players, state.weapons, now),
    [state.progress, state.players, state.weapons, now],
  );
  const rangeMs = RANGES.find((r) => r.id === range)!.ms;
  const from = Number.isFinite(rangeMs) ? Math.max(history.start, now - rangeMs) : history.start;
  const to = Math.max(now, from + 1);

  const maxScore = Math.max(1, ...state.players.map((p) => valueAt(history.series[p], to)));
  const step = niceStep(maxScore / 4);
  const yMax = Math.ceil(maxScore / step) * step;
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (ts: number) => MARGIN.left + ((ts - from) / (to - from)) * innerW;
  const y = (score: number) => MARGIN.top + innerH - (score / yMax) * innerH;
  const xTickCount = Math.max(2, Math.min(7, Math.floor(innerW / 110)));
  const xTicks = Array.from({ length: xTickCount }, (_, i) => from + ((to - from) * i) / (xTickCount - 1));

  const pathFor = (points: ScorePoint[]) => {
    let d = `M${x(from)},${y(valueAt(points, from))}`;
    for (const p of points) {
      if (p.ts <= from || p.ts > to) continue;
      d += `H${x(p.ts)}V${y(p.score)}`;
    }
    return `${d}H${x(to)}`;
  };

  const onPointer = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverTs(from + ratio * (to - from));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const delta = Math.max(DAY_MS / 4, (to - from) / 40);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setHoverTs((ts) => Math.min(to, Math.max(from, (ts ?? to) + (e.key === 'ArrowLeft' ? -delta : delta))));
    }
    if (e.key === 'Escape') setHoverTs(null);
  };

  const readout =
    hoverTs === null
      ? null
      : state.players
          .map((player) => ({ player, score: valueAt(history.series[player], hoverTs) }))
          .sort((a, b) => b.score - a.score);
  const tooltipLeft = hoverTs !== null && x(hoverTs) > width / 2;

  return (
    <div>
      <SectionTitle hint="Score acumulado (Ouro 1 · Platina 2 · Dissonância 3 · Divergência 4)">Histórico</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            aria-pressed={range === r.id}
            className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
              range === r.id ? 'bg-cyan-900/40 text-cyan-300 border-cyan-800' : 'text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="ml-auto px-3 py-1.5 rounded text-xs font-bold border border-slate-800 text-slate-400 hover:text-slate-200"
        >
          {showTable ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-3" aria-label="Legenda">
        {state.players.map((player) => (
          <span key={player} className="flex items-center gap-2 text-sm text-slate-300">
            <span className="w-4 h-0.5 rounded" style={{ backgroundColor: playerColor(state.players, player) }} />
            {player}
            <span className="font-mono text-slate-500 text-xs">{valueAt(history.series[player], to)}</span>
          </span>
        ))}
      </div>

      {showTable ? (
        <HistoryTable state={state} now={now} />
      ) : (
        <div
          ref={box}
          className="relative overflow-hidden bg-[#14171c] border border-slate-800 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700"
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setHoverTs(null)}
          role="img"
          aria-label="Gráfico do score acumulado por operador. Use as setas para navegar no tempo."
        >
          <svg width={width} height={HEIGHT} className="block">
            {yTicks.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="#1e293b" strokeWidth={1} />
                <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px] font-mono">
                  {tick}
                </text>
              </g>
            ))}
            {xTicks.map((tick, i) => (
              <text
                key={tick}
                x={x(tick)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                className="fill-slate-500 text-[11px]"
              >
                {formatDate(tick)}
              </text>
            ))}
            {state.players.map((player) => (
              <path
                key={player}
                d={pathFor(history.series[player])}
                fill="none"
                stroke={playerColor(state.players, player)}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {hoverTs !== null && (
              <g pointerEvents="none">
                <line x1={x(hoverTs)} x2={x(hoverTs)} y1={MARGIN.top} y2={MARGIN.top + innerH} stroke="#64748b" strokeWidth={1} />
                {state.players.map((player) => (
                  <circle
                    key={player}
                    cx={x(hoverTs)}
                    cy={y(valueAt(history.series[player], hoverTs))}
                    r={4}
                    fill={playerColor(state.players, player)}
                    stroke="#14171c"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onPointer}
              onPointerDown={onPointer}
              onPointerLeave={() => setHoverTs(null)}
            />
          </svg>

          {readout && hoverTs !== null && (
            <div
              className="absolute top-3 pointer-events-none bg-[#0b0d11]/95 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[150px]"
              style={tooltipLeft ? { right: width - x(hoverTs) + 12 } : { left: x(hoverTs) + 12 }}
            >
              <div className="text-[11px] text-slate-400 mb-1.5">{formatDateTime(hoverTs)}</div>
              {readout.map(({ player, score }) => (
                <div key={player} className="flex items-center gap-2 text-sm leading-6">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: playerColor(state.players, player) }} />
                  <span className="font-mono font-bold text-slate-100 w-8 text-right">{score}</span>
                  <span className="text-slate-400 text-xs">{player}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryTable({ state, now }: { state: TrackerState; now: number }) {
  const rows = state.players
    .map((player) => {
      const pp = state.progress[player] ?? {};
      return {
        player,
        total: pointsInWindow(pp, state.weapons, 0, now),
        week: pointsInWindow(pp, state.weapons, now - 7 * DAY_MS, now),
        month: pointsInWindow(pp, state.weapons, now - 30 * DAY_MS, now),
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="overflow-x-auto bg-[#14171c] border border-slate-800 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
            <th className="px-4 py-3 font-bold">Operador</th>
            <th className="px-4 py-3 font-bold text-right">Score</th>
            <th className="px-4 py-3 font-bold text-right">+7 dias</th>
            <th className="px-4 py-3 font-bold text-right">+30 dias</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player} className="border-b border-slate-800/60 last:border-0">
              <td className="px-4 py-3 font-bold text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: playerColor(state.players, r.player) }} />
                  {r.player}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-100">{r.total}</td>
              <td className="px-4 py-3 text-right font-mono text-slate-400">+{r.week}</td>
              <td className="px-4 py-3 text-right font-mono text-slate-400">+{r.month}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
