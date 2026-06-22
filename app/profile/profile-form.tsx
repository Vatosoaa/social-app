'use client';

import { useActionState, useState, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { updateProfile, logout } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getFollowers, getFollowing, toggleFollow } from '@/app/actions/follows';
import type { FollowUser } from '@/app/actions/follows';
import {
  Camera, Image as ImageIcon, Loader2, LogOut, Sparkles, User, Users, Check,
  Edit2, MapPin, Briefcase, Award, Hash, ExternalLink, Globe, Play, MessageSquare,
  Mail, Laptop, Settings
} from 'lucide-react';
import { useAlert } from '@/components/providers/alert-provider';
import AppShell from '@/components/app-shell';
import type { DbUser } from '@/lib/session';
import type { Post } from '@/lib/definitions';
import PostCard from '@/components/post-card';

// Custom SVG Brand Icons to avoid missing imports in this version of lucide-react
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

// Custom TikTok icon path SVG
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.97 1.2 2.27 2.03 3.71 2.37v3.87c-.89-.1-1.78-.36-2.61-.77-.83-.41-1.57-.99-2.16-1.72-.05 3.32-.01 6.64-.03 9.96-.06 1.48-.52 2.94-1.33 4.16-1.04 1.57-2.65 2.68-4.49 3.06-1.84.38-3.78.13-5.46-.72C3.96 23.6 2.6 22 1.94 20.15c-.65-1.84-.57-3.87.23-5.65.98-2.2 2.87-3.88 5.16-4.6v3.9c-1.12.35-2.07 1.15-2.58 2.21-.51 1.06-.52 2.3-.01 3.36.5 1.07 1.47 1.87 2.61 2.22 1.14.35 2.38.22 3.42-.36 1.05-.59 1.76-1.66 1.93-2.86.07-1.12.03-2.24.04-3.36V.02z" />
  </svg>
);

interface ProfileFormProps {
  user: {
    id: number;
    email: string;
    name: string;
    bio: string;
    avatar_url: string;
    followers_count: number;
    following_count: number;
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
    birthday?: string;
    school?: string;
    workplace?: string;
  };
  posts: Post[];
}

const PRESET_SEEDS = ['Jean', 'Marie', 'Thomas', 'Alex', 'Eva', 'Leo', 'Max', 'Luna'];

export default function ProfileForm({ user, posts }: ProfileFormProps) {
  const { showAlert } = useAlert();
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const lastAlertedStateRef = useRef<any>(null);
  
  // Controlled fields state variables
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [role, setRole] = useState(user.role || '');
  const [experienceLevel, setExperienceLevel] = useState(user.experience_level || '');
  const [favoriteArtists, setFavoriteArtists] = useState(user.favorite_artists || '');
  const [favoriteGenre, setFavoriteGenre] = useState(user.favorite_genre || '');
  const [softwareEquipment, setSoftwareEquipment] = useState(user.software_equipment || '');
  const [musicMood, setMusicMood] = useState(user.music_mood || '');
  const [cityRegion, setCityRegion] = useState(user.city_region || '');
  const [availability, setAvailability] = useState(user.availability || '');
  const [badges, setBadges] = useState(user.badges || '');
  const [tags, setTags] = useState(user.tags || '');
  const [socialYoutube, setSocialYoutube] = useState(user.social_youtube || '');
  const [socialInstagram, setSocialInstagram] = useState(user.social_instagram || '');
  const [socialTiktok, setSocialTiktok] = useState(user.social_tiktok || '');
  const [socialFacebook, setSocialFacebook] = useState(user.social_facebook || '');
  const [socialGmail, setSocialGmail] = useState(user.social_gmail || '');
  const [birthday, setBirthday] = useState(user.birthday || '');
  const [school, setSchool] = useState(user.school || '');
  const [workplace, setWorkplace] = useState(user.workplace || '');

  const [charCount, setCharCount] = useState((user.bio || '').length);
  const [followingCount, setFollowingCount] = useState(user.following_count);
  const [dialogType, setDialogType] = useState<'followers' | 'following' | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [usersList, setUsersList] = useState<FollowUser[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Sync state values when the database values or page props update
  useEffect(() => {
    setName(user.name || '');
    setBio(user.bio || '');
    setAvatarUrl(user.avatar_url || '');
    setRole(user.role || '');
    setExperienceLevel(user.experience_level || '');
    setFavoriteArtists(user.favorite_artists || '');
    setFavoriteGenre(user.favorite_genre || '');
    setSoftwareEquipment(user.software_equipment || '');
    setMusicMood(user.music_mood || '');
    setCityRegion(user.city_region || '');
    setAvailability(user.availability || '');
    setBadges(user.badges || '');
    setTags(user.tags || '');
    setSocialYoutube(user.social_youtube || '');
    setSocialInstagram(user.social_instagram || '');
    setSocialTiktok(user.social_tiktok || '');
    setSocialFacebook(user.social_facebook || '');
    setSocialGmail(user.social_gmail || '');
    setBirthday(user.birthday || '');
    setSchool(user.school || '');
    setWorkplace(user.workplace || '');
    setCharCount((user.bio || '').length);
    setFollowingCount(user.following_count);
  }, [user]);

  // Close modal when state returns success
  useEffect(() => {
    if (state?.success) {
      if (lastAlertedStateRef.current !== state) {
        lastAlertedStateRef.current = state;
        setIsEditOpen(false);
        showAlert('Profil mis à jour avec succès !');
      }
    } else {
      lastAlertedStateRef.current = null;
    }
  }, [state, showAlert]);

  const openUsersDialog = async (type: 'followers' | 'following') => {
    setDialogType(type);
    setLoadingList(true);
    try {
      const data = type === 'followers'
        ? await getFollowers(user.id)
        : await getFollowing(user.id);
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
      setFollowingCount((prev) => (res.following ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  // Read upload file as base64
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        await showAlert('L image est trop lourde. Veuillez choisir une image de moins de 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPreset = (seed: string) => {
    const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
    setAvatarUrl(url);
  };

  // Dynamic photo gallery: Filter posts with image media
  const galleryPosts = posts.filter(
    (post) =>
      post.media_type === 'image' &&
      post.media_url &&
      (post.media_url.startsWith('http') || post.media_url.startsWith('data:'))
  );

  return (
    <>
      <AppShell currentUser={user as DbUser}>
        <div className="space-y-10 max-w-4xl mx-auto w-full py-4">
          
          {/* Header Title */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">
                Profile
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">View all your profile details here.</p>
            </div>
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-655 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all active:scale-95 shadow-xs"
              type="button"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Options</span>
            </button>
          </div>

          {/* Banner State Notification */}
          {state?.success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs leading-relaxed animate-fade-in">
              {state.message}
            </div>
          )}
          {state?.message && !state?.success && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs leading-relaxed animate-fade-in">
              {state.message}
            </div>
          )}

        {/* Profile Card & Details Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel: Profile Avatar Card */}
          <div className="lg:col-span-1">
            <Card className="border-slate-200/60 bg-white shadow-xs rounded-[32px] overflow-hidden relative group/avatar-card">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
              <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-0.5">
                  {user.name || 'Utilisateur'}
                </h2>
                <span className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
                  {user.role || 'Premium User'}
                </span>

                {/* Avatar with thick grey border */}
                <div className="relative h-48 w-48 rounded-full overflow-hidden border-8 border-slate-100 bg-slate-50 shadow-md flex-shrink-0 mb-6">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || ''}
                      className="object-cover h-full w-full"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <User className="h-20 w-20" />
                    </div>
                  )}
                </div>

                {/* Edit profile button */}
                <Button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="w-full h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Edit2 className="h-4 w-4 text-blue-500" />
                  Modifier le profil
                </Button>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-6 mt-6 border-t border-slate-100 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => openUsersDialog('followers')}
                    className="flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <span className="font-extrabold text-slate-800 text-base leading-none">{user.followers_count}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">abonnés</span>
                  </button>
                  <span className="h-6 w-[1px] bg-slate-200" />
                  <button
                    type="button"
                    onClick={() => openUsersDialog('following')}
                    className="flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <span className="font-extrabold text-slate-800 text-base leading-none">{followingCount}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">abonnements</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Bio & other details & Social Media */}
          <div className="lg:col-span-2 flex flex-col space-y-6">
            
            {/* Bio & Details card */}
            <Card className="border-slate-200/60 bg-white shadow-xs rounded-[32px] flex-1 flex flex-col justify-between relative">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
              
              {/* Availability Indicator dot in top right */}
              <div className="absolute top-6 right-6">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${user.availability !== 'Not Available' ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${user.availability !== 'Not Available' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
              </div>

              <CardHeader className="pb-4 select-none">
                <CardTitle className="text-xl font-bold text-slate-800">
                  Bio & other details
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-8 flex-1">
                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  
                  {/* Role */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My Role</span>
                    <span className="text-slate-700 font-medium text-sm">{user.role || 'Beatmaker'}</span>
                  </div>

                  {/* Experience */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My Experience Level</span>
                    <span className="text-slate-700 font-medium text-sm">{user.experience_level || 'Intermediate'}</span>
                  </div>

                  {/* Artists */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My 3 Favorite Artists</span>
                    <span className="text-slate-700 font-medium text-sm">{user.favorite_artists || 'Ninho, Travis Scott, Metro Boomin'}</span>
                  </div>

                  {/* Genre */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My Favorite Music Genre</span>
                    <span className="text-slate-700 font-medium text-sm">{user.favorite_genre || 'Trap'}</span>
                  </div>

                  {/* Equipment */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">The Software or Equipment I Use</span>
                    <span className="text-slate-700 font-medium text-sm">{user.software_equipment || 'Ableton'}</span>
                  </div>

                  {/* Mood */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My Preferred Music Mood</span>
                    <span className="text-slate-700 font-medium text-sm">{user.music_mood || 'Melancholic'}</span>
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">My City or Region</span>
                    <span className="text-slate-700 font-medium text-sm">{user.city_region || 'California, USA'}</span>
                  </div>

                  {/* Availability */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Availability</span>
                    <div className="pt-0.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${user.availability !== 'Not Available' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-rose-50 border border-rose-100 text-rose-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.availability !== 'Not Available' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {user.availability || 'Available for Collaboration'}
                      </span>
                    </div>
                  </div>

                  {/* Birthday */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Date de naissance</span>
                    <span className="text-slate-700 font-medium text-sm">
                      {user.birthday ? new Date(user.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non renseignée'}
                    </span>
                  </div>

                  {/* School */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">École / Université</span>
                    <span className="text-slate-700 font-medium text-sm">{user.school || 'Non renseignée'}</span>
                  </div>

                  {/* Workplace */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Lieu de travail</span>
                    <span className="text-slate-700 font-medium text-sm">{user.workplace || 'Non renseigné'}</span>
                  </div>

                  {/* Badges */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Badges</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(user.badges || 'Top Collaborator').split(',').map((badge, idx) => {
                        const clean = badge.trim();
                        if (!clean) return null;
                        return (
                          <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 px-2.5 py-0.5 rounded-lg">
                            <Award className="h-3 w-3" />
                            {clean}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(user.tags || '#Drill, #Melancholic, #Rap-US').split(',').map((tag, idx) => {
                        const clean = tag.trim();
                        if (!clean) return null;
                        return (
                          <span key={idx} className="text-[10px] font-bold text-slate-600 bg-slate-55 border border-slate-200 px-2 py-0.5 rounded-md">
                            {clean.startsWith('#') ? clean : `#${clean}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* About me bio text */}
                <div className="pt-6 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Biographie / Description</span>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-xl italic">
                    {user.bio || 'Aucune biographie rédigée.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Social Media Card */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-[32px] p-6 relative">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 pl-1 select-none">
                Social Media
              </h3>
              <div className="flex flex-wrap gap-4 items-center">
                {/* Youtube */}
                {user.social_youtube ? (
                  <a
                    href={user.social_youtube.startsWith('http') ? user.social_youtube : `https://${user.social_youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-full bg-[#FF0000] hover:scale-110 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-red-500/10 transition-all duration-300"
                    title="YouTube"
                  >
                    <YoutubeIcon className="h-6 w-6" />
                  </a>
                ) : null}

                {/* Instagram */}
                {user.social_instagram ? (
                  <a
                    href={user.social_instagram.startsWith('http') ? user.social_instagram : `https://${user.social_instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#FFB900] via-[#FF007F] to-[#7F00FF] hover:scale-110 active:scale-95 flex items-center justify-center text-white shadow-lg transition-all duration-300"
                    title="Instagram"
                  >
                    <InstagramIcon className="h-6 w-6" />
                  </a>
                ) : null}

                {/* TikTok */}
                {user.social_tiktok ? (
                  <a
                    href={user.social_tiktok.startsWith('http') ? user.social_tiktok : `https://${user.social_tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-full bg-black border border-zinc-850 hover:scale-110 active:scale-95 flex items-center justify-center text-white shadow-lg transition-all duration-300"
                    title="TikTok"
                  >
                    <TikTokIcon className="h-5 w-5" />
                  </a>
                ) : null}

                {/* Facebook */}
                {user.social_facebook ? (
                  <a
                    href={user.social_facebook.startsWith('http') ? user.social_facebook : `https://${user.social_facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-full bg-[#1877F2] hover:scale-110 active:scale-95 flex items-center justify-center text-white shadow-lg transition-all duration-300"
                    title="Facebook"
                  >
                    <FacebookIcon className="h-6 w-6" />
                  </a>
                ) : null}

                {/* Gmail */}
                {user.social_gmail ? (
                  <a
                    href={user.social_gmail.includes('@') ? `mailto:${user.social_gmail}` : `mailto:${user.social_gmail}@gmail.com`}
                    className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-855 hover:scale-110 active:scale-95 flex items-center justify-center text-white transition-all duration-300"
                    title="Gmail"
                  >
                    <Mail className="h-6 w-6 text-rose-455" />
                  </a>
                ) : null}

                {/* Empty notice */}
                {!user.social_youtube && !user.social_instagram && !user.social_tiktok && !user.social_facebook && !user.social_gmail && (
                  <span className="text-xs text-zinc-550 italic">Aucun réseau social lié. Cliquez sur "Modifier le profil" pour en ajouter.</span>
                )}
              </div>
            </Card>

          </div>
        </div>

        {/* User Photo Gallery */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-450 uppercase tracking-wider pl-1 select-none">
            <ImageIcon className="h-4 w-4" />
            Galerie photos utilisateur ({galleryPosts.length})
          </div>

          {galleryPosts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {galleryPosts.map((post) => (
                <div
                  key={post.id}
                  className="relative group aspect-square rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-900/30 cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <img
                    src={post.media_url || ''}
                    alt="Galerie photo"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />
                  {/* Glassmorphic hover details */}
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-3 text-center transition-all duration-300">
                    <span className="p-2 rounded-full bg-white/10 text-white mb-2 scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="h-4 w-4 fill-white" />
                    </span>
                    <p className="text-[10px] text-zinc-200 line-clamp-2 px-1">
                      {post.content || 'Voir la publication'}
                    </p>
                    <span className="text-[9px] text-zinc-500 mt-1.5" suppressHydrationWarning>
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-slate-400 space-y-2">
              <ImageIcon className="h-8 w-8 mx-auto text-zinc-700 animate-pulse" />
              <p className="text-sm font-semibold">Galerie photos vide</p>
              <p className="text-xs text-zinc-650">Les photos de vos publications s'afficheront automatiquement ici.</p>
            </div>
          )}
        </div>

        {/* User's publications list */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-450 uppercase tracking-wider pl-1 select-none">
            <MessageSquare className="h-4 w-4" />
            Publications ({posts.length})
          </div>

          {posts.length > 0 ? (
            <div className="space-y-5 max-w-3xl mx-auto">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUser={user} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-slate-400 space-y-2 max-w-3xl mx-auto">
              <MessageSquare className="h-8 w-8 mx-auto text-zinc-700 animate-pulse" />
              <p className="text-sm font-semibold">Aucune publication</p>
              <p className="text-xs text-zinc-600">Vous n'avez pas encore publié d'actualité.</p>
            </div>
          )}
        </div>

        </div>
      </AppShell>

      {/* Edit Profile Dialog Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white border-slate-200 rounded-[32px] text-slate-800 max-w-2xl max-h-[85vh] overflow-y-auto pr-2 shadow-xl font-sans">
          <DialogHeader className="pb-3 border-b border-zinc-800/60 select-none">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
              <Settings className="h-5 w-5 text-violet-400" />
              Modifier mon profil
            </DialogTitle>
          </DialogHeader>

          <form action={action} className="space-y-6 pt-4">
            
            {/* Avatar Photo section */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-855">
              <div className="relative group h-24 w-24 rounded-full overflow-hidden border-2 border-violet-500/50 flex-shrink-0 bg-zinc-900 shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="object-cover h-full w-full transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-zinc-500 bg-zinc-950">
                    <User className="h-10 w-10" />
                  </div>
                )}
                <label
                  htmlFor="avatar-file"
                  className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                >
                  <Camera className="h-5 w-5 text-white mb-1" />
                  <span className="text-[9px] text-white font-semibold">Changer</span>
                </label>
                <input
                  type="file"
                  id="avatar-file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="space-y-2.5 w-full">
                <div>
                  <Label className="text-xs font-bold text-zinc-300">Avatar du profil</Label>
                  <p className="text-[10px] text-zinc-550">
                    Uploadez un fichier (max 2Mo) ou sélectionnez un avatar dessiné
                  </p>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SEEDS.map((seed) => (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => selectPreset(seed)}
                      className="h-7 w-7 rounded-full overflow-hidden border border-zinc-800 hover:border-violet-500 bg-zinc-950 p-0.5 transition-all active:scale-90"
                      title={`Preset ${seed}`}
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`}
                        alt={seed}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                {/* URL Input */}
                <div className="relative">
                  <ImageIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="URL d image personnalisée..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="pl-8 h-7 text-xs bg-zinc-950/60 border-zinc-800 rounded-lg text-zinc-350 placeholder:text-zinc-650 focus-visible:ring-violet-500"
                  />
                </div>
              </div>

              <input type="hidden" name="avatar_url" value={avatarUrl} />
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-zinc-400">Nom d'utilisateur</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-200"
                  required
                />
                {state?.errors?.name && (
                  <p className="text-rose-455 text-[10px] pl-1">{state.errors.name[0]}</p>
                )}
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-500">Adresse e-mail (Non modifiable)</Label>
                <Input
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-zinc-950/20 border-zinc-855 text-zinc-650 rounded-xl cursor-not-allowed text-xs font-mono"
                />
              </div>
            </div>

            {/* Bio details */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="bio" className="text-xs font-bold text-zinc-400">Biographie</Label>
                <span className={`text-[10px] ${charCount > 200 ? 'text-rose-400' : 'text-zinc-550'}`}>{charCount}/200</span>
              </div>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={200}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setCharCount(e.target.value.length);
                }}
                placeholder="Décrivez-vous en quelques mots..."
                className="w-full p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl focus:border-violet-500 focus:outline-none text-zinc-200 placeholder:text-zinc-650 text-xs resize-none"
              />
            </div>

            {/* Extra details card */}
            <div className="border-t border-zinc-800/60 pt-4 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-455 mb-3 select-none">DÉTAILS DU PROFIL</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-bold text-zinc-400">Rôle / Métier</Label>
                  <Input
                    id="role"
                    name="role"
                    placeholder="ex: Beatmaker, Guitariste, Chanteur"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Experience */}
                <div className="space-y-1.5">
                  <Label htmlFor="experience_level" className="text-xs font-bold text-zinc-400">Niveau d'expérience</Label>
                  <Input
                    id="experience_level"
                    name="experience_level"
                    placeholder="ex: Débutant, Intermédiaire, Pro"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Fav Artists */}
                <div className="space-y-1.5">
                  <Label htmlFor="favorite_artists" className="text-xs font-bold text-zinc-400">3 Artistes Favoris</Label>
                  <Input
                    id="favorite_artists"
                    name="favorite_artists"
                    placeholder="ex: Ninho, Travis Scott, Metro Boomin"
                    value={favoriteArtists}
                    onChange={(e) => setFavoriteArtists(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Genre */}
                <div className="space-y-1.5">
                  <Label htmlFor="favorite_genre" className="text-xs font-bold text-zinc-400">Genre musical préféré</Label>
                  <Input
                    id="favorite_genre"
                    name="favorite_genre"
                    placeholder="ex: Trap, Pop, Rock, Jazz"
                    value={favoriteGenre}
                    onChange={(e) => setFavoriteGenre(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Software */}
                <div className="space-y-1.5">
                  <Label htmlFor="software_equipment" className="text-xs font-bold text-zinc-400">Logiciels / Matériels utilisés</Label>
                  <Input
                    id="software_equipment"
                    name="software_equipment"
                    placeholder="ex: Ableton, FL Studio, MPC, Logic"
                    value={softwareEquipment}
                    onChange={(e) => setSoftwareEquipment(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Mood */}
                <div className="space-y-1.5">
                  <Label htmlFor="music_mood" className="text-xs font-bold text-zinc-400">Humeur / Ambiance musicale</Label>
                  <Input
                    id="music_mood"
                    name="music_mood"
                    placeholder="ex: Mélancolique, Énergique, Chill"
                    value={musicMood}
                    onChange={(e) => setMusicMood(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <Label htmlFor="city_region" className="text-xs font-bold text-zinc-400">Ville / Région</Label>
                  <Input
                    id="city_region"
                    name="city_region"
                    placeholder="ex: Paris, France ou California, USA"
                    value={cityRegion}
                    onChange={(e) => setCityRegion(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Availability */}
                <div className="space-y-1.5">
                  <Label htmlFor="availability" className="text-xs font-bold text-zinc-400">Statut de disponibilité</Label>
                  <Input
                    id="availability"
                    name="availability"
                    placeholder="ex: Disponible pour collaboration"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Badges */}
                <div className="space-y-1.5">
                  <Label htmlFor="badges" className="text-xs font-bold text-zinc-400">Badges (séparés par des virgules)</Label>
                  <Input
                    id="badges"
                    name="badges"
                    placeholder="ex: Top Collaborator, Premium User"
                    value={badges}
                    onChange={(e) => setBadges(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label htmlFor="tags" className="text-xs font-bold text-zinc-400">Tags (séparés par des virgules)</Label>
                  <Input
                    id="tags"
                    name="tags"
                    placeholder="ex: #Drill, #Rap-US, #Trap"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Birthday */}
                <div className="space-y-1.5">
                  <Label htmlFor="birthday" className="text-xs font-bold text-zinc-400">Date de naissance</Label>
                  <Input
                    id="birthday"
                    name="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* School */}
                <div className="space-y-1.5">
                  <Label htmlFor="school" className="text-xs font-bold text-zinc-400">École / Université</Label>
                  <Input
                    id="school"
                    name="school"
                    placeholder="ex: Université de la Sorbonne"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>

                {/* Workplace */}
                <div className="space-y-1.5">
                  <Label htmlFor="workplace" className="text-xs font-bold text-zinc-400">Lieu de travail</Label>
                  <Input
                    id="workplace"
                    name="workplace"
                    placeholder="ex: Google France"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-255 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="border-t border-zinc-800/60 pt-4 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-455 mb-3 select-none">RÉSEAUX SOCIAUX (LIENS)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* YouTube */}
                <div className="space-y-1.5">
                  <Label htmlFor="social_youtube" className="text-xs font-bold text-zinc-450 flex items-center gap-1.5">
                    <YoutubeIcon className="h-3.5 w-3.5 text-red-500" /> YouTube
                  </Label>
                  <Input
                    id="social_youtube"
                    name="social_youtube"
                    placeholder="https://youtube.com/c/votre_chaine"
                    value={socialYoutube}
                    onChange={(e) => setSocialYoutube(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-300 text-xs"
                  />
                </div>

                {/* Instagram */}
                <div className="space-y-1.5">
                  <Label htmlFor="social_instagram" className="text-xs font-bold text-zinc-450 flex items-center gap-1.5">
                    <InstagramIcon className="h-3.5 w-3.5 text-pink-400" /> Instagram
                  </Label>
                  <Input
                    id="social_instagram"
                    name="social_instagram"
                    placeholder="https://instagram.com/votre_compte"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-300 text-xs"
                  />
                </div>

                {/* TikTok */}
                <div className="space-y-1.5">
                  <Label htmlFor="social_tiktok" className="text-xs font-bold text-zinc-455 flex items-center gap-1.5">
                    <TikTokIcon className="h-3.5 w-3.5 text-white" /> TikTok
                  </Label>
                  <Input
                    id="social_tiktok"
                    name="social_tiktok"
                    placeholder="https://tiktok.com/@votre_compte"
                    value={socialTiktok}
                    onChange={(e) => setSocialTiktok(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-300 text-xs"
                  />
                </div>

                {/* Facebook */}
                <div className="space-y-1.5">
                  <Label htmlFor="social_facebook" className="text-xs font-bold text-zinc-450 flex items-center gap-1.5">
                    <FacebookIcon className="h-3.5 w-3.5 text-blue-500" /> Facebook
                  </Label>
                  <Input
                    id="social_facebook"
                    name="social_facebook"
                    placeholder="https://facebook.com/votre_profil"
                    value={socialFacebook}
                    onChange={(e) => setSocialFacebook(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-300 text-xs"
                  />
                </div>

                {/* Gmail */}
                <div className="space-y-1.5">
                  <Label htmlFor="social_gmail" className="text-xs font-bold text-zinc-450 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-rose-400" /> Adresse Gmail (Contact)
                  </Label>
                  <Input
                    id="social_gmail"
                    name="social_gmail"
                    placeholder="votre.adresse@gmail.com"
                    value={socialGmail}
                    onChange={(e) => setSocialGmail(e.target.value)}
                    className="bg-zinc-950/60 border-zinc-800 rounded-xl focus-visible:ring-violet-500 text-zinc-300 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <DialogFooter className="gap-2 border-t border-zinc-800/60 pt-4 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-455 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl"
              >
                Annuler
              </Button>
              <Button
                disabled={pending}
                type="submit"
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-200"
              >
                {pending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> Enregistrer les modifications
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Followers / Following List Dialog */}
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
                {usersList.map((item) => {
                  const isSelf = item.id === user.id;
                  const profilePath = isSelf ? '/profile' : `/profile/${item.id}`;
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 group/dialog-item">
                      <Link
                        href={profilePath}
                        onClick={() => setDialogType(null)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 group-hover/dialog-item:border-violet-300 transition-colors">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt={item.name || ''} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 group-hover/dialog-item:text-violet-600 transition-colors truncate">
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
                              : 'bg-violet-600 hover:bg-violet-500 text-white'
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
