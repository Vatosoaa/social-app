'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  User, Users, ChevronLeft, BookOpen, Loader2, Check,
  MessageSquare, Mail, Play, Award, Image as ImageIcon,
  UserPlus, UserMinus, UserCheck, UserX, Heart, Languages,
  GraduationCap, Phone, Home, Link2, Compass, Video, Calendar,
  Globe, ExternalLink, Info, MapPin, Briefcase, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toggleFollow, getFollowers, getFollowing } from '@/app/actions/follows';
import type { FollowUser } from '@/app/actions/follows';
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, unfriend } from '@/app/actions/friends';
import type { DbUser } from '@/lib/session';
import type { Post } from '@/lib/definitions';
import PostCard from './post-card';
import AppShell from './app-shell';

// Custom SVG Brand Icons
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

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
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
    gender_pronouns?: string | null;
    relationship_status?: string | null;
    languages?: string | null;
    job_title?: string | null;
    skills?: string | null;
    phone?: string | null;
    hometown?: string | null;
    website?: string | null;
    social_linkedin?: string | null;
    hobbies?: string | null;
    interests?: string | null;
    is_friend?: boolean;
    has_sent_request?: boolean;
    received_request_id?: number | null;
    cover_url?: string | null;
  };
  currentUser: DbUser;
  posts: Post[];
}

const InfoTile = ({ label, value, icon: Icon, iconColor, bgColor }: {
  label: string;
  value?: string | null;
  icon: any;
  iconColor: string;
  bgColor: string;
}) => (
  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-55 hover:border-slate-200/80 transition-all duration-300 space-y-2 group shadow-3xs">
    <div className="flex items-center gap-2">
      <span className={`p-1.5 rounded-xl ${bgColor} ${iconColor} flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-slate-800 font-extrabold text-xs pl-0.5">{value || 'Non renseigné'}</p>
  </div>
);

export default function ProfilePublic({ targetUser, currentUser, posts }: ProfilePublicProps) {
  const [isFollowing, setIsFollowing] = useState(targetUser.is_following);
  const [followersCount, setFollowersCount] = useState(targetUser.followers_count);
  const [isFriend, setIsFriend] = useState(targetUser.is_friend || false);
  const [hasSentRequest, setHasSentRequest] = useState(targetUser.has_sent_request || false);
  const [receivedRequestId, setReceivedRequestId] = useState(targetUser.received_request_id || null);
  const [isPending, startTransition] = useTransition();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'timeline' | 'about' | 'friends' | 'photos' | 'reels'>('about');

  // Active section inside the "About" tab
  const [activeAboutSection, setActiveAboutSection] = useState<'personal' | 'journey' | 'contact' | 'interests'>('personal');

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

  const videoPosts = posts.filter(
    (post) => post.media_type === 'video' && post.media_url
  );

  return (
    <>
      <AppShell currentUser={currentUser}>
        <div className="max-w-5xl mx-auto w-full pb-16 font-sans">
          
          {/* Header Back Button */}
          <div className="flex items-center gap-3 pb-3 mb-4 select-none">
            <Link
              href="/"
              className="flex items-center justify-center h-8.5 w-8.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </Link>
            <h1 className="text-base font-black tracking-tight text-slate-850">
              Profil de {targetUser.name || 'Utilisateur'}
            </h1>
          </div>

          {/* Cover & Profile Header Card */}
          <div className="bg-white rounded-b-3xl border border-t-0 border-slate-200/80 shadow-sm overflow-hidden mb-6">
            {/* Cover Banner */}
            <div className="relative h-60 md:h-72 w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-slate-900 overflow-hidden group/cover">
              {targetUser.cover_url ? (
                <img
                  src={targetUser.cover_url}
                  alt="Photo de couverture"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-750 group-hover/cover:scale-105"
                />
              ) : (
                <>
                  <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/20 blur-[80px]" />
                  <div className="absolute bottom-[-10%] left-[10%] w-[250px] h-[250px] rounded-full bg-pink-500/15 blur-[60px]" />
                  <div className="absolute inset-0 bg-black/25 group-hover/cover:bg-black/35 transition-all duration-300" />
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
                </>
              )}
            </div>

            {/* Profile Info Area */}
            <div className="px-6 md:px-10 pb-6 pt-4 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
              {/* Avatar overlapping cover */}
              <div className="relative -mt-24 md:-mt-28 h-36 w-36 md:h-44 md:w-44 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 shadow-xl flex-shrink-0 z-10 group/avatar">
                <div className="h-full w-full rounded-full overflow-hidden border-2 border-white bg-slate-50 relative">
                  {targetUser.avatar_url ? (
                    <img
                      src={targetUser.avatar_url}
                      alt={targetUser.name || ''}
                      className="object-cover h-full w-full transition-transform duration-500 group-hover/avatar:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-350 bg-slate-50">
                      <User className="h-16 w-16" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name and stats */}
              <div className="flex-1 text-center md:text-left z-1 mt-1 md:mt-0">
                <div className="flex flex-col md:flex-row md:items-center gap-2.5 mb-2 justify-center md:justify-start">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 justify-center md:justify-start">
                    {targetUser.name || 'Utilisateur'}
                  </h1>
                  {targetUser.role ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                      <Sparkles className="h-3 w-3" />
                      {targetUser.role}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-slate-100 text-slate-555 border border-slate-200 px-2.5 py-0.5 rounded-full">
                      Membre Twinkly
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs text-slate-555 font-semibold mb-3">
                  <button
                    onClick={() => openUsersDialog('followers')}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-55 border border-slate-200/60 hover:bg-slate-100 hover:border-indigo-205 hover:text-indigo-650 transition-all shadow-3xs cursor-pointer animate-in fade-in duration-300"
                  >
                    <span className="font-extrabold text-slate-850">{followersCount}</span>
                    <span className="text-[10px] text-slate-500">abonné(e)s</span>
                  </button>
                  <button
                    onClick={() => openUsersDialog('following')}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-55 border border-slate-200/60 hover:bg-slate-100 hover:border-indigo-205 hover:text-indigo-650 transition-all shadow-3xs cursor-pointer animate-in fade-in duration-300"
                  >
                    <span className="font-extrabold text-slate-855">{targetUser.following_count}</span>
                    <span className="text-[10px] text-slate-500">abonnements</span>
                  </button>
                </div>

                {targetUser.bio && (
                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-lg italic">
                    {targetUser.bio}
                  </p>
                )}
              </div>

              {/* Public Action Buttons */}
              <div className="flex items-center gap-2.5 z-1 mt-2 md:mt-0 w-full md:w-auto justify-center">
                {/* Friend actions */}
                {isFriend ? (
                  <Button
                    onClick={handleUnfriend}
                    disabled={isPending}
                    className="h-10 px-4 bg-slate-100 hover:bg-rose-50 border border-slate-250 hover:border-rose-300 text-slate-700 hover:text-rose-600 font-extrabold text-xs rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
                  >
                    <UserCheck className="h-4 w-4 text-emerald-500 animate-pulse" /> Ami(e) ✓
                  </Button>
                ) : hasSentRequest ? (
                  <Button
                    onClick={handleCancelRequest}
                    disabled={isPending}
                    className="h-10 px-4 bg-slate-55 hover:bg-slate-100 border border-slate-200 text-slate-650 font-bold text-xs rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> Invitation envoyée
                  </Button>
                ) : receivedRequestId ? (
                  <div className="flex gap-2 animate-in slide-in-from-right-5 duration-350">
                    <Button
                      onClick={handleAcceptFriend}
                      disabled={isPending}
                      className="h-10 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Confirmer
                    </Button>
                    <Button
                      onClick={handleDeclineFriend}
                      disabled={isPending}
                      className="h-10 px-4 bg-slate-105 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-xl shadow-3xs transition-all cursor-pointer"
                    >
                      Supprimer
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleAddFriend}
                    disabled={isPending}
                    className="h-10 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
                  >
                    <UserPlus className="h-4 w-4" /> Ajouter en ami
                  </Button>
                )}

                {/* Follow & Message actions */}
                <div className="flex gap-1.5">
                  <Button
                    onClick={handleFollowToggle}
                    disabled={isPending}
                    className={`h-10 px-4.5 font-extrabold text-xs rounded-xl shadow-3xs transition-all cursor-pointer hover:-translate-y-0.5 ${
                      isFollowing
                        ? 'bg-slate-100 hover:bg-rose-55 text-slate-750 hover:text-rose-650 border border-slate-200 hover:border-rose-255'
                        : 'bg-slate-850 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {isFollowing ? 'Abonné(e)' : "S'abonner"}
                  </Button>

                  <Link href={`/messages?chatUser=${targetUser.id}`}>
                    <Button
                      variant="outline"
                      className="h-10 px-4 bg-white border border-slate-200/80 text-slate-755 hover:bg-slate-50 hover:text-indigo-650 hover:border-indigo-200 font-extrabold text-xs rounded-xl shadow-3xs flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
                    >
                      <MessageSquare className="h-4 w-4 text-slate-400" />
                      Message
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Facebook Style) */}
            <div className="border-t border-slate-100 px-6 md:px-10 py-3.5 flex overflow-x-auto scrollbar-none bg-slate-50/40">
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl w-full sm:w-auto">
                {[
                  { id: 'about', label: 'À propos', icon: Info },
                  { id: 'timeline', label: 'Publications', icon: MessageSquare },
                  { id: 'friends', label: 'Relations', icon: Users },
                  { id: 'photos', label: 'Photos', icon: ImageIcon },
                  { id: 'reels', label: 'Reels', icon: Video }
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all rounded-xl cursor-pointer ${
                        isActive
                          ? 'bg-white text-indigo-650 shadow-xs'
                          : 'text-slate-550 hover:text-slate-805 hover:bg-white/40'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-655' : 'text-slate-400'}`} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Tab content area */}
          <div className="animate-in fade-in duration-300">
                   {/* 1. ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Sidebar */}
                <div className="md:col-span-1">
                  <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs overflow-hidden sticky top-6">
                    <CardHeader className="pb-3 border-b border-slate-100/80">
                      <CardTitle className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-slate-400" />
                        Sections d'infos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1">
                      {[
                        { id: 'personal', label: 'Informations personnelles', icon: User, color: 'text-indigo-500 bg-indigo-50' },
                        { id: 'journey', label: 'Parcours', icon: GraduationCap, color: 'text-purple-500 bg-purple-50' },
                        { id: 'contact', label: 'Coordonnées & Liens', icon: Link2, color: 'text-emerald-500 bg-emerald-50' },
                        { id: 'interests', label: 'Centres d\'intérêt', icon: Compass, color: 'text-rose-500 bg-rose-50' }
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSectionActive = activeAboutSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveAboutSection(item.id as any)}
                            className={`w-full flex items-center gap-3 px-3.5 py-3.5 text-left text-xs font-bold rounded-xl transition-all cursor-pointer ${
                              isSectionActive
                                ? 'bg-indigo-50/80 text-indigo-750 shadow-2xs'
                                : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span className={`p-1.5 rounded-lg ${item.color} flex-shrink-0 transition-transform ${isSectionActive ? 'scale-110' : ''}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Details Panel */}
                <div className="md:col-span-2">
                  <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs min-h-[350px] relative">
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                    
                    {/* A. PERSONAL */}
                    {activeAboutSection === 'personal' && (
                      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                        <div className="border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 select-none uppercase tracking-wider">
                            <User className="h-4.5 w-4.5 text-indigo-500" />
                            Informations personnelles
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Bio */}
                          <div className="sm:col-span-2 p-4.5 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-2 hover:bg-slate-50 transition-all duration-300">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Biographie</span>
                            <p className="text-xs text-slate-655 font-medium leading-relaxed italic">
                              {targetUser.bio || 'Aucune biographie rédigée.'}
                            </p>
                          </div>

                          <InfoTile label="Genre / Pronoms" value={targetUser.gender_pronouns} icon={User} iconColor="text-indigo-500" bgColor="bg-indigo-50" />
                          <InfoTile 
                            label="Date de naissance" 
                            value={targetUser.birthday ? new Date(targetUser.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined} 
                            icon={Calendar} 
                            iconColor="text-indigo-500" 
                            bgColor="bg-indigo-50" 
                          />
                          <InfoTile label="Situation relationnelle" value={targetUser.relationship_status} icon={Heart} iconColor="text-rose-500" bgColor="bg-rose-50" />
                          <InfoTile label="Langues parlées" value={targetUser.languages} icon={Languages} iconColor="text-indigo-500" bgColor="bg-indigo-50" />
                        </div>
                      </div>
                    )}

                    {/* B. JOURNEY */}
                    {activeAboutSection === 'journey' && (
                      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                        <div className="border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 select-none uppercase tracking-wider">
                            <GraduationCap className="h-4 w-4 text-purple-500" />
                            Parcours professionnel &amp; scolaire
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all duration-300 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                                <Briefcase className="h-4 w-4" />
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emploi actuel &amp; passés</span>
                            </div>
                            <div>
                              <p className="text-xs text-slate-850 font-extrabold">
                                {targetUser.job_title ? `${targetUser.job_title}` : 'Poste non renseigné'}
                              </p>
                              {targetUser.workplace && (
                                <p className="text-[10px] text-slate-555 font-semibold mt-0.5">
                                  chez <span className="text-purple-600 font-bold">{targetUser.workplace}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all duration-300 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                                <GraduationCap className="h-4 w-4" />
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Études &amp; Diplômes</span>
                            </div>
                            <p className="text-xs text-slate-850 font-extrabold">
                              {targetUser.school || 'École / Université non renseignée'}
                            </p>
                          </div>

                          <div className="sm:col-span-2 p-4.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all duration-300 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                                <Award className="h-4.5 w-4.5" />
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compétences clés</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {targetUser.skills ? (
                                targetUser.skills.split(',').map((skill, idx) => {
                                  const clean = skill.trim();
                                  if (!clean) return null;
                                  return (
                                    <span key={idx} className="inline-flex items-center text-[10px] font-bold text-purple-700 bg-purple-50/80 border border-purple-100 px-3 py-1 rounded-xl hover:bg-purple-100 transition-colors">
                                      {clean}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-slate-400 italic">Aucune compétence listée.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* C. CONTACT */}
                    {activeAboutSection === 'contact' && (
                      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                        <div className="border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 select-none uppercase tracking-wider">
                            <Link2 className="h-4.5 w-4.5 text-emerald-500" />
                            Coordonnées &amp; Liens en ligne
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InfoTile label="Téléphone" value={targetUser.phone} icon={Phone} iconColor="text-emerald-500" bgColor="bg-emerald-50" />
                          <InfoTile label="Ville actuelle" value={targetUser.city_region} icon={MapPin} iconColor="text-emerald-500" bgColor="bg-emerald-50" />
                          <InfoTile label="Ville d'origine" value={targetUser.hometown} icon={Home} iconColor="text-emerald-500" bgColor="bg-emerald-50" />

                          {/* Site Web */}
                          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all duration-300 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-500">
                                <Globe className="h-4 w-4" />
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Web / Portfolio</span>
                            </div>
                            {targetUser.website ? (
                              <a
                                href={targetUser.website.startsWith('http') ? targetUser.website : `https://${targetUser.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-650 hover:text-indigo-700 hover:underline font-extrabold text-xs flex items-center gap-1.5 pl-0.5 truncate"
                              >
                                {targetUser.website}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-xs pl-0.5">Non renseigné</span>
                            )}
                          </div>

                          {/* Social Networks Connect */}
                          <div className="sm:col-span-2 space-y-3 pt-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-0.5">Réseaux sociaux</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {/* LinkedIn */}
                              {targetUser.social_linkedin && (
                                <a
                                  href={targetUser.social_linkedin.startsWith('http') ? targetUser.social_linkedin : `https://${targetUser.social_linkedin}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-[#0A66C2]/15 bg-white text-slate-700 hover:text-[#0A66C2] hover:bg-[#0A66C2]/5 hover:border-[#0A66C2]/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <LinkedinIcon className="h-4.5 w-4.5 text-[#0A66C2]" />
                                  <span className="truncate">LinkedIn</span>
                                </a>
                              )}

                              {/* Youtube */}
                              {targetUser.social_youtube && (
                                <a
                                  href={targetUser.social_youtube.startsWith('http') ? targetUser.social_youtube : `https://${targetUser.social_youtube}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-[#FF0000]/15 bg-white text-slate-700 hover:text-[#FF0000] hover:bg-[#FF0000]/5 hover:border-[#FF0000]/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <YoutubeIcon className="h-4.5 w-4.5 text-[#FF0000]" />
                                  <span className="truncate">YouTube</span>
                                </a>
                              )}

                              {/* Instagram */}
                              {targetUser.social_instagram && (
                                <a
                                  href={targetUser.social_instagram.startsWith('http') ? targetUser.social_instagram : `https://${targetUser.social_instagram}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-[#E1306C]/15 bg-white text-slate-700 hover:text-[#E1306C] hover:bg-[#E1306C]/5 hover:border-[#E1306C]/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <InstagramIcon className="h-4.5 w-4.5 text-[#E1306C]" />
                                  <span className="truncate">Instagram</span>
                                </a>
                              )}

                              {/* TikTok */}
                              {targetUser.social_tiktok && (
                                <a
                                  href={targetUser.social_tiktok.startsWith('http') ? targetUser.social_tiktok : `https://${targetUser.social_tiktok}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-350 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <TikTokIcon className="h-4 w-4 text-black" />
                                  <span className="truncate">TikTok</span>
                                </a>
                              )}

                              {/* Facebook */}
                              {targetUser.social_facebook && (
                                <a
                                  href={targetUser.social_facebook.startsWith('http') ? targetUser.social_facebook : `https://${targetUser.social_facebook}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-[#1877F2]/15 bg-white text-slate-700 hover:text-[#1877F2] hover:bg-[#1877F2]/5 hover:border-[#1877F2]/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <FacebookIcon className="h-4.5 w-4.5 text-[#1877F2]" />
                                  <span className="truncate">Facebook</span>
                                </a>
                              )}

                              {/* Gmail */}
                              {targetUser.social_gmail && (
                                <a
                                  href={targetUser.social_gmail.includes('@') ? `mailto:${targetUser.social_gmail}` : `mailto:${targetUser.social_gmail}@gmail.com`}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-rose-500/15 bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-500/5 hover:border-rose-500/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <Mail className="h-4.5 w-4.5 text-rose-500" />
                                  <span className="truncate">Gmail</span>
                                </a>
                              )}

                              {!targetUser.social_youtube && !targetUser.social_instagram && !targetUser.social_tiktok && !targetUser.social_facebook && !targetUser.social_gmail && !targetUser.social_linkedin && (
                                <span className="text-xs text-slate-400 italic pl-0.5 sm:col-span-3">Aucun réseau social connecté.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* D. INTERESTS */}
                    {activeAboutSection === 'interests' && (
                      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                        <div className="border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 select-none uppercase tracking-wider">
                            <Compass className="h-4 w-4 text-rose-500" />
                            Loisirs, Passions &amp; Centres d'intérêt
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Hobbies */}
                          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-55 transition-all duration-300 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-sky-50 text-sky-500">
                                <Plus className="h-4 w-4" />
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loisirs &amp; Activités</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {targetUser.hobbies ? (
                                targetUser.hobbies.split(',').map((item, idx) => {
                                  const clean = item.trim();
                                  if (!clean) return null;
                                  return (
                                    <span key={idx} className="inline-flex items-center text-xs font-bold text-sky-750 bg-sky-50 border border-sky-100 px-3 py-1 rounded-xl shadow-3xs cursor-pointer hover:bg-sky-100/60 transition-colors">
                                      {clean}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-slate-450 italic">Aucun loisir renseigné.</span>
                              )}
                            </div>
                          </div>

                          {/* Passions / Interests */}
                          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-55 transition-all duration-300 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-rose-50 text-rose-500">
                                <Compass className="h-4 w-4" />
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centres d'intérêt / Passions</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {targetUser.interests ? (
                                targetUser.interests.split(',').map((item, idx) => {
                                  const clean = item.trim();
                                  if (!clean) return null;
                                  return (
                                    <span key={idx} className="inline-flex items-center text-xs font-bold text-rose-750 bg-rose-55/60 border border-rose-100 px-3 py-1 rounded-xl shadow-3xs cursor-pointer hover:bg-rose-100/60 transition-colors">
                                      {clean}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-slate-455 italic">Aucun centre d'intérêt renseigné.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* 2. TIMELINE / PUBLICATIONS */}
            {activeTab === 'timeline' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Side Intro */}
                <div className="md:col-span-1 space-y-6">
                  <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs p-5 space-y-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Intro</h3>
                    <div className="space-y-3.5 text-xs text-slate-655 font-semibold font-sans">
                      {targetUser.gender_pronouns && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span>Genre / Pronoms : <strong className="text-slate-800">{targetUser.gender_pronouns}</strong></span>
                        </div>
                      )}
                      {targetUser.city_region && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span>Habite à <strong className="text-slate-800">{targetUser.city_region}</strong></span>
                        </div>
                      )}
                      {targetUser.hometown && (
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span>De <strong className="text-slate-800">{targetUser.hometown}</strong></span>
                        </div>
                      )}
                      {targetUser.relationship_status && (
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-rose-500 fill-rose-500 flex-shrink-0" />
                          <span>Situation : <strong className="text-slate-800">{targetUser.relationship_status}</strong></span>
                        </div>
                      )}
                      {targetUser.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <a href={targetUser.website.startsWith('http') ? targetUser.website : `https://${targetUser.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-650 hover:underline">
                            {targetUser.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Photos preview */}
                  <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs p-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Photos</h3>
                      <button onClick={() => setActiveTab('photos')} className="text-xs text-indigo-650 font-bold hover:underline">
                        Voir tout
                      </button>
                    </div>

                    {galleryPosts.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                        {galleryPosts.slice(0, 6).map((post) => (
                          <div key={post.id} className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                            <img src={post.media_url || ''} alt="Preview" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-4">Aucune photo partagée.</p>
                    )}
                  </Card>
                </div>

                {/* Right Side Feed */}
                <div className="md:col-span-2 space-y-5">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <PostCard key={post.id} post={post} currentUser={currentUser} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400 space-y-2">
                      <BookOpen className="h-8 w-8 mx-auto text-slate-350 animate-pulse" />
                      <p className="text-sm font-semibold">Aucune publication</p>
                      <p className="text-xs">Cet utilisateur n'a pas encore partagé d'actualité.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. FRIENDS TAB */}
            {activeTab === 'friends' && (
              <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs p-6 md:p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-indigo-500" />
                    Relations de {targetUser.name || 'l\'utilisateur'}
                  </h3>
                  <div className="flex gap-2">
                    <Button onClick={() => openUsersDialog('followers')} size="sm" variant="outline" className="text-xs font-bold h-8 rounded-lg">
                      Voir les Abonnés
                    </Button>
                    <Button onClick={() => openUsersDialog('following')} size="sm" variant="outline" className="text-xs font-bold h-8 rounded-lg">
                      Voir les Abonnements
                    </Button>
                  </div>
                </div>

                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Users className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Relations publiques</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Cliquez sur les boutons ci-dessus pour consulter la liste complète des abonnés et des abonnements de {targetUser.name || 'cet utilisateur'}.
                  </p>
                </div>
              </Card>
            )}

            {/* 4. PHOTOS TAB */}
            {activeTab === 'photos' && (
              <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs p-6">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
                  <ImageIcon className="h-4.5 w-4.5 text-indigo-500" />
                  Galerie photos ({galleryPosts.length})
                </h3>

                {galleryPosts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {galleryPosts.map((post) => (
                      <div
                        key={post.id}
                        className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer shadow-2xs hover:shadow-md transition-all duration-300"
                      >
                        <img
                          src={post.media_url || ''}
                          alt="Galerie photo"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-3 text-center transition-all duration-300">
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
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-slate-400 space-y-2">
                    <ImageIcon className="h-8 w-8 mx-auto text-slate-350 animate-pulse" />
                    <p className="text-sm font-semibold">Galerie photos vide</p>
                    <p className="text-xs">Aucune photo partagée par cet utilisateur.</p>
                  </div>
                )}
              </Card>
            )}

            {/* 5. REELS TAB */}
            {activeTab === 'reels' && (
              <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs p-6">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
                  <Video className="h-4.5 w-4.5 text-indigo-500" />
                  Publications vidéos ({videoPosts.length})
                </h3>

                {videoPosts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {videoPosts.map((post) => (
                      <div
                        key={post.id}
                        className="relative group aspect-[9/16] rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-xs hover:shadow-md transition-all duration-300"
                      >
                        <video
                          src={post.media_url || ''}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-3 text-white transition-opacity duration-300">
                          <p className="text-[10px] line-clamp-2 leading-snug">{post.content}</p>
                          <span className="text-[8px] text-white/60 mt-1" suppressHydrationWarning>
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center text-white">
                          <Play className="h-3 w-3 fill-white stroke-none ml-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-slate-400 space-y-2">
                    <Video className="h-8 w-8 mx-auto text-slate-355 animate-pulse" />
                    <p className="text-sm font-semibold">Aucun reel / vidéo disponible</p>
                    <p className="text-xs">Aucune vidéo partagée par cet utilisateur.</p>
                  </div>
                )}
              </Card>
            )}

          </div>
        </div>
      </AppShell>

      {/* Followers / Following List Dialog */}
      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="bg-white border-slate-200 rounded-[28px] text-slate-800 max-w-md shadow-2xl p-5 font-sans">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-black text-slate-800 flex items-center gap-2 select-none">
              <Users className="h-4.5 w-4.5 text-indigo-500" />
              {dialogType === 'followers' ? 'Abonnés' : 'Abonnements'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 max-h-[350px] overflow-y-auto pr-1 space-y-4">
            {loadingList ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                Chargement de la liste...
              </div>
            ) : usersList.length > 0 ? (
              <ul className="space-y-3.5">
                {usersList.map((item) => {
                  const isSelf = item.id === currentUser.id;
                  const profilePath = isSelf ? '/profile' : `/profile/${item.id}`;
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 group/dialog-item">
                      <Link
                        href={profilePath}
                        onClick={() => setDialogType(null)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="h-8.5 w-8.5 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 group-hover/dialog-item:border-indigo-300 transition-colors">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt={item.name || ''} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <User className="h-4.5 w-4.5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-750 group-hover/dialog-item:text-indigo-655 transition-colors truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{item.bio || 'Pas de biographie.'}</p>
                        </div>
                      </Link>

                      {!isSelf && (
                        <Button
                          onClick={() => handleListFollowToggle(item.id)}
                          type="button"
                          size="sm"
                          className={`h-7 px-3 text-[10px] font-bold rounded-lg transition-all duration-200 ${
                            item.is_following
                              ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200'
                              : 'bg-indigo-655 hover:bg-indigo-600 text-white'
                          }`}
                        >
                          {item.is_following ? 'Abonné' : 'Suivre'}
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
