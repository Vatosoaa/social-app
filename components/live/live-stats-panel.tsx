'use client';

import React from 'react';
import { Eye, Users, MessageCircle, Heart, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import type { LiveStats } from './types';

interface LiveStatsPanelProps {
  stats: LiveStats;
  currentViewers: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sublabel?: string;
}) {
  return (
    <div className={`p-3.5 rounded-2xl bg-white/5 border ${color} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg bg-white/5`}>
          <Icon className="h-3.5 w-3.5 text-slate-300" />
        </div>
      </div>
      <p className="text-xl font-black text-white tracking-tight">{value}</p>
      {sublabel && <p className="text-[9px] text-slate-500">{sublabel}</p>}
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-white font-bold">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function LiveStatsPanel({ stats, currentViewers }: LiveStatsPanelProps) {
  const formatDur = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m >= 60) return `${Math.floor(m / 60)}h${m % 60}m`;
    return `${m}m${String(s).padStart(2, '0')}s`;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
          Statistiques
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Main stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={Eye}
            label="Vues totales"
            value={stats.totalViews.toLocaleString()}
            color="border-indigo-500/20"
            sublabel="Depuis le début du live"
          />
          <StatCard
            icon={Users}
            label="En direct"
            value={currentViewers}
            color="border-sky-500/20"
            sublabel="Spectateurs actifs"
          />
          <StatCard
            icon={TrendingUp}
            label="Pic"
            value={stats.peakViewers}
            color="border-emerald-500/20"
            sublabel="Spectateurs simultanés max"
          />
          <StatCard
            icon={Clock}
            label="Durée"
            value={formatDur(stats.duration)}
            color="border-amber-500/20"
            sublabel="Temps de diffusion"
          />
        </div>

        {/* Engagement bars */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Engagement</span>
          </div>
          <MiniBar
            label="Commentaires"
            value={stats.totalComments}
            max={Math.max(stats.totalComments, 100)}
            color="bg-indigo-500"
          />
          <MiniBar
            label="Réactions"
            value={stats.totalReactions}
            max={Math.max(stats.totalReactions, 200)}
            color="bg-rose-500"
          />
          <MiniBar
            label="Spectateurs max"
            value={stats.peakViewers}
            max={Math.max(stats.peakViewers, 50)}
            color="bg-emerald-500"
          />
        </div>

        {/* Avg watch time */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-amber-500/20 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Temps moyen de visionnage</p>
            <p className="text-base font-black text-white">{formatDur(stats.avgWatchTime)}</p>
          </div>
        </div>

        {/* Reactions breakdown */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
            Répartition des réactions
          </p>
          <div className="flex items-center gap-2 justify-between">
            {['❤️', '👍', '😂', '😮', '🔥', '👏'].map((e, i) => {
              const count = Math.floor(stats.totalReactions / 6 * (1 + Math.sin(i) * 0.3));
              return (
                <div key={e} className="flex flex-col items-center gap-1">
                  <span className="text-base">{e}</span>
                  <span className="text-[9px] font-bold text-slate-300">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
