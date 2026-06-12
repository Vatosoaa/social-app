'use client';

import { useOptimistic, useRef, useState, useTransition } from 'react';
import { createPost } from '@/app/actions/posts';
import PostCard from '@/components/post-card';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2, SendHorizonal, Sparkles, Video, X, Bookmark } from 'lucide-react';
import type { Post } from '@/lib/definitions';
import type { DbUser } from '@/lib/session';

const PRESET_IMAGES = [
  { label: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Ville', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Code', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Mer', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Café', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Montagne', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=1000&auto=format&fit=crop' },
];

const PRESET_VIDEOS = [
  { label: 'Big Buck Bunny', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { label: 'Elephant Dream', url: 'https://www.w3schools.com/html/movie.mp4' },
];

interface PostsFeedProps {
  initialPosts: Post[];
  currentUser: DbUser;
  isFavoritesFilter?: boolean;
}

export default function PostsFeed({ initialPosts, currentUser, isFavoritesFilter }: PostsFeedProps) {
  // Optimistic list — updates immediately before server confirms
  const [optimisticPosts, addOptimisticPost] = useOptimistic(
    initialPosts,
    (state: Post[], newPost: Post) => [newPost, ...state]
  );

  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Form state
  const formRef = useRef<HTMLFormElement>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | ''>('');
  const [mediaTab, setMediaTab] = useState<'image' | 'video' | null>(null);
  const [charCount, setCharCount] = useState(0);

  const clearMedia = () => {
    setMediaUrl('');
    setMediaType('');
    setMediaTab(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Maximum 5 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
        setMediaType(type);
      }
    };
    reader.readAsDataURL(file);
  };

  // Form submission with instant optimistic update
  const handleFormAction = async (formData: FormData) => {
    const content = formData.get('content') as string;
    if (!content?.trim() && !mediaUrl) {
      setFormError('La publication doit avoir du texte ou un média.');
      return;
    }
    setFormError('');

    // Build the optimistic post object — shown instantly
    const optimisticPost: Post = {
      id: -Date.now(), // temp negative ID
      user_id: currentUser.id,
      content: content || null,
      media_url: mediaUrl || null,
      media_type: (mediaType as 'image' | 'video') || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_name: currentUser.name || 'Vous',
      author_avatar: currentUser.avatar_url || null,
      likes_count: 0,
      comments_count: 0,
      user_has_liked: false,
      user_has_favorited: false,
      user_reaction: null,
      reactions_by_type: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
    };

    // Reset form immediately for snappy UX
    formRef.current?.reset();
    setMediaUrl('');
    setMediaType('');
    setMediaTab(null);
    setCharCount(0);

    startTransition(async () => {
      addOptimisticPost(optimisticPost);
      const result = await createPost(undefined, formData);
      if (result?.message && !result.success) {
        setFormError(result.message);
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Title / Info bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">
            {isFavoritesFilter ? 'Publications favorites' : 'Fil d\'actualité'}
          </h2>
          <p className="text-xs text-zinc-500">
            {isFavoritesFilter ? 'Retrouvez ici toutes vos publications mises en favoris' : 'Découvrez et interagissez avec les dernières publications'}
          </p>
        </div>
        {isFavoritesFilter ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
            <Bookmark className="h-3.5 w-3.5" />
            Favoris
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            En direct
          </div>
        )}
      </div>

      {/* ─── Create post form ─── */}
      {!isFavoritesFilter && (
        <div className={`rounded-3xl bg-zinc-900/60 border backdrop-blur-xl p-5 space-y-4 transition-all duration-300 ${
          isFocused
            ? 'border-violet-500/40 shadow-lg shadow-violet-500/5 bg-zinc-900/70'
            : 'border-zinc-800/80'
        }`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-zinc-500 text-xs font-bold">
                {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <p className="text-sm font-semibold text-zinc-300">{currentUser.name}</p>
        </div>

        <form ref={formRef} action={handleFormAction} className="space-y-3">
          <input type="hidden" name="media_url" value={mediaUrl} />
          <input type="hidden" name="media_type" value={mediaType} />

          {/* Textarea */}
          <div className="relative">
            <textarea
              name="content"
              rows={3}
              maxLength={1000}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                setCharCount(e.target.value.length);
              }}
              placeholder="Quoi de neuf ? Partagez quelque chose avec la communauté..."
              className="w-full bg-zinc-950/40 border border-zinc-800/60 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <span className={`absolute bottom-3 right-3 text-xs ${charCount > 900 ? 'text-rose-400' : 'text-zinc-600'}`}>
              {charCount}/1000
            </span>
          </div>

          {formError && <p className="text-rose-400 text-xs pl-1">{formError}</p>}

          {/* Media preview */}
          {mediaUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800/60 max-h-64">
              {mediaType === 'image' ? (
                <img src={mediaUrl} alt="Aperçu" className="w-full h-64 object-cover" />
              ) : (
                <video src={mediaUrl} controls className="w-full h-64 object-cover bg-black" />
              )}
              <button type="button" onClick={clearMedia}
                className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Media tabs picker */}
          {!mediaUrl && mediaTab && (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-4 space-y-3">
              {mediaTab === 'image' && (
                <>
                  <p className="text-xs font-semibold text-zinc-400">Choisir une image</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_IMAGES.map((p) => (
                      <button key={p.url} type="button"
                        onClick={() => { setMediaUrl(p.url); setMediaType('image'); setMediaTab(null); }}
                        className="relative h-16 rounded-xl overflow-hidden border border-zinc-800 hover:border-violet-500 transition-all group">
                        <img src={p.url} alt={p.label} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl p-3 cursor-pointer hover:border-violet-500 transition-colors text-xs text-zinc-400 hover:text-violet-400">
                    <ImageIcon className="h-4 w-4" />
                    Choisir un fichier image
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />
                  </label>
                </>
              )}
              {mediaTab === 'video' && (
                <>
                  <p className="text-xs font-semibold text-zinc-400">Choisir une vidéo</p>
                  <div className="space-y-2">
                    {PRESET_VIDEOS.map((p) => (
                      <button key={p.url} type="button"
                        onClick={() => { setMediaUrl(p.url); setMediaType('video'); setMediaTab(null); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:border-violet-500 hover:bg-violet-950/10 transition-all text-left">
                        <div className="h-10 w-16 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                          <Video className="h-5 w-5 text-violet-400" />
                        </div>
                        <span className="text-sm text-zinc-300">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl p-3 cursor-pointer hover:border-violet-500 transition-colors text-xs text-zinc-400 hover:text-violet-400">
                    <Video className="h-4 w-4" />
                    Choisir un fichier vidéo
                    <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" />
                  </label>
                </>
              )}
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setMediaTab(mediaTab === 'image' ? null : 'image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  mediaTab === 'image'
                    ? 'bg-violet-950/40 text-violet-400 border border-violet-800/50'
                    : 'text-zinc-400 hover:text-violet-400 hover:bg-zinc-800/40 border border-transparent'
                }`}>
                <ImageIcon className="h-3.5 w-3.5" /> Photo
              </button>
              <button type="button"
                onClick={() => setMediaTab(mediaTab === 'video' ? null : 'video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  mediaTab === 'video'
                    ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/50'
                    : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/40 border border-transparent'
                }`}>
                <Video className="h-3.5 w-3.5" /> Vidéo
              </button>
            </div>

            <Button type="submit" disabled={isPending}
              className="h-9 px-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-violet-500/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Publier <SendHorizonal className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </div>
        </form>
        </div>
      )}

      {/* ─── Posts list ─── */}
      {optimisticPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-3xl border border-dashed border-zinc-800/60 text-zinc-500 gap-3">
          {isFavoritesFilter ? <Bookmark className="h-8 w-8 text-zinc-650" /> : <Sparkles className="h-8 w-8" />}
          <p className="text-sm">
            {isFavoritesFilter 
              ? 'Vous n\'avez pas encore enregistré de publication en favoris.' 
              : 'Aucune publication pour l\'instant. Soyez le premier à partager !'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {optimisticPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
