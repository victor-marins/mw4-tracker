'use client';
import { useState } from 'react';
import { ADMIN_PLAYER } from '@/lib/weapons';
import { buttonPrimary, ConfirmDialog, inputClass, labelClass, Modal, playerColor } from './ui';
import type { Tracker } from './useTracker';

export function MembersModal({ tracker, me, onClose }: { tracker: Tracker; me: string; onClose: () => void }) {
  const players = tracker.state!.players;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    if (await tracker.mutate('/api/players', 'POST', { actor: me, name })) setName('');
    setSaving(false);
  };

  const confirmRemove = async () => {
    if (!removing) return;
    const player = removing;
    setRemoving(null);
    await tracker.mutate(`/api/players/${encodeURIComponent(player)}`, 'DELETE', { actor: me });
  };

  if (removing) {
    return (
      <ConfirmDialog
        title="Remover membro"
        confirmLabel="REMOVER"
        danger
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      >
        <p>
          Remover <span className="font-bold text-slate-100">{removing}</span> do esquadrão?
        </p>
        <p className="text-sm text-slate-400">
          O progresso fica guardado: se adicionar de novo com o mesmo nome, tudo volta.
        </p>
      </ConfirmDialog>
    );
  }

  return (
    <Modal title="Membros do esquadrão" onClose={onClose}>
      <ul className="space-y-2 mb-6">
        {players.map((player) => (
          <li
            key={player}
            className="flex items-center justify-between bg-[#0f1217] border border-slate-800 rounded-lg px-4 py-2.5"
          >
            <span className="flex items-center gap-2 font-bold text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: playerColor(players, player) }} />
              {player}
              {player === ADMIN_PLAYER && <span className="text-[10px] text-slate-500 uppercase">admin</span>}
            </span>
            {player !== ADMIN_PLAYER && (
              <button
                onClick={() => setRemoving(player)}
                className="text-xs font-bold text-red-400/70 hover:text-red-400"
                aria-label={`Remover ${player}`}
              >
                REMOVER
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="space-y-3 border-t border-slate-800 pt-4">
        <label className={labelClass} htmlFor="member-name">
          Novo membro
        </label>
        <div className="flex gap-2">
          <input
            id="member-name"
            maxLength={20}
            placeholder="Nome no jogo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={saving || !name.trim()} className={`${buttonPrimary} shrink-0`}>
            ADICIONAR
          </button>
        </div>
        <p className="text-[11px] text-slate-500">2 a 20 caracteres: letras, números, ponto, hífen ou _.</p>
      </form>
    </Modal>
  );
}
