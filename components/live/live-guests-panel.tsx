'use client';

import React, { useState } from 'react';
import { UserPlus, Mic, MicOff, X, Check, Clock, Search } from 'lucide-react';
import type { Guest } from './types';
import { MOCK_NAMES, MOCK_AVATARS } from './types';

interface LiveGuestsPanelProps {
  guests: Guest[];
  onInvite: (name: string, avatar: string) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onMuteGuest: (id: string) => void;
  onRemoveGuest: (id: string) => void;
}

export function LiveGuestsPanel({
  guests,
  onInvite,
  onAccept,
  onDecline,
  onMuteGuest,
  onRemoveGuest,
}: LiveGuestsPanelProps) {
  const [search, setSearch] = useState('');
  const [showInviteList, setShowInviteList] = useState(false);

  const suggestions = MOCK_NAMES.filter(n =>
    n.toLowerCase().includes(search.toLowerCase()) &&
    !guests.some(g => g.name === n)
  );

  const activeGuests = guests.filter(g => g.status === 'active');
  const pendingGuests = guests.filter(g => g.status === 'pending');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
            Invités
          </span>
          <span className="text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full border border-violet-400/20">
            {activeGuests.length}/4 actifs
          </span>
        </div>

        {/* Invite button */}
        <button
          onClick={() => setShowInviteList(v => !v)}
          disabled={activeGuests.length >= 4}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-40"
        >
          <UserPlus className="h-4 w-4" />
          Inviter un utilisateur
        </button>

        {/* Search invite */}
        {showInviteList && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-[10px] text-white placeholder-slate-500 outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>
            <div className="bg-[#0a101f] border border-white/10 rounded-xl overflow-hidden max-h-32 overflow-y-auto scrollbar-hide">
              {suggestions.slice(0, 6).map((name, i) => (
                <button
                  key={name}
                  onClick={() => {
                    onInvite(name, MOCK_AVATARS[i % MOCK_AVATARS.length]);
                    setShowInviteList(false);
                    setSearch('');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 text-left transition-colors"
                >
                  <img
                    src={MOCK_AVATARS[i % MOCK_AVATARS.length]}
                    className="h-6 w-6 rounded-full object-cover"
                    alt=""
                  />
                  <span className="text-[10px] text-slate-200 font-medium">{name}</span>
                  <UserPlus className="h-3 w-3 text-violet-400 ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide min-h-0">

        {/* Active guests grid */}
        {activeGuests.length > 0 && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-1">
              En direct
            </p>
            <div className={`grid gap-2 ${activeGuests.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {activeGuests.map(guest => (
                <div
                  key={guest.id}
                  className="relative aspect-video rounded-2xl bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-lg shadow-emerald-500/10 group"
                >
                  <img
                    src={guest.avatar}
                    className="h-12 w-12 rounded-full object-cover border-2 border-white/20"
                    alt=""
                  />
                  {guest.isMuted && (
                    <div className="absolute top-1.5 left-1.5 bg-rose-600 p-0.5 rounded-md">
                      <MicOff className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-[9px] font-bold text-white truncate">{guest.name}</p>
                  </div>
                  {/* Controls on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => onMuteGuest(guest.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        guest.isMuted
                          ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                          : 'border-rose-500/40 text-rose-400 hover:bg-rose-500/20'
                      }`}
                    >
                      {guest.isMuted ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => onRemoveGuest(guest.id)}
                      className="p-1.5 rounded-lg border border-slate-500/40 text-slate-400 hover:bg-slate-500/20 hover:text-white transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending invitations */}
        {pendingGuests.length > 0 && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-1">
              En attente
            </p>
            <div className="space-y-2">
              {pendingGuests.map(guest => (
                <div
                  key={guest.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in"
                >
                  <img
                    src={guest.avatar}
                    className="h-7 w-7 rounded-full object-cover border border-white/10 flex-shrink-0"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-200 truncate">{guest.name}</p>
                    <div className="flex items-center gap-1 text-[9px] text-amber-400">
                      <Clock className="h-2.5 w-2.5" />
                      <span>Invitation envoyée</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => onAccept(guest.id)}
                      className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDecline(guest.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {guests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
            <UserPlus className="h-8 w-8 text-slate-700" />
            <p className="text-xs text-center">Aucun invité pour l'instant.<br />Invitez jusqu'à 4 personnes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
