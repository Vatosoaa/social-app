'use client';

import React, { useState } from 'react';
import { Users, Shield, Flag, Clock, Search, Crown } from 'lucide-react';
import type { Viewer } from './types';

interface LiveViewersPanelProps {
  viewers: Viewer[];
  onBan: (id: string) => void;
}

export function LiveViewersPanel({ viewers, onBan }: LiveViewersPanelProps) {
  const [search, setSearch] = useState('');
  const [bannedIds, setBannedIds] = useState<Set<string>>(new Set());

  const active = viewers.filter(v => !bannedIds.has(v.id));
  const filtered = active.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleBan = (id: string) => {
    setBannedIds(prev => new Set([...prev, id]));
    onBan(id);
  };

  const formatDuration = (ts: number) => {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h${mins % 60}m`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
            Spectateurs
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-400/10 px-2.5 py-1 rounded-full border border-sky-400/20">
            <Users className="h-3 w-3" />
            {active.length}
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un spectateur..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-[10px] text-white placeholder-slate-500 outline-none focus:border-indigo-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Viewer List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
            <Users className="h-8 w-8 text-slate-700" />
            <p className="text-xs">Aucun spectateur trouvé</p>
          </div>
        ) : (
          filtered.map((viewer, idx) => (
            <div
              key={viewer.id}
              className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-all duration-150 animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={viewer.avatar}
                  className="h-7 w-7 rounded-full object-cover border border-white/10"
                  alt=""
                />
                {/* Online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-black" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {idx === 0 && (
                    <span title="Premier spectateur">
                      <Crown className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                    </span>
                  )}
                  <p className="text-[11px] font-bold text-slate-200 truncate">{viewer.name}</p>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{formatDuration(viewer.joinedAt)}</span>
                </div>
              </div>

              {/* Actions (reveal on hover) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                  onClick={() => handleBan(viewer.id)}
                  title="Bannir cet utilisateur"
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Shield className="h-3 w-3" />
                </button>
                <button
                  title="Signaler cet utilisateur"
                  className="p-1.5 rounded-lg hover:bg-orange-500/20 text-slate-500 hover:text-orange-400 transition-colors"
                >
                  <Flag className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Banned count footer */}
      {bannedIds.size > 0 && (
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <p className="text-[10px] text-rose-400 text-center font-medium">
            {bannedIds.size} utilisateur{bannedIds.size > 1 ? 's' : ''} banni{bannedIds.size > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
