'use client'
import React, { useState, useEffect } from 'react';
import { getTrackerData, saveTrackerData } from './actions';

const CATEGORY_TARGETS = {
  'Fuzis de Assalto': 8, 'SMTs': 5, 'Escopetas': 2, 'MLs': 3,
  'Fuzis de Atirador': 3, 'Fuzis de Precisão': 3, 'Pistolas': 4,
  'Lançadores': 4, 'Corpo a Corpo': 1,
};

const DEFAULT_USERS = ['Marins', 'NoobMaszter', 'Pagno', 'Willlemes'];

const DEFAULT_WEAPONS = [
  // Fuzis de Assalto[cite: 7]
  { id: 'ar1', name: 'HYEON BURST', category: 'Fuzis de Assalto' },
  { id: 'ar2', name: 'M4', category: 'Fuzis de Assalto' },
  { id: 'ar3', name: 'HAN 86', category: 'Fuzis de Assalto' },
  { id: 'ar4', name: 'KASTOV 762', category: 'Fuzis de Assalto' },
  { id: 'ar5', name: 'AXION', category: 'Fuzis de Assalto' },
  { id: 'ar6', name: 'CRONEN SQUALL', category: 'Fuzis de Assalto' },
  { id: 'ar7', name: 'PATRIOT XMR', category: 'Fuzis de Assalto' },
  { id: 'ar8', name: 'ODEN', category: 'Fuzis de Assalto' },

  // SMTs[cite: 8]
  { id: 'smg1', name: 'X-58 NYX', category: 'SMTs' },
  { id: 'smg2', name: 'VEL 46', category: 'SMTs' },
  { id: 'smg3', name: 'ISO NIGHTSHADE', category: 'SMTs' },
  { id: 'smg4', name: 'PPSH-41', category: 'SMTs' },
  { id: 'smg5', name: 'WZ.55 STRIGA', category: 'SMTs' },

  // Escopetas[cite: 9]
  { id: 'sg1', name: 'REZI 12', category: 'Escopetas' },
  { id: 'sg2', name: 'WARLORD', category: 'Escopetas' },

  // MLs[cite: 10]
  { id: 'lmg1', name: 'APOC-338', category: 'MLs' },
  { id: 'lmg2', name: 'ML FINN', category: 'MLs' },
  { id: 'lmg3', name: 'TYPE 73', category: 'MLs' },

  // Fuzis de Atirador[cite: 11]
  { id: 'mr1', name: 'MAR-9', category: 'Fuzis de Atirador' },
  { id: 'mr2', name: 'ORIS 8.6', category: 'Fuzis de Atirador' },
  { id: 'mr3', name: 'MOSIN-NAGANT', category: 'Fuzis de Atirador' },

  // Fuzis de Precisão[cite: 12]
  { id: 'sn1', name: 'SIGNAL 50', category: 'Fuzis de Precisão' },
  { id: 'sn2', name: 'ASTAROTH .57', category: 'Fuzis de Precisão' },
  { id: 'sn3', name: 'KG-7 VULCAN', category: 'Fuzis de Precisão' },

  // Pistolas[cite: 13]
  { id: 'pi1', name: '.50 GS', category: 'Pistolas' },
  { id: 'pi2', name: 'SANG 9 MM', category: 'Pistolas' },
  { id: 'pi3', name: 'MOJAVE .357', category: 'Pistolas' },
  { id: 'pi4', name: 'KRAIT P68', category: 'Pistolas' },

  // Lançadores[cite: 14]
  { id: 'la1', name: 'PILA', category: 'Lançadores' },
  { id: 'la2', name: 'RPG-8', category: 'Lançadores' },
  { id: 'la3', name: 'JOKR', category: 'Lançadores' },
  { id: 'la4', name: 'PM-40 ANVIL', category: 'Lançadores' },

  // Corpo a Corpo[cite: 15]
  { id: 'me1', name: 'FSS CARBON EDGE 1095', category: 'Corpo a Corpo' }
];

export default function TrackerApp() {
  const [isMounted, setIsMounted] = useState(false);
  const [mainTab, setMainTab] = useState('ranking');
  const [activeCategory, setActiveCategory] = useState('Fuzis de Assalto');
  const [currentUser, setCurrentUser] = useState('Marins');
  const [weapons, setWeapons] = useState(DEFAULT_WEAPONS);
  const [progress, setProgress] = useState<any>({});
  const [showAddWeaponModal, setShowAddWeaponModal] = useState(false);
  const [newWeapon, setNewWeapon] = useState({ name: '', category: 'Fuzis de Assalto' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('mw4_user');
    if (savedUser) setCurrentUser(savedUser);

    const savedTab = localStorage.getItem('mw4_maintab');
    if (savedTab) setMainTab(savedTab);

    const savedCategory = localStorage.getItem('mw4_category');
    if (savedCategory) setActiveCategory(savedCategory);

    handleRefresh().finally(() => {
      setIsMounted(true);
    });
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem('mw4_maintab', mainTab);
  }, [mainTab, isMounted]);

  useEffect(() => {
    if (isMounted) localStorage.setItem('mw4_category', activeCategory);
  }, [activeCategory, isMounted]);

  const handleRefresh = async () => {
      setIsUpdating(true);
      const serverData: any = await getTrackerData();
      if (serverData) {
        if (serverData.weapons) {
          // Separa as armas customizadas salvas no banco
          const customWeapons = serverData.weapons.filter((w: any) => w.isCustom);
          // Força a junção da lista oficial atualizada no código com as customizadas
          const updatedWeapons = [...DEFAULT_WEAPONS, ...customWeapons];
          
          setWeapons(updatedWeapons);
          
          // Atualiza o banco silenciosamente com a nova lista oficial
          if (serverData.progress) {
            syncData(serverData.progress, updatedWeapons);
          }
        }
        if (serverData.progress) setProgress(serverData.progress);
      }
      setIsUpdating(false);
    };

  const syncData = async (newProgress: any, newWeapons: any) => {
    setProgress(newProgress);
    setWeapons(newWeapons);
    await saveTrackerData({ progress: newProgress, weapons: newWeapons });
  };

  const changeUser = (user: string) => {
    setCurrentUser(user);
    localStorage.setItem('mw4_user', user);
    setIsSidebarOpen(false);
  };

  const userProgress = progress[currentUser] || {};
  
  const categoryGoldCounts = weapons.reduce((acc: any, wp: any) => {
    if (!acc[wp.category]) acc[wp.category] = 0;
    if (userProgress[wp.id]?.ouro) acc[wp.category]++;
    return acc;
  }, {});

  const totalPlatinas = Object.values(userProgress).filter((p: any) => p.platina).length;
  const totalDissonancias = Object.values(userProgress).filter((p: any) => p.dissonancia).length;

  const handleToggleCamo = (weaponId: string, camoType: string) => {
    const wpProgress = userProgress[weaponId] || { ouro: false, platina: false, dissonancia: false, divergencia: false };
    const newValue = !wpProgress[camoType];
    
    let updatedWpProgress = { ...wpProgress, [camoType]: newValue };

    if (!newValue) {
      if (camoType === 'ouro') updatedWpProgress = { ...updatedWpProgress, platina: false, dissonancia: false, divergencia: false };
      if (camoType === 'platina') updatedWpProgress = { ...updatedWpProgress, dissonancia: false, divergencia: false };
      if (camoType === 'dissonancia') updatedWpProgress = { ...updatedWpProgress, divergencia: false };
    }

    const newProgress = {
      ...progress,
      [currentUser]: {
        ...userProgress,
        [weaponId]: updatedWpProgress
      }
    };
    syncData(newProgress, weapons);
  };

  const handleAddWeapon = (e: any) => {
    e.preventDefault();
    if (!newWeapon.name.trim()) return;
    const newWp = {
      id: `custom_${Date.now()}`,
      name: newWeapon.name.toUpperCase(),
      category: newWeapon.category,
      isCustom: true
    };
    const updatedWeapons = [...weapons, newWp];
    setNewWeapon({ name: '', category: 'Fuzis de Assalto' });
    setShowAddWeaponModal(false);
    syncData(progress, updatedWeapons);
  };

  const handleDeleteWeapon = (weaponId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta arma?")) return;
    const updatedWeapons = weapons.filter(w => w.id !== weaponId);
    
    const updatedProgress = { ...progress };
    Object.keys(updatedProgress).forEach(user => {
      if (updatedProgress[user] && updatedProgress[user][weaponId]) {
        delete updatedProgress[user][weaponId];
      }
    });
    syncData(updatedProgress, updatedWeapons);
  };

  const renderRanking = () => {
    const playersData = DEFAULT_USERS.map(user => {
      const pData = progress[user] || {};
      let ouros = 0, platinas = 0, dissonancias = 0, divergencias = 0;
      
      Object.values(pData).forEach((w: any) => {
        if (w.ouro) ouros++;
        if (w.platina) platinas++;
        if (w.dissonancia) dissonancias++;
        if (w.divergencia) divergencias++;
      });
      
      const score = ouros + (platinas * 2) + (dissonancias * 3) + (divergencias * 4);
      return { user, ouros, platinas, dissonancias, divergencias, score };
    });

    playersData.sort((a, b) => b.score - a.score);
    const top3 = playersData.slice(0, 3);
    const others = playersData.slice(3);

    const podiumOrder = [];
    if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2 });
    if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1 });
    if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3 });

    const getPodiumStyles = (rank: number) => {
      switch(rank) {
        case 1: return "border-yellow-500 bg-yellow-500/10 text-yellow-400 h-64 md:h-72 shadow-[0_0_20px_rgba(234,179,8,0.2)] transform md:-translate-y-4";
        case 2: return "border-slate-300 bg-slate-300/10 text-slate-300 h-52 md:h-60";
        case 3: return "border-orange-700 bg-orange-700/10 text-orange-600 h-44 md:h-52";
        default: return "";
      }
    };

    return (
      <div className="space-y-8 animate-fade-in pb-12 mt-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-wider text-slate-100 uppercase">Classificação Geral</h2>
          <p className="text-slate-400 mt-2 text-sm">O ranking oficial do esquadrão.</p>
        </div>

        {podiumOrder.length > 0 && (
          <div className="flex flex-row justify-center items-end gap-2 md:gap-6 mt-12 mb-8 px-2">
            {podiumOrder.map((player) => (
              <div key={player.user} className={`relative flex flex-col items-center justify-between p-4 rounded-t-lg border-t-4 border-l border-r border-b-0 w-1/3 max-w-[200px] transition-all duration-500 ${getPodiumStyles(player.rank)}`}>
                <div className="absolute -top-6 text-3xl md:text-5xl filter drop-shadow-lg">
                  {player.rank === 1 ? '🏆' : player.rank === 2 ? '🥈' : '🥉'}
                </div>
                <div className="mt-4 text-center w-full">
                  <div className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-80 mb-1">{player.rank}º LUGAR</div>
                  <div className="text-sm md:text-xl font-black truncate px-1">{player.user}</div>
                  <div className="text-xs mt-2 opacity-70">SCORE</div>
                  <div className="text-2xl md:text-4xl font-mono font-bold">{player.score}</div>
                </div>
                <div className="w-full mt-auto bg-slate-900/50 rounded p-2 grid grid-cols-2 gap-1 text-[10px] md:text-xs">
                   <div className="text-yellow-500 text-center"><span className="opacity-70">O:</span> {player.ouros}</div>
                   <div className="text-slate-300 text-center"><span className="opacity-70">P:</span> {player.platinas}</div>
                   <div className="text-cyan-400 text-center"><span className="opacity-70">D:</span> {player.dissonancias}</div>
                   <div className="text-purple-500 text-center"><span className="opacity-70">V:</span> {player.divergencias}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div className="max-w-3xl mx-auto space-y-3 px-4">
            {others.map((player, idx) => (
              <div key={player.user} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-slate-500 font-mono font-bold text-xl w-8 text-center">#{idx + 4}</div>
                  <div className="text-slate-200 font-bold text-lg">{player.user}</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:flex gap-4 text-sm font-mono">
                    <div className="text-yellow-500/80">O:{player.ouros}</div>
                    <div className="text-slate-300/80">P:{player.platinas}</div>
                    <div className="text-cyan-400/80">D:{player.dissonancias}</div>
                    <div className="text-purple-500/80">V:{player.divergencias}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Score</div>
                    <div className="text-xl font-mono text-slate-300 font-bold">{player.score}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderGlobalProgress = () => {
    const pctDissonancia = Math.min(100, Math.round((totalPlatinas / 33) * 100));
    const pctDivergencia = Math.min(100, Math.round((totalDissonancias / 33) * 100));

    return (
      <div className="space-y-8 animate-fade-in mt-6">
        <div className="bg-[#14171c] border border-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-3 tracking-wider mb-6">
            <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            RELATÓRIO DE MAESTRIA: {currentUser.toUpperCase()}
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-700/50 bg-[#0f1217] rounded-lg p-5">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <div className="text-cyan-400 font-bold text-sm tracking-widest uppercase mb-1">Progresso Global: Dissonância</div>
                  <div className="text-4xl font-black text-white">{pctDissonancia}%</div>
                </div>
                <div className="text-slate-400 text-xs font-mono">{totalPlatinas} / 33 Platinas</div>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: `${pctDissonancia}%` }}></div>
              </div>
            </div>

            <div className="border border-slate-700/50 bg-[#0f1217] rounded-lg p-5">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <div className="text-purple-400 font-bold text-sm tracking-widest uppercase mb-1">Progresso Global: Divergência</div>
                  <div className="text-4xl font-black text-white">{pctDivergencia}%</div>
                </div>
                <div className="text-slate-400 text-xs font-mono">{totalDissonancias} / 33 Dissonâncias</div>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${pctDivergencia}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2 tracking-wide uppercase">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Status para Platina (Por Categoria)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(CATEGORY_TARGETS).map(([cat, target]) => {
              const current = categoryGoldCounts[cat] || 0;
              const pct = Math.min(100, Math.round((current / target) * 100));
              const isComplete = current >= target;
              
              return (
                <div key={cat} className={`border rounded-lg p-4 transition-colors ${isComplete ? 'border-yellow-600/50 bg-yellow-900/10' : 'border-slate-800 bg-[#14171c]'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">{cat}</h4>
                    {isComplete ? (
                      <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    )}
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <div className={`text-2xl font-black ${isComplete ? 'text-yellow-500' : 'text-yellow-500/80'}`}>{pct}%</div>
                    <div className="text-[10px] font-mono text-slate-500">{current}/{target} Ouros</div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${isComplete ? 'bg-yellow-500' : 'bg-yellow-600'}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeaponCard = (wp: any) => {
    const wpProgress = userProgress[wp.id] || {};
    const catTarget = CATEGORY_TARGETS[wp.category as keyof typeof CATEGORY_TARGETS];
    const catGolds = categoryGoldCounts[wp.category] || 0;
    
    const canPlatina = wpProgress.ouro && catGolds >= catTarget;
    const canDissonancia = wpProgress.platina && totalPlatinas >= 33;
    const canDivergencia = wpProgress.dissonancia && totalDissonancias >= 33;

    return (
      <div key={wp.id} className="bg-[#1a1e24] rounded-lg border border-slate-700 overflow-hidden relative group">
        <div className="p-3 border-b border-slate-700 bg-[#14171c] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
            <h3 className="font-bold text-slate-200 tracking-wider text-sm">{wp.name}</h3>
          </div>
          {wp.isCustom && (
            <button 
              onClick={() => handleDeleteWeapon(wp.id)}
              className="text-red-500/50 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
        
        <div className="p-3 grid grid-cols-2 xl:grid-cols-4 gap-2">
          <button onClick={() => handleToggleCamo(wp.id, 'ouro')} className={`p-2 rounded border text-xs font-bold h-12 ${wpProgress.ouro ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>OURO</button>
          <button onClick={() => canPlatina && handleToggleCamo(wp.id, 'platina')} className={`p-2 rounded border text-xs font-bold h-12 flex flex-col items-center justify-center ${wpProgress.platina ? 'bg-slate-300/10 border-slate-300 text-slate-300' : canPlatina ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'}`}>
            {!canPlatina ? <><span className="text-[10px]">{!wpProgress.ouro ? 'REQUER OURO' : `FALTAM ${Math.max(0, catTarget - catGolds)}`}</span></> : 'PLATINA'}
          </button>
          <button onClick={() => canDissonancia && handleToggleCamo(wp.id, 'dissonancia')} className={`p-2 rounded border text-xs font-bold h-12 flex flex-col items-center justify-center ${wpProgress.dissonancia ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : canDissonancia ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'}`}>
            {!canDissonancia ? <><span className="text-[10px]">{!wpProgress.platina ? 'REQUER PLATINA' : `FALTAM ${Math.max(0, 33 - totalPlatinas)}`}</span></> : 'DISSONÂNCIA'}
          </button>
          <button onClick={() => canDivergencia && handleToggleCamo(wp.id, 'divergencia')} className={`p-2 rounded border text-xs font-bold h-12 flex flex-col items-center justify-center ${wpProgress.divergencia ? 'bg-purple-600/10 border-purple-500 text-purple-400' : canDivergencia ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'}`}>
            {!canDivergencia ? <><span className="text-[10px]">{!wpProgress.dissonancia ? 'REQUER DISS.' : `FALTAM ${Math.max(0, 33 - totalDissonancias)}`}</span></> : 'DIVERGÊNCIA'}
          </button>
        </div>
      </div>
    );
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#0f1217] flex items-center justify-center">
        <div className="w-12 h-12 bg-[#0f1217] border border-cyan-800 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)] animate-pulse">
          <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v4m0 8v4m8-8h-4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1217] text-slate-200 font-sans">
      <nav className="bg-[#161a20] border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-[#0f1217] border border-cyan-800 rounded-xl flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.1)]">
               <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v4m0 8v4m8-8h-4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <div className="font-black text-2xl tracking-wider hidden sm:flex">
               <span className="text-white uppercase">MW4</span>
               <span className="text-cyan-400 uppercase ml-1.5">TRACKER</span>
             </div>
          </div>
          
          <button onClick={handleRefresh} disabled={isUpdating} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-sm font-bold border border-slate-700 disabled:opacity-50 transition-colors">
            <svg className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">ATUALIZAR</span>
          </button>

          <div className="hidden md:flex space-x-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {DEFAULT_USERS.map(user => (
              <button key={user} onClick={() => changeUser(user)} className={`px-4 py-1.5 rounded text-sm font-bold tracking-wide transition-colors ${currentUser === user ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-800/50' : 'text-slate-500 hover:text-slate-300'}`}>
                {user}
              </button>
            ))}
          </div>

          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </nav>

      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#0f1217]/95 backdrop-blur pt-20 px-6">
          <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex flex-col space-y-2">
            {DEFAULT_USERS.map(user => (
              <button key={user} onClick={() => changeUser(user)} className={`p-4 rounded-lg text-left font-bold border ${currentUser === user ? 'bg-cyan-900/30 border-cyan-700 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                {user}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-slate-800 bg-[#161a20]">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto">
          <button onClick={() => setMainTab('ranking')} className={`shrink-0 flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors ${mainTab === 'ranking' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
             Ranking
          </button>
          <button onClick={() => setMainTab('arsenal')} className={`shrink-0 flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors ${mainTab === 'arsenal' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             Arsenal
          </button>
          <button onClick={() => setMainTab('global')} className={`shrink-0 flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors ${mainTab === 'global' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             Progresso Global
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {mainTab === 'ranking' && renderRanking()}
        {mainTab === 'global' && renderGlobalProgress()}
        
        {mainTab === 'arsenal' && (
           <div className="animate-fade-in">
              <div className="bg-[#14171c] rounded-xl border border-slate-800 p-4 mb-8 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center space-x-3">
                   <div className="w-2 h-12 bg-cyan-500 rounded-full"></div>
                   <div>
                     <div className="text-slate-500 text-xs font-bold tracking-widest uppercase">Operador Atual</div>
                     <div className="text-2xl font-black text-slate-100 uppercase">{currentUser}</div>
                   </div>
                </div>
              </div>

              <div className="flex overflow-x-auto pb-4 mb-6 space-x-2 border-b border-slate-800">
                {Object.keys(CATEGORY_TARGETS).map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 flex items-center space-x-2 px-4 py-2 border rounded-t-lg ${activeCategory === cat ? 'border-cyan-700 border-b-0 bg-[#1a1e24] text-cyan-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 font-medium'}`}>
                    <span>{cat.toUpperCase()}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeCategory === cat ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                      {categoryGoldCounts[cat] || 0}/{CATEGORY_TARGETS[cat as keyof typeof CATEGORY_TARGETS]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-wider text-slate-300 uppercase">{activeCategory}</h2>
                <button onClick={() => setShowAddWeaponModal(true)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded flex items-center space-x-1 border border-slate-700">
                  <span>NOVA ARMA</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weapons.filter((w: any) => w.category === activeCategory).map(renderWeaponCard)}
              </div>
           </div>
        )}
      </main>

      {showAddWeaponModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14171c] border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-200">ADICIONAR NOVA ARMA</h3>
              <button onClick={() => setShowAddWeaponModal(false)} className="text-slate-500">X</button>
            </div>
            <form onSubmit={handleAddWeapon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">NOME DA ARMA</label>
                <input type="text" required value={newWeapon.name} onChange={e => setNewWeapon({...newWeapon, name: e.target.value})} className="w-full bg-[#0f1217] border border-slate-700 rounded p-2.5 text-slate-200 uppercase" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">CATEGORIA</label>
                <select value={newWeapon.category} onChange={e => setNewWeapon({...newWeapon, category: e.target.value})} className="w-full bg-[#0f1217] border border-slate-700 rounded p-2.5 text-slate-200">
                  {Object.keys(CATEGORY_TARGETS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-cyan-700 text-white font-bold py-3 rounded mt-4">SALVAR NO ARSENAL</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
