'use client';

import React, { useState } from 'react';
import {
  Check, Download, Share2, Trash2, Scissors, Eye, MessageCircle, Heart, Clock,
  Film, TrendingUp, Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { LiveStats } from './types';

interface LivePostSummaryProps {
  stats: LiveStats;
  onClose: () => void;
  onNewLive: () => void;
}

interface Highlight {
  id: string;
  label: string;
  timestamp: string;
  duration: string;
  isStar: boolean;
}

const MOCK_HIGHLIGHTS: Highlight[] = [
  { id: 'h1', label: 'Pic de spectateurs', timestamp: '00:04:32', duration: '0:30', isStar: true },
  { id: 'h2', label: 'Réaction maximale', timestamp: '00:09:17', duration: '0:45', isStar: false },
  { id: 'h3', label: 'Moment viral', timestamp: '00:14:55', duration: '1:00', isStar: true },
];

function formatDur(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h${m % 60}m`;
  return `${m}m${String(s).padStart(2, '0')}s`;
}

export function LivePostSummary({ stats, onClose, onNewLive }: LivePostSummaryProps) {
  const router = useRouter();
  const [savedReplay, setSavedReplay] = useState(false);
  const [replayPublished, setReplayPublished] = useState(false);
  const [selectedHighlights, setSelectedHighlights] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'overview' | 'highlights'>('overview');

  const toggleHighlight = (id: string) => {
    setSelectedHighlights(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  return (
    <div className="w-full max-w-lg bg-[#0d1527] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center gap-4 flex-shrink-0">
        <div className="h-12 w-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Check className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-black text-white">Live terminé avec succès ! 🎉</h3>
          <p className="text-xs text-slate-400">Votre diffusion a bien été enregistrée.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Tab switcher */}
        <div className="flex border-b border-white/10">
          {(['overview', 'highlights'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-colors ${
                tab === t
                  ? 'text-white border-b-2 border-indigo-500'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'overview' ? 'Résumé' : 'Highlights'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="p-5 space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: Clock, label: 'Durée', value: formatDur(stats.duration), color: 'text-amber-400' },
                { icon: Eye, label: 'Vues', value: stats.totalViews.toLocaleString(), color: 'text-indigo-400' },
                { icon: TrendingUp, label: 'Pic', value: stats.peakViewers, color: 'text-sky-400' },
                { icon: MessageCircle, label: 'Commentaires', value: stats.totalComments, color: 'text-emerald-400' },
                { icon: Heart, label: 'Réactions', value: stats.totalReactions, color: 'text-rose-400' },
                { icon: Clock, label: 'Moy. visionnage', value: formatDur(stats.avgWatchTime), color: 'text-violet-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                  <Icon className={`h-4 w-4 mx-auto ${color}`} />
                  <p className="text-xs font-black text-white">{value}</p>
                  <p className="text-[9px] text-slate-500 leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Actions</p>

              <div className="grid grid-cols-2 gap-2">
                {/* Save replay */}
                <button
                  onClick={() => setSavedReplay(true)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                    savedReplay
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Film className="h-4 w-4 flex-shrink-0" />
                  {savedReplay ? 'Replay sauvegardé ✓' : 'Enregistrer le replay'}
                </button>

                {/* Download */}
                <button className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-bold transition-all">
                  <Download className="h-4 w-4 flex-shrink-0" />
                  Télécharger la vidéo
                </button>

                {/* Publish replay */}
                <button
                  onClick={() => setReplayPublished(true)}
                  disabled={!savedReplay}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                    replayPublished
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      : savedReplay
                      ? 'bg-indigo-600 border-transparent text-white hover:bg-indigo-500'
                      : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed opacity-40'
                  }`}
                >
                  <Share2 className="h-4 w-4 flex-shrink-0" />
                  {replayPublished ? 'Replay publié ✓' : 'Publier le replay'}
                </button>

                {/* Delete */}
                <button className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-400 hover:bg-rose-500/15 text-xs font-bold transition-all">
                  <Trash2 className="h-4 w-4 flex-shrink-0" />
                  Supprimer le replay
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'highlights' && (
          <div className="p-5 space-y-4">
            <p className="text-[10px] text-slate-400">
              Sélectionnez les moments forts à découper et partager en tant que clips.
            </p>
            <div className="space-y-2">
              {MOCK_HIGHLIGHTS.map(h => (
                <button
                  key={h.id}
                  onClick={() => toggleHighlight(h.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                    selectedHighlights.has(h.id)
                      ? 'bg-indigo-600/15 border-indigo-500/40'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedHighlights.has(h.id) ? 'bg-indigo-600' : 'bg-white/10'
                  }`}>
                    {h.isStar
                      ? <Star className="h-4.5 w-4.5 text-amber-400" />
                      : <Scissors className="h-4.5 w-4.5 text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{h.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      à {h.timestamp} · {h.duration}
                    </p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    selectedHighlights.has(h.id)
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'border-white/20'
                  }`}>
                    {selectedHighlights.has(h.id) && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                </button>
              ))}
            </div>

            {selectedHighlights.size > 0 && (
              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
                <Scissors className="h-4 w-4" />
                Découper {selectedHighlights.size} moment{selectedHighlights.size > 1 ? 's' : ''} sélectionné{selectedHighlights.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="p-5 border-t border-white/10 flex gap-3 flex-shrink-0">
        <button
          onClick={onNewLive}
          className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-2xl transition-colors"
        >
          Nouveau direct
        </button>
        <button
          onClick={() => router.push('/')}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
