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
  Mail, Laptop, Settings, Heart, Languages, GraduationCap, Phone, Home, Link2,
  Compass, Plus, Video, Calendar, Eye, Bookmark, Info, HelpCircle
} from 'lucide-react';
import { useAlert } from '@/components/providers/alert-provider';
import AppShell from '@/components/app-shell';
import type { DbUser } from '@/lib/session';
import type { Post } from '@/lib/definitions';
import PostCard from '@/components/post-card';
import AddStoryDialog from '@/components/add-story-dialog';

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
    gender_pronouns?: string;
    relationship_status?: string;
    languages?: string;
    job_title?: string;
    skills?: string;
    phone?: string;
    hometown?: string;
    website?: string;
    social_linkedin?: string;
    hobbies?: string;
    interests?: string;
    cover_url?: string;
  };
  posts: Post[];
}

const PRESET_SEEDS = ['Jean', 'Marie', 'Thomas', 'Alex', 'Eva', 'Leo', 'Max', 'Luna'];

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

export default function ProfileForm({ user, posts }: ProfileFormProps) {
  const { showAlert } = useAlert();
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const lastAlertedStateRef = useRef<any>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'timeline' | 'about' | 'friends' | 'photos' | 'reels'>('about');

  // Active section inside the "About" tab
  const [activeAboutSection, setActiveAboutSection] = useState<'personal' | 'journey' | 'contact' | 'interests'>('personal');

  // Edit dialog modal active sub-tab
  const [editModalTab, setEditModalTab] = useState<'identity' | 'personal' | 'journey' | 'contact' | 'interests'>('identity');

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

  // New fields
  const [genderPronouns, setGenderPronouns] = useState(user.gender_pronouns || '');
  const [relationshipStatus, setRelationshipStatus] = useState(user.relationship_status || '');
  const [languages, setLanguages] = useState(user.languages || '');
  const [jobTitle, setJobTitle] = useState(user.job_title || '');
  const [skills, setSkills] = useState(user.skills || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [hometown, setHometown] = useState(user.hometown || '');
  const [website, setWebsite] = useState(user.website || '');
  const [socialLinkedin, setSocialLinkedin] = useState(user.social_linkedin || '');
  const [hobbies, setHobbies] = useState(user.hobbies || '');
  const [interests, setInterests] = useState(user.interests || '');
  const [coverUrl, setCoverUrl] = useState(user.cover_url || '');

  const [charCount, setCharCount] = useState((user.bio || '').length);
  const [followingCount, setFollowingCount] = useState(user.following_count);
  const [dialogType, setDialogType] = useState<'followers' | 'following' | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
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

    setGenderPronouns(user.gender_pronouns || '');
    setRelationshipStatus(user.relationship_status || '');
    setLanguages(user.languages || '');
    setJobTitle(user.job_title || '');
    setSkills(user.skills || '');
    setPhone(user.phone || '');
    setHometown(user.hometown || '');
    setWebsite(user.website || '');
    setSocialLinkedin(user.social_linkedin || '');
    setHobbies(user.hobbies || '');
    setInterests(user.interests || '');
    setCoverUrl(user.cover_url || '');

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

  // Cover photo upload handler
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        await showAlert('La photo de couverture est trop lourde. Max 5 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCoverUrl(reader.result);
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

  const videoPosts = posts.filter(
    (post) => post.media_type === 'video' && post.media_url
  );

  return (
    <>
      <AppShell currentUser={user as DbUser}>
        <div className="max-w-5xl mx-auto w-full pb-16 font-sans">
          
          {/* Cover & Profile Header Card */}
          <div className="bg-white rounded-b-3xl border border-t-0 border-slate-200/80 shadow-sm overflow-hidden mb-6">
            {/* Cover Banner (Facebook style Cover photo) */}
            <div className="relative h-60 md:h-72 w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-slate-900 overflow-hidden group/cover">
              {coverUrl ? (
                <img
                  src={coverUrl}
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
              {/* Cover upload overlay button */}
              <label
                htmlFor="cover-file-input"
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-[11px] font-bold cursor-pointer opacity-0 group-hover/cover:opacity-100 transition-all duration-300 backdrop-blur-md shadow-lg border border-white/10"
              >
                <Camera className="h-3.5 w-3.5" />
                Changer la couverture
              </label>
              <input
                type="file"
                id="cover-file-input"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>

            {/* Profile Info Area */}
            <div className="px-6 md:px-10 pb-6 pt-4 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
              {/* Avatar Container overlapping cover */}
              <div className="relative -mt-24 md:-mt-28 h-36 w-36 md:h-44 md:w-44 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 shadow-xl flex-shrink-0 z-10 group/avatar">
                <div className="h-full w-full rounded-full overflow-hidden border-2 border-white bg-slate-50 relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="object-cover h-full w-full transition-transform duration-500 group-hover/avatar:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-350 bg-slate-50">
                      <User className="h-16 w-16" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalTab('identity');
                      setIsEditOpen(true);
                    }}
                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-xs cursor-pointer"
                  >
                    <Camera className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-bold tracking-wide uppercase">Modifier</span>
                  </button>
                </div>
              </div>

              {/* Name, stats and bio */}
              <div className="flex-1 text-center md:text-left z-1 mt-1 md:mt-0">
                <div className="flex flex-col md:flex-row md:items-center gap-2.5 mb-2 justify-center md:justify-start">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 justify-center md:justify-start">
                    {name || 'Utilisateur'}
                  </h1>
                  {role ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                      <Sparkles className="h-3 w-3" />
                      {role}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-slate-100 text-slate-550 border border-slate-200 px-2.5 py-0.5 rounded-full">
                      Membre Twinkly
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs text-slate-550 font-semibold mb-3">
                  <button
                    type="button"
                    onClick={() => openUsersDialog('followers')}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100 hover:border-indigo-200 hover:text-indigo-650 transition-all shadow-3xs cursor-pointer"
                  >
                    <span className="font-extrabold text-slate-850">{user.followers_count}</span>
                    <span className="text-[10px] text-slate-550">abonné(e)s</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openUsersDialog('following')}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100 hover:border-indigo-200 hover:text-indigo-650 transition-all shadow-3xs cursor-pointer"
                  >
                    <span className="font-extrabold text-slate-855">{followingCount}</span>
                    <span className="text-[10px] text-slate-550">abonnements</span>
                  </button>
                </div>

                {bio && (
                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-lg italic">
                    {bio}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 z-1 mt-2 md:mt-0 w-full md:w-auto justify-center">
                <Button
                  onClick={() => setIsStoryOpen(true)}
                  className="h-10 px-4.5 bg-gradient-to-r from-indigo-600 to-purple-650 hover:from-indigo-500 hover:to-purple-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter à la story
                </Button>
                <Button
                  onClick={() => {
                    setEditModalTab('identity');
                    setIsEditOpen(true);
                  }}
                  variant="outline"
                  className="h-10 px-4.5 bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 font-extrabold text-xs rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Modifier le profil
                </Button>
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
                          ? 'bg-white text-indigo-655 shadow-xs'
                          : 'text-slate-550 hover:text-slate-800 hover:bg-white/40'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-655' : 'text-slate-400'}`} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content Area based on Active Tab */}
          <div className="animate-in fade-in duration-300">
                    {/* 1. ABOUT TAB (Active by default) */}
            {activeTab === 'about' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Sidebar Menu */}
                <div className="md:col-span-1">
                  <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs overflow-hidden sticky top-6">
                    <CardHeader className="pb-3 border-b border-slate-100/80">
                      <CardTitle className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
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
                    
                    {/* A. PERSONAL INFO */}
                    {activeAboutSection === 'personal' && (
                      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 select-none uppercase tracking-wider">
                            <User className="h-4 w-4 text-indigo-500" />
                            Informations personnelles
                          </h3>
                          <button
                            onClick={() => { setEditModalTab('personal'); setIsEditOpen(true); }}
                            className="text-indigo-655 hover:text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/60 transition-all"
                          >
                            <Edit2 className="h-3 w-3" /> Modifier
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Bio block */}
                          <div className="sm:col-span-2 p-4.5 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-2 hover:bg-slate-50 transition-all duration-300">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Biographie</span>
                            <p className="text-xs text-slate-655 font-medium leading-relaxed italic">
                              {user.bio || 'Aucune biographie rédigée.'}
                            </p>
                          </div>

                          <InfoTile label="Genre / Pronoms" value={genderPronouns} icon={User} iconColor="text-indigo-500" bgColor="bg-indigo-50" />
                          <InfoTile 
                            label="Date de naissance" 
                            value={birthday ? new Date(birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined} 
                            icon={Calendar} 
                            iconColor="text-indigo-500" 
                            bgColor="bg-indigo-50" 
                          />
                          <InfoTile label="Situation relationnelle" value={relationshipStatus} icon={Heart} iconColor="text-rose-500" bgColor="bg-rose-55" />
                          <InfoTile label="Langues parlées" value={languages} icon={Languages} iconColor="text-indigo-500" bgColor="bg-indigo-50" />
                        </div>
                      </div>
                    )}

                    {/* B. JOURNEY (PARCOURS) */}
                    {activeAboutSection === 'journey' && (
                      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 select-none uppercase tracking-wider">
                            <GraduationCap className="h-4 w-4 text-purple-500" />
                            Parcours professionnel &amp; scolaire
                          </h3>
                          <button
                            onClick={() => { setEditModalTab('journey'); setIsEditOpen(true); }}
                            className="text-purple-600 hover:text-purple-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/60 transition-all"
                          >
                            <Edit2 className="h-3 w-3" /> Modifier
                          </button>
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
                                {jobTitle ? `${jobTitle}` : 'Poste non renseigné'}
                              </p>
                              {workplace && (
                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                  chez <span className="text-purple-600 font-bold">{workplace}</span>
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
                              {school || 'École / Université non renseignée'}
                            </p>
                          </div>

                          <div className="sm:col-span-2 p-4.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all duration-300 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                                <Award className="h-4 w-4" />
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compétences clés</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {skills ? (
                                skills.split(',').map((skill, idx) => {
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

                    {/* C. CONTACT INFO & LINKS */}
                    {activeAboutSection === 'contact' && (
                      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 select-none uppercase tracking-wider">
                            <Link2 className="h-4.5 w-4.5 text-emerald-500" />
                            Coordonnées &amp; Liens en ligne
                          </h3>
                          <button
                            onClick={() => { setEditModalTab('contact'); setIsEditOpen(true); }}
                            className="text-emerald-650 hover:text-emerald-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/60 transition-all"
                          >
                            <Edit2 className="h-3 w-3" /> Modifier
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InfoTile label="Téléphone" value={phone} icon={Phone} iconColor="text-emerald-500" bgColor="bg-emerald-50" />
                          <InfoTile label="Ville actuelle" value={cityRegion} icon={MapPin} iconColor="text-emerald-500" bgColor="bg-emerald-50" />
                          <InfoTile label="Ville d'origine" value={hometown} icon={Home} iconColor="text-emerald-500" bgColor="bg-emerald-50" />

                          {/* Site Web */}
                          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all duration-300 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-500">
                                <Globe className="h-4 w-4" />
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Web / Portfolio</span>
                            </div>
                            {website ? (
                              <a
                                href={website.startsWith('http') ? website : `https://${website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-650 hover:text-indigo-700 hover:underline font-extrabold text-xs flex items-center gap-1.5 pl-0.5 truncate"
                              >
                                {website}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-xs pl-0.5">Non renseigné</span>
                            )}
                          </div>

                          {/* Social Networks Connect */}
                          <div className="sm:col-span-2 space-y-3 pt-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-0.5">Réseaux sociaux connectés</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {/* LinkedIn */}
                              {socialLinkedin && (
                                <a
                                  href={socialLinkedin.startsWith('http') ? socialLinkedin : `https://${socialLinkedin}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-[#0A66C2]/15 bg-white text-slate-700 hover:text-[#0A66C2] hover:bg-[#0A66C2]/5 hover:border-[#0A66C2]/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <LinkedinIcon className="h-4.5 w-4.5 text-[#0A66C2]" />
                                  <span className="truncate">LinkedIn</span>
                                </a>
                              )}

                              {/* Youtube */}
                              {socialYoutube && (
                                <a
                                  href={socialYoutube.startsWith('http') ? socialYoutube : `https://${socialYoutube}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-[#FF0000]/15 bg-white text-slate-700 hover:text-[#FF0000] hover:bg-[#FF0000]/5 hover:border-[#FF0000]/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <YoutubeIcon className="h-4.5 w-4.5 text-[#FF0000]" />
                                  <span className="truncate">YouTube</span>
                                </a>
                              )}

                              {/* Instagram */}
                              {socialInstagram && (
                                <a
                                  href={socialInstagram.startsWith('http') ? socialInstagram : `https://${socialInstagram}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-[#E1306C]/15 bg-white text-slate-700 hover:text-[#E1306C] hover:bg-[#E1306C]/5 hover:border-[#E1306C]/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <InstagramIcon className="h-4.5 w-4.5 text-[#E1306C]" />
                                  <span className="truncate">Instagram</span>
                                </a>
                              )}

                              {/* TikTok */}
                              {socialTiktok && (
                                <a
                                  href={socialTiktok.startsWith('http') ? socialTiktok : `https://${socialTiktok}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-350 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <TikTokIcon className="h-4 w-4 text-black" />
                                  <span className="truncate">TikTok</span>
                                </a>
                              )}

                              {/* Facebook */}
                              {socialFacebook && (
                                <a
                                  href={socialFacebook.startsWith('http') ? socialFacebook : `https://${socialFacebook}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-[#1877F2]/15 bg-white text-slate-700 hover:text-[#1877F2] hover:bg-[#1877F2]/5 hover:border-[#1877F2]/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <FacebookIcon className="h-4.5 w-4.5 text-[#1877F2]" />
                                  <span className="truncate">Facebook</span>
                                </a>
                              )}

                              {/* Gmail */}
                              {socialGmail && (
                                <a
                                  href={socialGmail.includes('@') ? `mailto:${socialGmail}` : `mailto:${socialGmail}@gmail.com`}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-rose-500/15 bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-500/5 hover:border-rose-500/40 text-xs font-bold transition-all shadow-3xs"
                                >
                                  <Mail className="h-4.5 w-4.5 text-rose-500" />
                                  <span className="truncate">Gmail</span>
                                </a>
                              )}

                              {!socialYoutube && !socialInstagram && !socialTiktok && !socialFacebook && !socialGmail && !socialLinkedin && (
                                <span className="text-xs text-slate-400 italic pl-0.5 sm:col-span-3">Aucun réseau social connecté pour le moment.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* D. INTERESTS (CENTRES D'INTERET) */}
                    {activeAboutSection === 'interests' && (
                      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 select-none uppercase tracking-wider">
                            <Compass className="h-4 w-4 text-rose-500" />
                            Loisirs, Passions &amp; Centres d'intérêt
                          </h3>
                          <button
                            onClick={() => { setEditModalTab('interests'); setIsEditOpen(true); }}
                            className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/60 transition-all"
                          >
                            <Edit2 className="h-3 w-3" /> Modifier
                          </button>
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
                              {hobbies ? (
                                hobbies.split(',').map((item, idx) => {
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
                              {interests ? (
                                interests.split(',').map((item, idx) => {
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

            {/* 2. PUBLICATIONS / TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Quick summary info */}
                <div className="md:col-span-1 space-y-6">
                  {/* Quick details */}
                  <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs p-5 space-y-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Intro</h3>
                    <div className="space-y-3.5 text-xs text-slate-655 font-semibold">
                      {genderPronouns && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span>Genre / Pronoms : <strong className="text-slate-800">{genderPronouns}</strong></span>
                        </div>
                      )}
                      {cityRegion && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span>Habite à <strong className="text-slate-800">{cityRegion}</strong></span>
                        </div>
                      )}
                      {hometown && (
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span>De <strong className="text-slate-800">{hometown}</strong></span>
                        </div>
                      )}
                      {relationshipStatus && (
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-rose-500 fill-rose-500 flex-shrink-0" />
                          <span>Situation : <strong className="text-slate-800">{relationshipStatus}</strong></span>
                        </div>
                      )}
                      {website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-650 hover:underline">
                            {website}
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Photos Preview grid */}
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

                {/* Right Column: Publications Feed */}
                <div className="md:col-span-2 space-y-5">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <PostCard key={post.id} post={post} currentUser={user} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400 space-y-2">
                      <MessageSquare className="h-8 w-8 mx-auto text-slate-300 animate-pulse" />
                      <p className="text-sm font-semibold">Aucune publication</p>
                      <p className="text-xs text-slate-500">Vous n'avez pas encore publié d'actualité.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. FRIENDS / ABONNES TAB */}
            {activeTab === 'friends' && (
              <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs p-6 md:p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-indigo-500" />
                    Mes relations (Abonnements &amp; Abonnés)
                  </h3>
                  <div className="flex gap-2">
                    <Button onClick={() => openUsersDialog('followers')} size="sm" variant="outline" className="text-xs font-bold h-8 rounded-lg">
                      Gérer les Abonnés
                    </Button>
                    <Button onClick={() => openUsersDialog('following')} size="sm" variant="outline" className="text-xs font-bold h-8 rounded-lg">
                      Gérer les Abonnements
                    </Button>
                  </div>
                </div>

                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Users className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Gérez vos relations</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Cliquez sur les boutons ci-dessus pour afficher la liste complète de vos abonnés et abonnements et gérer vos abonnements.
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
                    <p className="text-xs">Les photos de vos publications s'afficheront automatiquement ici.</p>
                  </div>
                )}
              </Card>
            )}

            {/* 5. REELS TAB */}
            {activeTab === 'reels' && (
              <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs p-6">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
                  <Video className="h-4.5 w-4.5 text-indigo-500" />
                  Mes publications vidéos ({videoPosts.length})
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
                    <Video className="h-8 w-8 mx-auto text-slate-350 animate-pulse" />
                    <p className="text-sm font-semibold">Aucun reel / vidéo disponible</p>
                    <p className="text-xs">Vos publications contenant des vidéos s'afficheront ici.</p>
                  </div>
                )}
              </Card>
            )}

          </div>
        </div>
      </AppShell>

      {/* Edit Profile Dialog Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white border-slate-200 rounded-[28px] text-slate-800 max-w-2xl max-h-[85vh] overflow-hidden p-0 shadow-2xl font-sans flex flex-col">
          <DialogHeader className="p-5 border-b border-slate-100 flex-shrink-0 select-none">
            <DialogTitle className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              Modifier mon profil
            </DialogTitle>
          </DialogHeader>

          {/* Modal sub-navigation tabs */}
          <div className="px-5 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none bg-slate-50/80 py-2.5 flex-shrink-0">
            {[
              { id: 'identity', label: 'Identité & Bio' },
              { id: 'personal', label: 'Infos personnelles' },
              { id: 'journey', label: 'Parcours' },
              { id: 'contact', label: 'Coordonnées & Liens' },
              { id: 'interests', label: 'Intérêts' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditModalTab(t.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  editModalTab === t.id
                    ? 'bg-indigo-650 text-white shadow-xs'
                    : 'text-slate-550 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form action={action} className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 1. IDENTITY & BIO */}
            {editModalTab === 'identity' && (
              <div className="space-y-6">
                {/* Avatar section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                  <div className="relative group h-24 w-24 rounded-full overflow-hidden border-2 border-indigo-500 flex-shrink-0 bg-slate-100 shadow-md">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-100">
                        <User className="h-10 w-10" />
                      </div>
                    )}
                    <label
                      htmlFor="avatar-file"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                    >
                      <Camera className="h-5 w-5 text-white mb-1" />
                      <span className="text-[9px] text-white font-bold">Changer</span>
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
                      <Label className="text-xs font-black text-slate-700">Avatar de profil</Label>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Importez un fichier local (max 2Mo) ou sélectionnez un avatar rapide :
                      </p>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_SEEDS.map((seed) => (
                        <button
                          key={seed}
                          type="button"
                          onClick={() => selectPreset(seed)}
                          className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 hover:border-indigo-500 bg-white p-0.5 transition-all active:scale-90"
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

                    {/* Custom URL */}
                    <div className="relative">
                      <ImageIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="URL de l'image personnalisée..."
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <input type="hidden" name="avatar_url" value={avatarUrl} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-black text-slate-700">Nom d'utilisateur</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 text-slate-800 text-xs"
                      required
                    />
                    {state?.errors?.name && (
                      <p className="text-rose-500 text-[10px] pl-1 font-bold">{state.errors.name[0]}</p>
                    )}
                  </div>

                  {/* Email (Readonly) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black text-slate-400">Adresse e-mail (Non modifiable)</Label>
                    <Input
                      type="email"
                      value={user.email}
                      disabled
                      className="bg-slate-50 border-slate-200 text-slate-400 rounded-xl cursor-not-allowed text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Bio text */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="bio" className="text-xs font-black text-slate-700">Biographie courte</Label>
                    <span className={`text-[10px] font-bold ${charCount > 200 ? 'text-rose-500' : 'text-slate-400'}`}>{charCount}/200</span>
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
                    placeholder="Entrez une courte description visible sur votre profil..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800 placeholder:text-slate-400 text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {/* 2. PERSONAL DETAILS */}
            {editModalTab === 'personal' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Détails d'identité</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Genre / Pronoms */}
                  <div className="space-y-1.5">
                    <Label htmlFor="gender_pronouns" className="text-xs font-black text-slate-700">Genre / Pronoms</Label>
                    <Input
                      id="gender_pronouns"
                      name="gender_pronouns"
                      placeholder="ex: Il, Elle, Iel ou Il/Elle"
                      value={genderPronouns}
                      onChange={(e) => setGenderPronouns(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                    />
                  </div>

                  {/* Birthday */}
                  <div className="space-y-1.5">
                    <Label htmlFor="birthday" className="text-xs font-black text-slate-700">Date de naissance</Label>
                    <Input
                      id="birthday"
                      name="birthday"
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                    />
                  </div>

                  {/* Situation Amoureuse */}
                  <div className="space-y-1.5">
                    <Label htmlFor="relationship_status" className="text-xs font-black text-slate-700">Situation relationnelle</Label>
                    <select
                      id="relationship_status"
                      name="relationship_status"
                      value={relationshipStatus}
                      onChange={(e) => setRelationshipStatus(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-850"
                    >
                      <option value="">Sélectionner un statut...</option>
                      <option value="Célibataire">Célibataire</option>
                      <option value="En couple">En couple</option>
                      <option value="Fiancé(e)">Fiancé(e)</option>
                      <option value="Marié(e)">Marié(e)</option>
                      <option value="C'est compliqué">C'est compliqué</option>
                      <option value="Union libre">Union libre</option>
                    </select>
                  </div>

                  {/* Langues parlées */}
                  <div className="space-y-1.5">
                    <Label htmlFor="languages" className="text-xs font-black text-slate-700">Langues parlées</Label>
                    <Input
                      id="languages"
                      name="languages"
                      placeholder="ex: Français, Anglais, Espagnol"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. JOURNEY & EDUCATION */}
            {editModalTab === 'journey' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Études et Parcours professionnel</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Job Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="job_title" className="text-xs font-black text-slate-700">Poste actuel</Label>
                    <Input
                      id="job_title"
                      name="job_title"
                      placeholder="ex: Designer UI/UX, Producteur de musique"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                    />
                  </div>

                  {/* Workplace */}
                  <div className="space-y-1.5">
                    <Label htmlFor="workplace" className="text-xs font-black text-slate-700">Entreprise / Lieu de travail</Label>
                    <Input
                      id="workplace"
                      name="workplace"
                      placeholder="ex: Google France, Freelance"
                      value={workplace}
                      onChange={(e) => setWorkplace(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                    />
                  </div>

                  {/* School */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="school" className="text-xs font-black text-slate-700">Écoles &amp; Universités (Diplômes)</Label>
                    <Input
                      id="school"
                      name="school"
                      placeholder="ex: Université Paris-Sorbonne, Gobelins École de l'Image"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                    />
                  </div>

                  {/* Key Skills */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="skills" className="text-xs font-black text-slate-700">Compétences clés (séparées par des virgules)</Label>
                    <Input
                      id="skills"
                      name="skills"
                      placeholder="ex: UI/UX, Figma, Next.js, WordPress, Photoshop"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. CONTACTS & WEB LINKS */}
            {editModalTab === 'contact' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Coordonnées de contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Téléphone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-black text-slate-700">Téléphone de contact</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="ex: +33 6 12 34 56 78"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* Current City */}
                    <div className="space-y-1.5">
                      <Label htmlFor="city_region" className="text-xs font-black text-slate-700">Ville actuelle</Label>
                      <Input
                        id="city_region"
                        name="city_region"
                        placeholder="ex: Paris, France"
                        value={cityRegion}
                        onChange={(e) => setCityRegion(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* Hometown */}
                    <div className="space-y-1.5">
                      <Label htmlFor="hometown" className="text-xs font-black text-slate-700">Ville d'origine</Label>
                      <Input
                        id="hometown"
                        name="hometown"
                        placeholder="ex: Marseille, France"
                        value={hometown}
                        onChange={(e) => setHometown(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* Web link */}
                    <div className="space-y-1.5">
                      <Label htmlFor="website" className="text-xs font-black text-slate-700">Site Web / Portfolio</Label>
                      <Input
                        id="website"
                        name="website"
                        placeholder="https://votre-site.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Profils de réseaux sociaux</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* LinkedIn */}
                    <div className="space-y-1.5">
                      <Label htmlFor="social_linkedin" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <LinkedinIcon className="h-4 w-4 text-[#0A66C2]" /> LinkedIn URL
                      </Label>
                      <Input
                        id="social_linkedin"
                        name="social_linkedin"
                        placeholder="https://linkedin.com/in/votre_profil"
                        value={socialLinkedin}
                        onChange={(e) => setSocialLinkedin(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* Instagram */}
                    <div className="space-y-1.5">
                      <Label htmlFor="social_instagram" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <InstagramIcon className="h-4 w-4 text-pink-500" /> Instagram URL
                      </Label>
                      <Input
                        id="social_instagram"
                        name="social_instagram"
                        placeholder="https://instagram.com/votre_compte"
                        value={socialInstagram}
                        onChange={(e) => setSocialInstagram(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* YouTube */}
                    <div className="space-y-1.5">
                      <Label htmlFor="social_youtube" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <YoutubeIcon className="h-4 w-4 text-red-500" /> YouTube Channel URL
                      </Label>
                      <Input
                        id="social_youtube"
                        name="social_youtube"
                        placeholder="https://youtube.com/c/votre_chaine"
                        value={socialYoutube}
                        onChange={(e) => setSocialYoutube(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* TikTok */}
                    <div className="space-y-1.5">
                      <Label htmlFor="social_tiktok" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <TikTokIcon className="h-3.5 w-3.5 text-slate-900" /> TikTok URL
                      </Label>
                      <Input
                        id="social_tiktok"
                        name="social_tiktok"
                        placeholder="https://tiktok.com/@votre_compte"
                        value={socialTiktok}
                        onChange={(e) => setSocialTiktok(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* Facebook */}
                    <div className="space-y-1.5">
                      <Label htmlFor="social_facebook" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <FacebookIcon className="h-4 w-4 text-blue-600" /> Facebook URL
                      </Label>
                      <Input
                        id="social_facebook"
                        name="social_facebook"
                        placeholder="https://facebook.com/votre_profil"
                        value={socialFacebook}
                        onChange={(e) => setSocialFacebook(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* Gmail */}
                    <div className="space-y-1.5">
                      <Label htmlFor="social_gmail" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-rose-500" /> Adresse Gmail (Contact)
                      </Label>
                      <Input
                        id="social_gmail"
                        name="social_gmail"
                        placeholder="nom@gmail.com"
                        value={socialGmail}
                        onChange={(e) => setSocialGmail(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-slate-800 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. INTERESTS */}
            {editModalTab === 'interests' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Loisirs &amp; Centres d'intérêt</h4>
                <div className="space-y-4">
                  {/* Hobbies */}
                  <div className="space-y-1.5">
                    <Label htmlFor="hobbies" className="text-xs font-black text-slate-700">Loisirs &amp; Activités (séparés par des virgules)</Label>
                    <textarea
                      id="hobbies"
                      name="hobbies"
                      rows={3}
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      placeholder="ex: Photographie, Surf, Lecture, Randonnée, Cuisine"
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800 placeholder:text-slate-450 text-xs resize-none"
                    />
                  </div>

                  {/* Passions / Interests */}
                  <div className="space-y-1.5">
                    <Label htmlFor="interests" className="text-xs font-black text-slate-700">Centres d'intérêt / Passions (séparés par des virgules)</Label>
                    <textarea
                      id="interests"
                      name="interests"
                      rows={3}
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      placeholder="ex: Intelligence Artificielle, Mode, Design, Cinéma, Voyage"
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800 placeholder:text-slate-450 text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Always-present hidden fields (not editable in any tab) */}
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="experience_level" value={experienceLevel} />
            <input type="hidden" name="favorite_artists" value={favoriteArtists} />
            <input type="hidden" name="favorite_genre" value={favoriteGenre} />
            <input type="hidden" name="software_equipment" value={softwareEquipment} />
            <input type="hidden" name="music_mood" value={musicMood} />
            <input type="hidden" name="availability" value={availability} />
            <input type="hidden" name="badges" value={badges} />
            <input type="hidden" name="tags" value={tags} />
            <input type="hidden" name="cover_url" value={coverUrl} />

            {/* Identity tab fallbacks */}
            {editModalTab !== 'identity' && (
              <>
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="bio" value={bio} />
                <input type="hidden" name="avatar_url" value={avatarUrl} />
              </>
            )}

            {/* Personal tab fallbacks */}
            {editModalTab !== 'personal' && (
              <>
                <input type="hidden" name="gender_pronouns" value={genderPronouns} />
                <input type="hidden" name="relationship_status" value={relationshipStatus} />
                <input type="hidden" name="languages" value={languages} />
                <input type="hidden" name="birthday" value={birthday} />
              </>
            )}

            {/* Journey tab fallbacks */}
            {editModalTab !== 'journey' && (
              <>
                <input type="hidden" name="job_title" value={jobTitle} />
                <input type="hidden" name="skills" value={skills} />
                <input type="hidden" name="school" value={school} />
                <input type="hidden" name="workplace" value={workplace} />
              </>
            )}

            {/* Contact tab fallbacks */}
            {editModalTab !== 'contact' && (
              <>
                <input type="hidden" name="phone" value={phone} />
                <input type="hidden" name="city_region" value={cityRegion} />
                <input type="hidden" name="hometown" value={hometown} />
                <input type="hidden" name="website" value={website} />
                <input type="hidden" name="social_linkedin" value={socialLinkedin} />
                <input type="hidden" name="social_instagram" value={socialInstagram} />
                <input type="hidden" name="social_youtube" value={socialYoutube} />
                <input type="hidden" name="social_tiktok" value={socialTiktok} />
                <input type="hidden" name="social_facebook" value={socialFacebook} />
                <input type="hidden" name="social_gmail" value={socialGmail} />
              </>
            )}

            {/* Interests tab fallbacks */}
            {editModalTab !== 'interests' && (
              <>
                <input type="hidden" name="hobbies" value={hobbies} />
                <input type="hidden" name="interests" value={interests} />
              </>
            )}

            {/* Footer Buttons */}
            <DialogFooter className="gap-2 border-t border-slate-100 pt-4 mt-6 flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-450 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                disabled={pending}
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-xs"
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
                  const isSelf = item.id === user.id;
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
                          <p className="text-xs font-bold text-slate-750 group-hover/dialog-item:text-indigo-650 transition-colors truncate">
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
                              : 'bg-indigo-650 hover:bg-indigo-600 text-white'
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

      {/* Add Story Dialog Modal */}
      <AddStoryDialog
        isOpen={isStoryOpen}
        onClose={() => setIsStoryOpen(false)}
        currentUser={user as DbUser}
      />
    </>
  );
}
