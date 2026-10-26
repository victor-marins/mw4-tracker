'use client';
import { useEffect, useState } from 'react';
import { ActivityFeed } from './ActivityFeed';
import { Arsenal } from './Arsenal';
import { Duel } from './Duel';
import { GlobalProgress } from './GlobalProgress';
import { HistoryChart } from './HistoryChart';
import { LoginScreen, Logo } from './LoginScreen';
import { MembersModal } from './Members';
import { ADMIN_PLAYER } from '@/lib/weapons';
import { Ranking } from './Ranking';
import { playerColor, timeAgo, useNow } from './ui';
import { useTracker, type Tracker } from './useTracker';

const TABS = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'arsenal', label: 'Arsenal' },
  { id: 'progresso', label: 'Progresso' },
  { id: 'atividade', label: 'Atividade' },
  { id: 'historico', label: 'Histórico' },
  { id: 'duelo', label: '1v1' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const LOGGED_USER_KEY = 'mw4_logged_user';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export default function TrackerApp() {
  const tracker = useTracker();
  const [me, setMe] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => setMe(readStored(LOGGED_USER_KEY)));
  }, []);

  const login = (player: string | null) => {
    store(LOGGED_USER_KEY, player);
    setMe(player);
  };

  if (!tracker.state || me === undefined) {
    return (
      <div className="min-h-screen bg-[#0f1217] flex items-center justify-center">
        <div className="animate-pulse">
          <Logo />
        </div>
      </div>
    );
  }
  if (!me || !tracker.state.players.includes(me)) {
    return <LoginScreen players={tracker.state.players} onSelect={login} />;
  }
  return <Dashboard tracker={tracker} me={me} onLogout={() => login(null)} />;
}

function Dashboard({ tracker, me, onLogout }: { tracker: Tracker; me: string; onLogout: () => void }) {
  const state = tracker.state!;
  const { players } = state;
  const now = useNow(10_000);
  const [tab, setTab] = useState<TabId>('ranking');
  const [viewed, setViewed] = useState(me);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    const saved = readStored('mw4_tab');
    if (saved && TABS.some((t) => t.id === saved)) queueMicrotask(() => setTab(saved as TabId));
  }, []);

  const selectTab = (id: TabId) => {
    setTab(id);
    store('mw4_tab', id);
  };

  const viewedPlayer = players.includes(viewed) ? viewed : me;

  return (
    <div className="min-h-screen bg-[#0f1217] text-slate-200 font-sans">
      <nav className="bg-[#161a20] border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-3">
          <div className="flex items-center space-x-3">
            <Logo />
            <div className="font-black text-2xl tracking-wider hidden sm:flex">
              <span className="text-white uppercase">MW4</span>
              <span className="text-cyan-400 uppercase ml-1.5">TRACKER</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={tracker.reload}
              disabled={tracker.syncing}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300"
              title="Atualiza sozinho a cada 15s"
            >
              <svg
                className={`w-4 h-4 ${tracker.syncing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden lg:inline">
                {tracker.lastSync ? `sincronizado ${timeAgo(tracker.lastSync, Math.max(now, tracker.lastSync))}` : ''}
              </span>
            </button>

            {me === ADMIN_PLAYER && (
              <button
                onClick={() => setShowMembers(true)}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 border border-slate-700 rounded px-2.5 py-1.5"
              >
                MEMBROS
              </button>
            )}

            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white"
                style={{ backgroundColor: playerColor(players, me) }}
              >
                {me.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:block text-sm font-bold text-slate-100">{me}</span>
              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-red-400 transition-colors ml-1 p-1"
                title="Trocar operador"
                aria-label="Trocar operador"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="border-b border-slate-800 bg-[#161a20]">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectTab(t.id)}
              className={`shrink-0 px-5 py-4 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors ${
                tab === t.id ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(tab === 'arsenal' || tab === 'progresso') && (
        <div className="max-w-7xl mx-auto px-4 pt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">Ver arsenal de</span>
          {players.map((player) => (
            <button
              key={player}
              onClick={() => setViewed(player)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold border transition-colors ${
                viewedPlayer === player
                  ? 'bg-cyan-900/40 text-cyan-300 border-cyan-800'
                  : 'text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: playerColor(players, player) }} />
              {player}
              {player === me && <span className="text-[10px] text-slate-500">(você)</span>}
            </button>
          ))}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'ranking' && <Ranking state={state} />}
        {tab === 'arsenal' && <Arsenal tracker={tracker} me={me} viewed={viewedPlayer} now={now} />}
        {tab === 'progresso' && <GlobalProgress state={state} viewed={viewedPlayer} />}
        {tab === 'atividade' && <ActivityFeed state={state} now={now} />}
        {tab === 'historico' && <HistoryChart state={state} now={now} />}
        {tab === 'duelo' && <Duel state={state} me={me} />}
      </main>

      {showMembers && <MembersModal tracker={tracker} me={me} onClose={() => setShowMembers(false)} />}
      {tracker.error && <ErrorToast message={tracker.error} onClose={tracker.clearError} />}
    </div>
  );
}

function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-950 border border-red-800 text-red-100 text-sm px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 max-w-[calc(100vw-2rem)]"
    >
      <span>{message}</span>
      <button onClick={onClose} className="text-red-300 hover:text-white" aria-label="Fechar">
        ✕
      </button>
    </div>
  );
}
