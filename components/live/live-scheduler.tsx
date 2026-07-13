'use client';

import React, { useState } from 'react';
import {
  Calendar, Clock, Lock, Globe, Users, X, Plus, Pencil, Trash2, Radio
} from 'lucide-react';
import type { ScheduledLive, Privacy } from './types';

interface LiveSchedulerProps {
  scheduledLives: ScheduledLive[];
  onSchedule: (live: Omit<ScheduledLive, 'id'>) => void;
  onDelete: (id: string) => void;
}

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'public', label: 'Public', icon: Globe, desc: 'Visible par tous' },
  { value: 'subscribers', label: 'Abonnés', icon: Users, desc: 'Visible par vos abonnés' },
  { value: 'private', label: 'Privé', icon: Lock, desc: 'Sur invitation uniquement' },
];

function getPrivacyIcon(p: Privacy) {
  if (p === 'public') return <Globe className="h-3 w-3" />;
  if (p === 'subscribers') return <Users className="h-3 w-3" />;
  return <Lock className="h-3 w-3" />;
}

function getCountdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Passé';
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `Dans ${days}j ${hrs}h`;
  if (hrs > 0) return `Dans ${hrs}h ${mins}m`;
  return `Dans ${mins}m`;
}

export function LiveScheduler({ scheduledLives, onSchedule, onDelete }: LiveSchedulerProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('public');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;
    onSchedule({ title, description, scheduledAt, privacy });
    setTitle('');
    setDescription('');
    setScheduledAt('');
    setPrivacy('public');
    setShowForm(false);
  };

  // min datetime = now + 5 minutes
  const minDate = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
          Programmer un Live
        </span>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Annuler' : 'Nouveau'}
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 bg-white/5 border border-white/10 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
              Nouveau live planifié
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 block">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Titre du live..."
                required
                className="w-full bg-[#0a101f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/40 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 block">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description optionnelle..."
                rows={2}
                className="w-full bg-[#0a101f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/40 transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 block">Date & Heure *</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={minDate}
                required
                className="w-full bg-[#0a101f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500/40 transition-colors [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 block">Confidentialité</label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRIVACY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrivacy(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all text-[9px] font-bold ${
                      privacy === opt.value
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="h-3.5 w-3.5" />
              Planifier ce live
            </button>
          </form>
        )}

        {/* Scheduled lives list */}
        {scheduledLives.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
            <Calendar className="h-8 w-8 text-slate-700" />
            <p className="text-xs text-center">Aucun live planifié.<br />Créez-en un pour notifier vos abonnés.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduledLives.map(live => (
              <div
                key={live.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 hover:border-white/20 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                      <Radio className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{live.title}</p>
                      {live.description && (
                        <p className="text-[10px] text-slate-400 truncate">{live.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(live.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(live.scheduledAt).toLocaleString('fr-FR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    {getCountdown(live.scheduledAt)}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    {getPrivacyIcon(live.privacy)}
                    {PRIVACY_OPTIONS.find(o => o.value === live.privacy)?.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
