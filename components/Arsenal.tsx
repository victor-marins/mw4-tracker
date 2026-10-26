'use client';
import { useEffect, useState } from 'react';
import { applyCamo, categoryTarget, countInCategory, lockReason, RuleError, type CamoChange } from '@/lib/rules';
import { highestCamo } from '@/lib/stats';
import { CAMOS, CAMO_LABELS, type Camo, type PlayerProgress, type Weapon } from '@/lib/types';
import { CATEGORIES } from '@/lib/weapons';
import {
  buttonPrimary,
  buttonSecondary,
  CAMO_STYLE,
  ConfirmDialog,
  inputClass,
  labelClass,
  Modal,
  timeAgo,
} from './ui';
import type { Tracker } from './useTracker';

interface PendingToggle {
  weapon: Weapon;
  camo: Camo;
  value: boolean;
  next: PlayerProgress;
  cascade: CamoChange[];
}

export function Arsenal({ tracker, me, viewed, now }: { tracker: Tracker; me: string; viewed: string; now: number }) {
  const state = tracker.state!;
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [showAdd, setShowAdd] = useState(false);
  const canEdit = viewed === me;
  const pp = state.progress[viewed] ?? {};

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mw4_category');
      if (saved && (CATEGORIES as readonly string[]).includes(saved)) queueMicrotask(() => setCategory(saved));
    } catch {
      return;
    }
  }, []);

  const selectCategory = (value: string) => {
    setCategory(value);
    try {
      localStorage.setItem('mw4_category', value);
    } catch {
      return;
    }
  };

  const [pending, setPending] = useState<PendingToggle | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Weapon | null>(null);

  const toggle = (weapon: Weapon, camo: Camo) => {
    if (!canEdit) return;
    const mine = state.progress[me] ?? {};
    const value = mine[weapon.id]?.[camo] === undefined;
    try {
      const result = applyCamo(mine, state.weapons, weapon.id, camo, value, now);
      const cascade = result.changes.filter((c) => !(c.weaponId === weapon.id && c.camo === camo));
      setPending({ weapon, camo, value, next: result.next, cascade });
    } catch (error) {
      if (error instanceof RuleError) return;
      throw error;
    }
  };

  const confirmToggle = () => {
    if (!pending) return;
    tracker.setProgress(me, pending.weapon.id, pending.camo, pending.value, pending.next);
    setPending(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    tracker.mutate(`/api/weapons/${encodeURIComponent(pendingDelete.id)}`, 'DELETE');
    setPendingDelete(null);
  };

  return (
    <div>
      <div className="bg-[#14171c] rounded-xl border border-slate-800 p-4 mb-8 flex items-center justify-between relative overflow-hidden">
        {!canEdit && (
          <div className="absolute top-0 right-0 bg-red-900/50 text-red-200 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
            Modo leitura (só {viewed} edita)
          </div>
        )}
        <div className="flex items-center space-x-3 mt-2 sm:mt-0">
          <div className={`w-2 h-12 rounded-full ${canEdit ? 'bg-cyan-500' : 'bg-slate-600'}`} />
          <div>
            <div className="text-slate-500 text-xs font-bold tracking-widest uppercase">Arsenal de</div>
            <div className={`text-2xl font-black uppercase ${canEdit ? 'text-slate-100' : 'text-slate-400'}`}>{viewed}</div>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 mb-6 space-x-2 border-b border-slate-800" role="tablist">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={category === cat}
            onClick={() => selectCategory(cat)}
            className={`shrink-0 flex items-center space-x-2 px-4 py-2 border rounded-t-lg ${
              category === cat
                ? 'border-cyan-700 border-b-0 bg-[#1a1e24] text-cyan-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 font-medium'
            }`}
          >
            <span>{cat.toUpperCase()}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                category === cat ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {countInCategory(pp, state.weapons, cat, 'ouro')}/{categoryTarget(state.weapons, cat)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-wider text-slate-300 uppercase">{category}</h2>
        {canEdit && (
          <button onClick={() => setShowAdd(true)} className={buttonSecondary}>
            NOVA ARMA
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.weapons
          .filter((w) => w.category === category)
          .map((weapon) => (
            <div key={weapon.id} className="bg-[#1a1e24] rounded-lg border border-slate-700 overflow-hidden group">
              <div className="p-3 border-b border-slate-700 bg-[#14171c] flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-200 tracking-wider text-sm">{weapon.name}</h3>
                {weapon.isCustom && canEdit && (
                  <button
                    onClick={() => setPendingDelete(weapon)}
                    className="text-red-500/50 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
                    aria-label={`Excluir ${weapon.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="p-3 grid grid-cols-2 xl:grid-cols-4 gap-2">
                {CAMOS.map((camo) => {
                  const done = pp[weapon.id]?.[camo] !== undefined;
                  const reason = done ? null : lockReason(pp, state.weapons, weapon, camo);
                  const style = CAMO_STYLE[camo];
                  return (
                    <button
                      key={camo}
                      onClick={() => toggle(weapon, camo)}
                      disabled={!canEdit || reason !== null}
                      title={done ? `Desbloqueada ${timeAgo(pp[weapon.id]![camo]!, now)}` : undefined}
                      className={`p-2 rounded border text-xs font-bold h-12 flex items-center justify-center transition-all ${
                        done
                          ? `${style.bg} ${style.border} ${style.text}`
                          : reason
                            ? 'bg-slate-900 border-slate-800 text-slate-600'
                            : 'bg-slate-800 border-slate-600 text-slate-400'
                      } ${canEdit && !reason ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed'} ${
                        !canEdit && !done ? 'opacity-50' : ''
                      }`}
                    >
                      {reason ? <span className="text-[10px]">{reason}</span> : CAMO_LABELS[camo].toUpperCase()}
                    </button>
                  );
                })}
              </div>

              <SquadStrip players={state.players} weapon={weapon} progress={state.progress} />
            </div>
          ))}
      </div>

      {showAdd && <AddWeaponModal tracker={tracker} defaultCategory={category} onClose={() => setShowAdd(false)} />}

      {pending && (
        <ConfirmDialog
          title={pending.value ? 'Marcar camuflagem' : 'Remover camuflagem'}
          confirmLabel={pending.value ? 'MARCAR' : 'REMOVER'}
          danger={!pending.value}
          onConfirm={confirmToggle}
          onCancel={() => setPending(null)}
        >
          <p>
            {pending.value ? 'Marcar' : 'Remover'}{' '}
            <span className={`font-bold ${CAMO_STYLE[pending.camo].text}`}>{CAMO_LABELS[pending.camo]}</span>{' '}
            {pending.value ? 'na' : 'da'} <span className="font-bold text-slate-100">{pending.weapon.name}</span>?
          </p>
          {pending.cascade.length > 0 && (
            <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-3 text-sm">
              <p className="text-red-200 font-bold mb-2">Também será removido:</p>
              <ul className="space-y-1">
                {pending.cascade.map((c) => (
                  <li key={`${c.weaponId}-${c.camo}`}>
                    <span className={`font-bold ${CAMO_STYLE[c.camo].text}`}>{CAMO_LABELS[c.camo]}</span>{' '}
                    {state.weapons.find((w) => w.id === c.weaponId)?.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ConfirmDialog>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Excluir arma"
          confirmLabel="EXCLUIR"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            Excluir <span className="font-bold text-slate-100">{pendingDelete.name}</span>? O progresso de todo o esquadrão
            nessa arma será apagado.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function SquadStrip({
  players,
  weapon,
  progress,
}: {
  players: string[];
  weapon: Weapon;
  progress: Record<string, Record<string, Partial<Record<Camo, number>>>>;
}) {
  return (
    <div className="px-3 pb-3 flex flex-wrap gap-x-3 gap-y-1">
      {players.map((player) => {
        const top = highestCamo(progress[player]?.[weapon.id]);
        return (
          <span
            key={player}
            className="flex items-center gap-1 text-[10px] text-slate-500"
            title={`${player}: ${top ? CAMO_LABELS[top] : 'sem camuflagem'}`}
          >
            <span className={`w-2 h-2 rounded-sm ${top ? CAMO_STYLE[top].swatch : 'bg-slate-700'}`} />
            {player}
          </span>
        );
      })}
    </div>
  );
}

function AddWeaponModal({
  tracker,
  defaultCategory,
  onClose,
}: {
  tracker: Tracker;
  defaultCategory: string;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    if (await tracker.mutate('/api/weapons', 'POST', { name, category })) onClose();
    setSaving(false);
  };

  return (
    <Modal title="Adicionar nova arma" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="weapon-name">
            Nome da arma
          </label>
          <input
            id="weapon-name"
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="weapon-category">
            Categoria
          </label>
          <select id="weapon-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          A arma entra na meta de todo o esquadrão (ouros da categoria e total para Dissonância).
        </p>
        <button type="submit" disabled={saving} className={`${buttonPrimary} w-full`}>
          SALVAR NO ARSENAL
        </button>
      </form>
    </Modal>
  );
}

