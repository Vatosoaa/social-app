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
      <div className="my-8 rounded-3xl bg-white/80 backdrop-blur-md border border-green-100/50 p-5 text-center shadow-sm">
        <Sparkles className="h-5 w-5 text-[#22C55E] mx-auto mb-2 animate-pulse" />
        <p className="text-xs font-semibold text-[#14532D]/70 uppercase tracking-wider mb-1">Suggestions</p>
        <p className="text-xs text-[#14532D]/60">Vous suivez déjà tout le monde ! ✨</p>
      </div>
    );
  }

  return (
    <div className="my-8 rounded-3xl bg-white/80 backdrop-blur-md border border-green-100/50 p-5 space-y-4 shadow-sm hover:shadow-md hover:border-green-100/60 hover:shadow-green-100/30 transition-all duration-300">
      <div className="flex items-center justify-between text-xs font-semibold text-[#14532D]/70 uppercase tracking-wider">
        <span className="flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5 text-[#22C55E]" />
          Suggestions de suivi
        </span>
        <span className="text-[10px] text-[#16A34A] font-mono">{suggestions.length}</span>
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
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-green-100 bg-green-50 group-hover/item:border-[#22C55E]/40 transition-all duration-300">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name || ''} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-green-50">
                        <User className="h-4 w-4 text-green-300" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#14532D] truncate group-hover/item:text-[#22C55E] transition-colors">
                    {user.name || 'Utilisateur'}
                  </p>
                  <p className="text-[10px] text-[#14532D]/60 truncate leading-normal">
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
                    ? 'bg-emerald-50 border border-emerald-250 text-emerald-600'
                    : 'bg-green-50 hover:bg-[#22C55E] text-[#16A34A] hover:text-white border border-green-100/50 hover:border-transparent shadow-xs'
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
