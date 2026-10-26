'use client';
import { playerColor } from './ui';

export function LoginScreen({ players, onSelect }: { players: string[]; onSelect: (player: string) => void }) {
  return (
    <div className="min-h-screen bg-[#0f1217] flex flex-col items-center justify-center p-6 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        <Logo size="lg" />
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-widest text-center mt-6">
          MW4 <span className="text-cyan-400">TRACKER</span>
        </h1>
        <p className="text-slate-400 text-sm mt-3 uppercase tracking-wider font-bold">Identifique seu Operador</p>

        <div className="mt-10 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {players.map((player) => (
            <button
              key={player}
              onClick={() => onSelect(player)}
              className="group relative bg-[#161a20] border border-slate-700 hover:border-cyan-500 overflow-hidden rounded-xl p-6 transition-all hover:-translate-y-1 shadow-lg"
            >
              <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: playerColor(players, player) }} />
                <span className="text-slate-200 font-bold text-lg group-hover:text-white transition-colors">{player}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'w-16 h-16 rounded-2xl' : 'w-10 h-10 rounded-xl';
  const icon = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div
      className={`${box} bg-[#0f1217] border border-cyan-800 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.15)]`}
    >
      <svg className={`${icon} text-cyan-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 4v4m0 8v4m8-8h-4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
  );
}
