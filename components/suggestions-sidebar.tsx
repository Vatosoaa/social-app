'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { User, UserPlus, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleFollow } from '@/app/actions/follows';
import type { FollowUser } from '@/app/actions/follows';

interface SuggestionsSidebarProps {
  initialSuggestions: FollowUser[];
  currentUserId: number;
}

export default function SuggestionsSidebar({ initialSuggestions, currentUserId }: SuggestionsSidebarProps) {
  const [suggestions, setSuggestions] = useState<FollowUser[]>(initialSuggestions);
  const [followedIds, setFollowedIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleFollow = (userId: number) => {
    startTransition(async () => {
      const res = await toggleFollow(userId);
      if (res.success && res.following) {
        setFollowedIds((prev) => [...prev, userId]);
        // Remove from list after a short delay for nice UX
        setTimeout(() => {
          setSuggestions((prev) => prev.filter((s) => s.id !== userId));
        }, 800);
      }
    });
  };

  if (suggestions.length === 0) {
    return (
      <div className="my-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-5 text-center">
        <Sparkles className="h-5 w-5 text-violet-400 mx-auto mb-2 animate-pulse" />
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Suggestions</p>
        <p className="text-xs text-zinc-550">Vous suivez déjà tout le monde ! ✨</p>
      </div>
    );
  }

  return (
    <div className="my-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-5 space-y-4">
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        <span className="flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5 text-violet-400" />
          Suggestions de suivi
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">{suggestions.length}</span>
      </div>

      <ul className="space-y-4">
        {suggestions.map((user) => {
          const isFollowed = followedIds.includes(user.id);
          const profilePath = user.id === currentUserId ? '/profile' : `/profile/${user.id}`;

          return (
            <li
              key={user.id}
              className={`flex items-center justify-between gap-3 group/item transition-all duration-500 ${
                isFollowed ? 'opacity-50 scale-95 translate-x-2' : ''
              }`}
            >
              {/* User info */}
              <Link href={profilePath} className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-zinc-855 bg-zinc-950 group-hover/item:border-violet-500/30 transition-all duration-300">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name || ''} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                        <User className="h-4 w-4 text-zinc-600" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200 truncate group-hover/item:text-violet-400 transition-colors">
                    {user.name || 'Utilisateur'}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate leading-normal">
                    {user.bio || 'Pas de biographie.'}
                  </p>
                </div>
              </Link>

              {/* Follow action button */}
              <Button
                onClick={() => handleFollow(user.id)}
                disabled={isFollowed || isPending}
                size="sm"
                className={`h-7 px-3 text-[10px] font-bold rounded-lg transition-all duration-300 flex-shrink-0 ${
                  isFollowed
                    ? 'bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/40'
                    : 'bg-zinc-800 hover:bg-violet-600 text-zinc-200 hover:text-white border border-zinc-700/60 hover:border-violet-550'
                }`}
              >
                {isFollowed ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Suivi
                  </span>
                ) : (
                  'Suivre'
                )}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
