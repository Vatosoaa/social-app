'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  User, Users, ChevronLeft, BookOpen, Loader2, Check,
  MessageSquare, Mail, Play, Award, Image as ImageIcon,
  UserPlus, UserMinus, UserCheck, UserX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toggleFollow, getFollowers, getFollowing } from '@/app/actions/follows';
import type { FollowUser } from '@/app/actions/follows';
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, unfriend } from '@/app/actions/friends';
import type { DbUser } from '@/lib/session';
import type { Post } from '@/lib/definitions';
import PostCard from './post-card';
import AppShell from './app-shell';

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.52 3.526 12 3.526 12 3.526s-7.52 0-9.388.529a3.003 3.003 0 0 0-2.11 2.108C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.868.53 9.388.53 9.388.53s7.52 0 9.388-.53a3.003 3.003 0 0 0 2.11-2.108C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="24" height="24">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.97 1.2 2.27 2.03 3.71 2.37v3.87c-.89-.1-1.78-.36-2.61-.77-.83-.41-1.57-.99-2.16-1.72-.05 3.32-.01 6.64-.03 9.96-.06 1.48-.52 2.94-1.33 4.16-1.04 1.57-2.65 2.68-4.49 3.06-1.84.38-3.78.13-5.46-.72C3.96 23.6 2.6 22 1.94 20.15c-.65-1.84-.57-3.87.23-5.65.98-2.2 2.87-3.88 5.16-4.6v3.9c-1.12.35-2.07 1.15-2.58 2.21-.51 1.06-.52 2.3-.01 3.36.5 1.07 1.47 1.87 2.61 2.22 1.14.35 2.38.22 3.42-.36 1.05-.59 1.76-1.66 1.93-2.86.07-1.12.03-2.24.04-3.36V.02z" />
  </svg>
);

interface ProfilePublicProps {
  targetUser: {
    id: number;
    name: string | null;
    bio: string | null;
    avatar_url: string | null;
    role?: string;
    experience_level?: string;
    favorite_artists?: string;
    favorite_genre?: string;
    software_equipment?: string;
    music_mood?: string;
    city_region?: string;
    availability?: string;
    badges?: string;
    tags?: string;
    social_youtube?: string;
    social_instagram?: string;
    social_tiktok?: string;
    social_facebook?: string;
    social_gmail?: string;
    followers_count: number;
    following_count: number;
    is_following: boolean;
    birthday?: string | null;
    school?: string | null;
    workplace?: string | null;
    is_friend?: boolean;
    has_sent_request?: boolean;
    received_request_id?: number | null;
  };
  currentUser: DbUser;
  posts: Post[];
}

export default function ProfilePublic({ targetUser, currentUser, posts }: ProfilePublicProps) {
  const [isFollowing, setIsFollowing] = useState(targetUser.is_following);
  const [followersCount, setFollowersCount] = useState(targetUser.followers_count);
  const [isFriend, setIsFriend] = useState(targetUser.is_friend || false);
  const [hasSentRequest, setHasSentRequest] = useState(targetUser.has_sent_request || false);
  const [receivedRequestId, setReceivedRequestId] = useState(targetUser.received_request_id || null);
  const [isPending, startTransition] = useTransition();

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

  const handleAddFriend = () => {
    startTransition(async () => {
      const res = await sendFriendRequest(targetUser.id);
      if (res.success) {
        setHasSentRequest(true);
      }
    });
  };

  const handleCancelRequest = () => {
    startTransition(async () => {
      const res = await cancelFriendRequest(targetUser.id);
      if (res.success) {
        setHasSentRequest(false);
      }
    });
  };

  const handleAcceptFriend = () => {
    if (!receivedRequestId) return;
    startTransition(async () => {
      const res = await acceptFriendRequest(receivedRequestId);
      if (res.success) {
        setIsFriend(true);
        setReceivedRequestId(null);
      }
    });
  };

  const handleDeclineFriend = () => {
    if (!receivedRequestId) return;
    startTransition(async () => {
      const res = await declineFriendRequest(receivedRequestId);
      if (res.success) {
        setReceivedRequestId(null);
      }
    });
  };

  const handleUnfriend = () => {
    startTransition(async () => {
      const res = await unfriend(targetUser.id);
      if (res.success) {
        setIsFriend(false);
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
      if (userId === targetUser.id) {
        setIsFollowing(res.following || false);
        setFollowersCount((prev) => (res.following ? prev + 1 : Math.max(0, prev - 1)));
      }
    }
  };

  const galleryPosts = posts.filter(
    (post) =>
      post.media_type === 'image' &&
      post.media_url &&
      (post.media_url.startsWith('http') || post.media_url.startsWith('data:'))
  );

  const isAvailable = targetUser.availability !== 'Not Available';

  return (
    <>
      <AppShell currentUser={currentUser}>
        <div className="space-y-10 max-w-4xl mx-auto w-full py-4 animate-in fade-in duration-350">

          {/* Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
            <Link
              href="/"
              className="flex items-center justify-center h-8 w-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">
              Profil Public
            </h1>
          </div>

          {/* Profile Card & Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Panel: Avatar Card */}
            <div className="lg:col-span-1">
              <div className="rounded-3xl border border-slate-200/60 bg-white shadow-xs p-8 flex flex-col items-center text-center relative">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-0.5">
                  {targetUser.name || 'Utilisateur'}
                </h2>
                <span className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/50 mb-6">
                  {targetUser.role || 'Membre'}
                </span>

                {/* Avatar */}
                <div className="relative h-48 w-48 rounded-full overflow-hidden border-8 border-slate-100 bg-slate-50 shadow-sm flex-shrink-0 mb-6">
                  {targetUser.avatar_url ? (
                    <img
                      src={targetUser.avatar_url}
                      alt={targetUser.name || ''}
                      className="object-cover h-full w-full"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <User className="h-20 w-20" />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 w-full">
                  {/* Friend Request / Connection Button */}
                  {isFriend ? (
                    <Button
                      onClick={handleUnfriend}
                      disabled={isPending}
                      className="w-full h-11 px-6 font-bold rounded-2xl border border-slate-200 bg-slate-100 hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-600 transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="h-4 w-4 text-emerald-500" /> Ami(e) ✓
                    </Button>
                  ) : hasSentRequest ? (
                    <Button
                      onClick={handleCancelRequest}
                      disabled={isPending}
                      className="w-full h-11 px-6 font-bold rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-650 transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> Invitation envoyée
                    </Button>
                  ) : receivedRequestId ? (
                    <div className="flex gap-1.5 w-full">
                      <Button
                        onClick={handleAcceptFriend}
                        disabled={isPending}
                        className="flex-1 h-11 font-bold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 flex items-center justify-center text-xs"
                      >
                        Confirmer
                      </Button>
                      <Button
                        onClick={handleDeclineFriend}
                        disabled={isPending}
                        className="flex-1 h-11 font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 flex items-center justify-center text-xs"
                      >
                        Supprimer
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleAddFriend}
                      disabled={isPending}
                      className="w-full h-11 px-6 font-bold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" /> Ajouter en ami
                    </Button>
                  )}

                  <div className="flex gap-1.5 w-full">
                    <Button
                      onClick={handleFollowToggle}
                      disabled={isPending}
                      size="sm"
                      className={`flex-1 h-9 font-bold rounded-xl shadow-xs transition-all duration-300 text-[10px] ${
                        isFollowing
                          ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {isFollowing ? 'Abonné(e)' : "S'abonner"}
                    </Button>

                    <Link href={`/messages?chatUser=${targetUser.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 font-bold rounded-xl bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 flex items-center justify-center text-[10px]"
                      >
                        Message
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-6 mt-6 border-t border-slate-100 w-full justify-center">
                  <button
                    onClick={() => openUsersDialog('followers')}
                    className="flex flex-col items-center gap-0.5 hover:text-blue-600 transition-colors"
                  >
                    <span className="font-extrabold text-slate-800 text-base leading-none">{followersCount}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">abonnés</span>
                  </button>
                  <span className="h-6 w-[1px] bg-slate-200" />
                  <button
                    onClick={() => openUsersDialog('following')}
                    className="flex flex-col items-center gap-0.5 hover:text-blue-600 transition-colors"
                  >
                    <span className="font-extrabold text-slate-800 text-base leading-none">{targetUser.following_count}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">abonnements</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel: Bio & Social */}
            <div className="lg:col-span-2 flex flex-col space-y-6">

              {/* Bio & Details Card */}
              <div className="rounded-3xl border border-slate-200/60 bg-white shadow-xs p-8 flex-1 flex flex-col justify-between relative">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

                {/* Availability dot */}
                <div className="absolute top-6 right-6">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-6 select-none">Bio &amp; other details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My Role</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.role || 'Beatmaker'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My Experience Level</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.experience_level || 'Intermediate'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My 3 Favorite Artists</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.favorite_artists || 'Ninho, Travis Scott, Metro Boomin'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My Favorite Music Genre</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.favorite_genre || 'Trap'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">The Software or Equipment I Use</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.software_equipment || 'Ableton'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My Preferred Music Mood</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.music_mood || 'Melancholic'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My City or Region</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.city_region || 'California, USA'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Availability</span>
                      <div className="pt-0.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${isAvailable ? 'bg-emerald-50 border border-emerald-200/50 text-emerald-600' : 'bg-rose-50 border border-rose-200/50 text-rose-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {targetUser.availability || 'Available for Collaboration'}
                        </span>
                      </div>
                    </div>

                    {/* Birthday */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Date de naissance</span>
                      <span className="text-slate-700 font-medium text-sm">
                        {targetUser.birthday ? new Date(targetUser.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non renseignée'}
                      </span>
                    </div>

                    {/* School */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">École / Université</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.school || 'Non renseignée'}</span>
                    </div>

                    {/* Workplace */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Lieu de travail</span>
                      <span className="text-slate-700 font-medium text-sm">{targetUser.workplace || 'Non renseigné'}</span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Badges</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(targetUser.badges || 'Top Collaborator').split(',').map((badge, idx) => {
                          const clean = badge.trim();
                          if (!clean) return null;
                          return (
                            <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 bg-cyan-50 border border-cyan-200/50 px-2.5 py-0.5 rounded-lg">
                              <Award className="h-3 w-3" />
                              {clean}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(targetUser.tags || '#Drill, #Melancholic, #Rap-US').split(',').map((tag, idx) => {
                          const clean = tag.trim();
                          if (!clean) return null;
                          return (
                            <span key={idx} className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                              {clean.startsWith('#') ? clean : `#${clean}`}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bio text */}
                <div className="pt-6 mt-8 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Biographie / Description</span>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-xl italic">
                    {targetUser.bio || 'Aucune biographie rédigée.'}
                  </p>
                </div>
              </div>

              {/* Social Media Card */}
              <div className="rounded-3xl border border-slate-200/60 bg-white shadow-xs p-6 relative">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 pl-1 select-none">
                  Social Media
                </h3>
                <div className="flex flex-wrap gap-4 items-center">
                  {targetUser.social_youtube ? (
                    <a href={targetUser.social_youtube.startsWith('http') ? targetUser.social_youtube : `https://${targetUser.social_youtube}`} target="_blank" rel="noopener noreferrer"
                      className="h-12 w-12 rounded-full bg-[#FF0000] hover:scale-110 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-red-500/10 transition-all duration-300" title="YouTube">
                      <YoutubeIcon className="h-6 w-6" />
                    </a>
                  ) : null}

                  {targetUser.social_instagram ? (
                    <a href={targetUser.social_instagram.startsWith('http') ? targetUser.social_instagram : `https://${targetUser.social_instagram}`} target="_blank" rel="noopener noreferrer"
                      className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#FFB900] via-[#FF007F] to-[#7F00FF] hover:scale-110 active:scale-95 flex items-center justify-center text-white shadow-lg transition-all duration-300" title="Instagram">
                      <InstagramIcon className="h-6 w-6" />
                    </a>
                  ) : null}

                  {targetUser.social_tiktok ? (
                    <a href={targetUser.social_tiktok.startsWith('http') ? targetUser.social_tiktok : `https://${targetUser.social_tiktok}`} target="_blank" rel="noopener noreferrer"
                      className="h-12 w-12 rounded-full bg-black hover:scale-110 active:scale-95 flex items-center justify-center text-white shadow-lg transition-all duration-300" title="TikTok">
                      <TikTokIcon className="h-5 w-5" />
                    </a>
                  ) : null}

                  {targetUser.social_facebook ? (
                    <a href={targetUser.social_facebook.startsWith('http') ? targetUser.social_facebook : `https://${targetUser.social_facebook}`} target="_blank" rel="noopener noreferrer"
                      className="h-12 w-12 rounded-full bg-[#1877F2] hover:scale-110 active:scale-95 flex items-center justify-center text-white shadow-lg transition-all duration-300" title="Facebook">
                      <FacebookIcon className="h-6 w-6" />
                    </a>
                  ) : null}

                  {targetUser.social_gmail ? (
                    <a href={targetUser.social_gmail.includes('@') ? `mailto:${targetUser.social_gmail}` : `mailto:${targetUser.social_gmail}@gmail.com`}
                      className="h-12 w-12 rounded-full bg-white border border-slate-200 hover:bg-slate-50 hover:scale-110 active:scale-95 flex items-center justify-center transition-all duration-300" title="Gmail">
                      <Mail className="h-6 w-6 text-rose-500" />
                    </a>
                  ) : null}

                  {!targetUser.social_youtube && !targetUser.social_instagram && !targetUser.social_tiktok && !targetUser.social_facebook && !targetUser.social_gmail && (
                    <span className="text-xs text-slate-400 italic">Aucun réseau social configuré.</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Photo Gallery */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 select-none">
              <ImageIcon className="h-4 w-4" />
              Galerie photos utilisateur ({galleryPosts.length})
            </div>

            {galleryPosts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {galleryPosts.map((post) => (
                  <div
                    key={post.id}
                    className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200/60 bg-slate-100 cursor-pointer shadow-xs hover:shadow-md transition-all duration-300"
                  >
                    <img
                      src={post.media_url || ''}
                      alt="Galerie photo"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-3 text-center transition-all duration-300">
                      <span className="p-2 rounded-full bg-white/20 text-white mb-2 scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="h-4 w-4 fill-white" />
                      </span>
                      <p className="text-[10px] text-white line-clamp-2 px-1">
                        {post.content || 'Voir la publication'}
                      </p>
                      <span className="text-[9px] text-white/60 mt-1.5" suppressHydrationWarning>
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-slate-400 space-y-2">
                <ImageIcon className="h-8 w-8 mx-auto text-slate-300 animate-pulse" />
                <p className="text-sm font-semibold">Galerie photos vide</p>
                <p className="text-xs text-slate-400">Aucune photo partagée par cet utilisateur.</p>
              </div>
            )}
          </div>

          {/* Publications */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 select-none">
              <BookOpen className="h-4 w-4" />
              Publications de {targetUser.name || "l'utilisateur"} ({posts.length})
            </div>

            {posts.length > 0 ? (
              <div className="space-y-5 max-w-3xl mx-auto">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} currentUser={currentUser} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-slate-400 space-y-2 max-w-3xl mx-auto">
                <BookOpen className="h-8 w-8 mx-auto text-slate-300 animate-pulse" />
                <p className="text-sm font-semibold">Aucune publication</p>
                <p className="text-xs text-slate-400">Cet utilisateur n&apos;a pas encore partagé d&apos;actualité.</p>
              </div>
            )}
          </div>

        </div>
      </AppShell>

      {/* Followers / Following Dialog */}
      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="bg-white border-slate-200 rounded-[32px] text-slate-800 max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2 select-none">
              <Users className="h-4 w-4 text-violet-500" />
              {dialogType === 'followers' ? 'Abonnés' : 'Abonnements'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 max-h-[350px] overflow-y-auto pr-1 space-y-4">
            {loadingList ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
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
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 group-hover/dialog-item:border-violet-300 transition-colors">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name || ''} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 group-hover/dialog-item:text-violet-600 transition-colors truncate">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{user.bio || 'Pas de biographie.'}</p>
                        </div>
                      </Link>

                      {!isSelf && (
                        <Button
                          onClick={() => handleListFollowToggle(user.id)}
                          size="sm"
                          className={`h-7 px-3 text-[10px] font-bold rounded-lg transition-all duration-200 ${
                            user.is_following
                              ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200'
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
              <p className="text-xs text-slate-400 text-center py-6">Aucun utilisateur trouvé.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
