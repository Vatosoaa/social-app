'use client';

import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import { updateProfile, logout } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getFollowers, getFollowing, toggleFollow } from '@/app/actions/follows';
import type { FollowUser } from '@/app/actions/follows';
import { Camera, Image as ImageIcon, Loader2, LogOut, Sparkles, User, Users, Check } from 'lucide-react';

interface ProfileFormProps {
  user: {
    id: number;
    email: string;
    name: string;
    bio: string;
    avatar_url: string;
    followers_count: number;
    following_count: number;
  };
}

const PRESET_SEEDS = ['Jean', 'Marie', 'Thomas', 'Alex', 'Eva', 'Leo', 'Max', 'Luna'];

export default function ProfileForm({ user }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [charCount, setCharCount] = useState((user.bio || '').length);
  const [followingCount, setFollowingCount] = useState(user.following_count);
  const [dialogType, setDialogType] = useState<'followers' | 'following' | null>(null);
  const [usersList, setUsersList] = useState<FollowUser[]>([]);
  const [loadingList, setLoadingList] = useState(false);

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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('L image est trop lourde. Veuillez choisir une image de moins de 2 Mo.');
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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 font-sans text-zinc-100 overflow-hidden py-12 px-4">
      {/* Glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-pulse duration-3000" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none animate-pulse duration-3000" />

      <main className="relative z-10 w-full max-w-2xl space-y-6">
        {/* Header navigation bar */}
        <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md rounded-2xl p-4">
          <Link href="/">
            <Button variant="ghost" className="h-9 gap-1.5 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs">
              ← Retour au fil
            </Button>
          </Link>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              className="text-xs text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 rounded-xl transition-all"
            >
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </Button>
          </form>
        </div>

        {/* Profile Details Card */}
        <Card className="border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl shadow-2xl rounded-3xl transition-all duration-300 hover:border-zinc-700/80">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent select-none">
              Mon Profil
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm">
              Gérez vos informations de compte et votre apparence publique
            </CardDescription>

            {/* Followers / Following Stats */}
            <div className="flex items-center gap-4 pt-3 pb-1">
              <button
                type="button"
                onClick={() => openUsersDialog('followers')}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-violet-400 transition-colors"
              >
                <span className="font-bold text-zinc-200">{user.followers_count}</span> abonnés
              </button>
              <span className="h-3 w-[1px] bg-zinc-800" />
              <button
                type="button"
                onClick={() => openUsersDialog('following')}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-violet-400 transition-colors"
              >
                <span className="font-bold text-zinc-200">{followingCount}</span> abonnements
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Banner State Notification */}
            {state?.success && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 text-xs leading-relaxed animate-fade-in">
                {state.message}
              </div>
            )}
            {state?.message && !state?.success && (
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs leading-relaxed animate-fade-in">
                {state.message}
              </div>
            )}

            <form action={action} className="space-y-6">
              {/* Avatar Photo Section */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/40">
                <div className="relative group h-28 w-28 rounded-full overflow-hidden border-2 border-violet-500/50 flex-shrink-0 bg-zinc-900 shadow-md">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar utilisateur"
                      className="object-cover h-full w-full transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-zinc-500 bg-zinc-950">
                      <User className="h-12 w-12" />
                    </div>
                  )}
                  <label
                    htmlFor="avatar-file"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                  >
                    <Camera className="h-5 w-5 text-white mb-1" />
                    <span className="text-[10px] text-white font-semibold">Changer</span>
                  </label>
                  <input
                    type="file"
                    id="avatar-file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="space-y-3 w-full">
                  <div>
                    <Label className="text-xs font-semibold text-zinc-300">Avatar du profil</Label>
                    <p className="text-xxs text-zinc-500 mt-0.5">
                      Uploadez une image (max 2Mo) ou choisissez un avatar dessiné ci-dessous
                    </p>
                  </div>

                  {/* Preset avatar select grids */}
                  <div className="flex flex-wrap gap-2">
                    {PRESET_SEEDS.map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => selectPreset(seed)}
                        className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 hover:border-violet-500 focus:outline-none bg-zinc-900/60 p-0.5 transition-all active:scale-95"
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

                  {/* Avatar URL Input */}
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="URL d image personnalisée..."
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="pl-9 h-8 text-xs bg-zinc-950/60 border-zinc-800/80 rounded-lg text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-violet-500"
                    />
                  </div>
                </div>

                {/* Hidden Avatar input for Form submission */}
                <input type="hidden" name="avatar_url" value={avatarUrl} />
              </div>

              {/* Account Email (Read-only) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-400">Adresse e-mail (Non modifiable)</Label>
                <Input
                  type="email"
                  value={user.email}
                  disabled
                  className="h-11 bg-zinc-950/30 border-zinc-800/60 text-zinc-500 rounded-xl cursor-not-allowed font-mono text-xs"
                />
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-zinc-300">
                  Nom d utilisateur
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={user.name}
                    placeholder="Votre nom"
                    className="pl-10 h-11 bg-zinc-950/50 border-zinc-800/80 rounded-xl focus-visible:ring-violet-500 text-zinc-100"
                    required
                  />
                </div>
                {state?.errors?.name && (
                  <p className="text-rose-400 text-xxs font-medium mt-1 pl-1">
                    {state.errors.name[0]}
                  </p>
                )}
              </div>

              {/* Bio Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="bio" className="text-xs font-semibold text-zinc-300">
                    Biographie
                  </Label>
                  <span className={`text-xxs ${charCount > 200 ? 'text-rose-400' : 'text-zinc-500'}`}>
                    {charCount}/200
                  </span>
                </div>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  maxLength={200}
                  defaultValue={user.bio || ''}
                  onChange={(e) => setCharCount(e.target.value.length)}
                  placeholder="Dites-en un peu plus sur vous..."
                  className="w-full p-3.5 bg-zinc-950/50 border border-zinc-800/80 rounded-xl focus:border-violet-500 focus:outline-none text-zinc-100 placeholder:text-zinc-600 text-sm resize-none"
                />
                {state?.errors?.bio && (
                  <p className="text-rose-400 text-xxs font-medium mt-1 pl-1">
                    {state.errors.bio[0]}
                  </p>
                )}
              </div>

              {/* Submit Changes Button */}
              <Button
                disabled={pending}
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                {pending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" /> Enregistrer les modifications
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
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
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0 group-hover/dialog-item:border-violet-500/40 transition-colors">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt={item.name || ''} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-[10px] font-bold text-zinc-500">
                              {item.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-200 group-hover/dialog-item:text-violet-400 transition-colors truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-zinc-550 truncate">{item.bio || 'Pas de biographie.'}</p>
                        </div>
                      </Link>

                      {!isSelf && (
                        <Button
                          onClick={() => handleListFollowToggle(item.id)}
                          type="button"
                          size="sm"
                          className={`h-7 px-3 text-[10px] font-bold rounded-lg transition-all duration-200 ${
                            item.is_following
                              ? 'bg-zinc-800 hover:bg-rose-950/20 text-zinc-300 hover:text-rose-450 border border-zinc-700/60'
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
              <p className="text-xs text-zinc-550 text-center py-6">Aucun utilisateur trouvé.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
