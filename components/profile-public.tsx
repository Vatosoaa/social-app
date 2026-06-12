'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { User, Users, ChevronLeft, Calendar, BookOpen, Loader2, Sparkles, Check, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toggleFollow, getFollowers, getFollowing } from '@/app/actions/follows';
import type { FollowUser } from '@/app/actions/follows';
import type { DbUser } from '@/lib/session';
import type { Post } from '@/lib/definitions';
import PostCard from './post-card';

interface ProfilePublicProps {
  targetUser: {
    id: number;
    name: string | null;
    bio: string | null;
    avatar_url: string | null;
    followers_count: number;
    following_count: number;
    is_following: boolean;
  };
  currentUser: DbUser;
  posts: Post[];
}

export default function ProfilePublic({ targetUser, currentUser, posts }: ProfilePublicProps) {
  const [isFollowing, setIsFollowing] = useState(targetUser.is_following);
  const [followersCount, setFollowersCount] = useState(targetUser.followers_count);
  const [isPending, startTransition] = useTransition();

  // Dialog states for lists
  const [dialogType, setDialogType] = useState<'followers' | 'following' | null>(null);
  const [usersList, setUsersList] = useState<FollowUser[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const handleFollowToggle = () => {
    startTransition(async () => {
      const res = await toggleFollow(targetUser.id);
      if (res.success) {
        setIsFollowing(res.following || false);
        setFollowersCount((prev) => (res.following ? prev + 1 : Math.max(0, prev - 1)));
      }
    });
  };

  const openUsersDialog = async (type: 'followers' | 'following') => {
    setDialogType(type);
    setLoadingList(true);
    try {
      const data = type === 'followers' 
        ? await getFollowers(targetUser.id)
        : await getFollowing(targetUser.id);
      setUsersList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleListFollowToggle = async (userId: number) => {
    const res = await toggleFollow(userId);
    if (res.success) {
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_following: res.following || false } : u))
      );
      // If the target user of this profile page is followed/unfollowed inside the dialog, sync page state
      if (userId === targetUser.id) {
        setIsFollowing(res.following || false);
        setFollowersCount((prev) => (res.following ? prev + 1 : Math.max(0, prev - 1)));
      }
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-30 w-full border-b border-zinc-900/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/">
            <Button variant="ghost" className="h-9 gap-1.5 text-zinc-450 hover:text-zinc-200 rounded-xl text-xs">
              <ChevronLeft className="h-4 w-4" /> Retour au fil
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-bold tracking-wider bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent uppercase">
              Twinkly
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Profile Details Card */}
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-6 md:p-8 space-y-6">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

          {/* User details row */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-violet-500/30 flex-shrink-0 bg-zinc-950">
              {targetUser.avatar_url ? (
                <img src={targetUser.avatar_url} alt={targetUser.name || ''} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                  <User className="h-10 w-10 text-zinc-550" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight truncate">
                  {targetUser.name || 'Utilisateur'}
                </h1>
                <p className="text-xs text-zinc-550 flex items-center justify-center md:justify-start gap-1.5 mt-1">
                  <Calendar className="h-3.5 w-3.5" /> Membre de la communauté
                </p>
              </div>

              {targetUser.bio ? (
                <p className="text-sm text-zinc-350 leading-relaxed max-w-xl">
                  {targetUser.bio}
                </p>
              ) : (
                <p className="text-xs text-zinc-600 italic">Aucune biographie rédigée.</p>
              )}

              {/* Followers/Following statistics */}
              <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                <button
                  onClick={() => openUsersDialog('followers')}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-violet-400 transition-colors"
                >
                  <span className="font-bold text-zinc-200">{followersCount}</span> abonnés
                </button>
                <span className="h-3 w-[1px] bg-zinc-800" />
                <button
                  onClick={() => openUsersDialog('following')}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-violet-400 transition-colors"
                >
                  <span className="font-bold text-zinc-200">{targetUser.following_count}</span> abonnements
                </button>
              </div>
            </div>

            {/* Buttons Row */}
            {currentUser.id !== targetUser.id && (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <Button
                  onClick={handleFollowToggle}
                  disabled={isPending}
                  className={`w-full sm:w-auto h-10 px-6 font-bold rounded-xl shadow-md transition-all duration-300 ${
                    isFollowing
                      ? 'bg-zinc-800 hover:bg-rose-950/20 text-zinc-200 hover:text-rose-450 border border-zinc-700/60 hover:border-rose-900/40'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-500/10'
                  }`}
                >
                  {isFollowing ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-450" /> Abonné(e)
                    </span>
                  ) : (
                    'S\'abonner'
                  )}
                </Button>

                <Link href={`/messages?chatUser=${targetUser.id}`} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-10 px-6 font-bold rounded-xl bg-zinc-900/40 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all duration-300"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" /> Message
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* User's posts feed */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-450 uppercase tracking-wider pl-1">
            <BookOpen className="h-3.5 w-3.5" />
            Publications de {targetUser.name || 'l\'utilisateur'} ({posts.length})
          </div>

          {posts.length > 0 ? (
            <div className="space-y-5">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUser={currentUser} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 py-12 text-center text-zinc-550 space-y-2">
              <BookOpen className="h-8 w-8 mx-auto text-zinc-700 animate-pulse" />
              <p className="text-sm font-semibold">Aucune publication pour l'instant.</p>
              <p className="text-xs text-zinc-600">Cet utilisateur n'a pas encore partagé d'actualité.</p>
            </div>
          )}
        </div>
      </main>

      {/* Dialog for Followers / Following Lists */}
      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800 rounded-3xl text-zinc-100 max-w-md shadow-2xl shadow-black/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-400" />
              {dialogType === 'followers' ? 'Abonnés' : 'Abonnements'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 max-h-[350px] overflow-y-auto pr-1 space-y-4">
            {loadingList ? (
              <div className="flex items-center justify-center py-8 text-zinc-550 text-xs gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                Chargement de la liste...
              </div>
            ) : usersList.length > 0 ? (
              <ul className="space-y-3.5">
                {usersList.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  const profilePath = isSelf ? '/profile' : `/profile/${user.id}`;
                  return (
                    <li key={user.id} className="flex items-center justify-between gap-3 group/dialog-item">
                      <Link
                        href={profilePath}
                        onClick={() => setDialogType(null)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0 group-hover/dialog-item:border-violet-500/40 transition-colors">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name || ''} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-400">
                              <User className="h-4 w-4 text-zinc-550" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-200 group-hover/dialog-item:text-violet-400 transition-colors truncate">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-zinc-550 truncate">{user.bio || 'Pas de biographie.'}</p>
                        </div>
                      </Link>

                      {!isSelf && (
                        <Button
                          onClick={() => handleListFollowToggle(user.id)}
                          size="sm"
                          className={`h-7 px-3 text-[10px] font-bold rounded-lg transition-all duration-200 ${
                            user.is_following
                              ? 'bg-zinc-800 hover:bg-rose-950/20 text-zinc-300 hover:text-rose-450 border border-zinc-700/60'
                              : 'bg-violet-600 hover:bg-violet-500 text-white'
                          }`}
                        >
                          {user.is_following ? 'Abonné' : 'Suivre'}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-zinc-550 text-center py-6">Aucun utilisateur trouvé.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
