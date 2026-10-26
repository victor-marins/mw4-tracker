'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { Camo } from '@/lib/types';

// Validated categorical slots (dark surface #14171c): adjacent CVD ΔE ≥ 8.4, contrast ≥ 3:1.
const PLAYER_PALETTE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

export function playerColor(players: string[], player: string): string {
  const index = players.indexOf(player);
  return PLAYER_PALETTE[(index < 0 ? 0 : index) % PLAYER_PALETTE.length];
}

export const CAMO_STYLE: Record<Camo, { text: string; border: string; bg: string; swatch: string }> = {
  ouro: { text: 'text-yellow-500', border: 'border-yellow-500', bg: 'bg-yellow-500/10', swatch: 'bg-yellow-500' },
  platina: { text: 'text-slate-300', border: 'border-slate-300', bg: 'bg-slate-300/10', swatch: 'bg-slate-300' },
  dissonancia: { text: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-500/10', swatch: 'bg-cyan-400' },
  divergencia: { text: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-600/10', swatch: 'bg-purple-500' },
};

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export function timeAgo(ts: number, now: number): string {
  if (ts === 0) return 'antes do histórico';
  const seconds = Math.round((ts - now) / 1000);
  if (Math.abs(seconds) < 60) return 'agora';
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

export function formatDate(ts: number): string {
  return dateFormat.format(ts);
}

export function formatDateTime(ts: number): string {
  return dateTimeFormat.format(ts);
}

export function PlayerName({ players, player, className = '' }: { players: string[]; player: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold text-slate-100 ${className}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: playerColor(players, player) }} />
      {player}
    </span>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-200 tracking-wide uppercase">{children}</h2>
      {hint && <p className="text-slate-500 text-sm mt-1">{hint}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-[#14171c] border border-slate-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors" aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="text-slate-300 space-y-3">{children}</div>
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onCancel} className={`${buttonSecondary} flex-1 py-2.5! text-sm!`}>
          CANCELAR
        </button>
        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          className={`flex-1 font-bold py-2.5 px-4 rounded text-white transition-colors ${
            danger ? 'bg-red-700 hover:bg-red-600' : 'bg-cyan-700 hover:bg-cyan-600'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export const inputClass =
  'w-full bg-[#0f1217] border border-slate-700 rounded p-2.5 text-slate-200 focus:border-cyan-600 focus:outline-none';
export const labelClass = 'block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider';
export const buttonPrimary =
  'bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 transition-colors text-white font-bold py-2.5 px-4 rounded';
export const buttonSecondary =
  'bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 text-xs font-bold transition-colors';
