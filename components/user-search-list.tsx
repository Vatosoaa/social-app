'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { User, Check, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleFollow } from '@/app/actions/follows';
import type { FollowUser } from '@/app/actions/follows';

interface UserSearchListProps {
  initialUsers: FollowUser[];
  currentUserId: number;
}

export default function UserSearchList({ initialUsers, currentUserId }: UserSearchListProps) {
  const [users, setUsers] = useState<FollowUser[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFollowToggle = (userId: number) => {
    setLoadingId(userId);
    startTransition(async () => {
      const res = await toggleFollow(userId);
      if (res.success && res.following !== undefined) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_following: res.following! } : u))
        );
      }
      setLoadingId(null);
    });
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2">
        <User className="h-8 w-8 text-zinc-700 animate-pulse" />
        <p className="text-sm font-semibold">Aucun utilisateur trouvé</p>
        <p className="text-xs max-w-xs">Essayez d'autres mots-clés pour trouver des membres de la communauté.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4 animate-in fade-in duration-300">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        const profilePath = isSelf ? '/profile' : `/profile/${user.id}`;
        const isCurrentlyLoading = loadingId === user.id && isPending;

        return (
          <li
            key={user.id}
            className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700/60 backdrop-blur-md transition-all duration-300 group"
          >
            <Link href={profilePath} className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer">
              <div className="relative flex-shrink-0">
                <div className="h-11 w-11 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 group-hover:border-violet-500/40 transition-all duration-300 flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name || ''} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-400">
                      <User className="h-5 w-5 text-zinc-550" />
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-violet-400 transition-colors">
                  {user.name || 'Utilisateur'}
                </p>
                <p className="text-xs text-zinc-400 truncate leading-relaxed mt-0.5">
                  {user.bio || 'Pas de biographie.'}
                </p>
              </div>
            </Link>

            {!isSelf && (
              <Button
                onClick={() => handleFollowToggle(user.id)}
                disabled={isCurrentlyLoading}
                size="sm"
                className={`h-8 px-4 text-xs font-bold rounded-xl transition-all duration-300 flex-shrink-0 ${
                  user.is_following
                    ? 'bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/60'
                    : 'bg-zinc-800 hover:bg-violet-650 text-zinc-200 hover:text-white border border-zinc-700/60 hover:border-violet-550 shadow-md hover:shadow-violet-500/10'
                }`}
              >
                {isCurrentlyLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : user.is_following ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Suivi
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Suivre
                  </span>
                )}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
