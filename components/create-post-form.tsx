'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPost } from '@/app/actions/posts';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2, SendHorizonal, Video, X, User } from 'lucide-react';
import type { DbUser } from '@/lib/session';
import { useAlert } from '@/components/providers/alert-provider';

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

interface CreatePostFormProps {
  currentUser: DbUser;
}

export default function CreatePostForm({ currentUser }: CreatePostFormProps) {
  const { showAlert } = useAlert();
  const [state, action, pending] = useActionState(createPost, undefined);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | ''>('');
  const [mediaTab, setMediaTab] = useState<'image' | 'video' | null>(null);
  const [charCount, setCharCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      await showAlert('Le fichier est trop volumineux. Maximum 5 Mo.');
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

  const clearMedia = () => {
    setMediaUrl('');
    setMediaType('');
    setMediaTab(null);
  };

  // Reset form after successful post — must be inside useEffect to avoid infinite re-render
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setMediaUrl('');
      setMediaType('');
      setMediaTab(null);
      setCharCount(0);
    }
  }, [state?.success]);

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-md border border-green-100/50 shadow-sm shadow-green-100/30 hover:shadow-md hover:border-green-100/60 hover:shadow-green-100/35 transition-all duration-300 p-5 space-y-4">
      {/* Author row */}
      <Link href="/profile" className="flex items-center gap-3 group/author cursor-pointer">
        <div className="h-10 w-10 rounded-full overflow-hidden border border-green-100 bg-green-50 flex-shrink-0 group-hover/author:border-green-400/50 transition-colors">
          {currentUser.avatar_url ? (
            <img src={currentUser.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-green-50 text-green-300">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-[#14532D] group-hover/author:text-[#22C55E] transition-colors">{currentUser.name}</p>
      </Link>

      <form ref={formRef} action={action} className="space-y-3">
        {/* Content textarea */}
        <div className="relative">
          <textarea
            name="content"
            rows={3}
            maxLength={1000}
            onChange={(e) => setCharCount(e.target.value.length)}
            placeholder="Quoi de neuf ? Partagez quelque chose avec la communauté..."
            className="w-full bg-[#F0FDF4] border border-green-100 rounded-2xl px-4 py-3 text-sm text-[#14532D] placeholder:text-[#86EFAC]/80 resize-none focus:outline-none focus:border-[#22C55E]/60 transition-colors"
          />
          <span className={`absolute bottom-3 right-3 text-xxs ${charCount > 900 ? 'text-rose-400' : 'text-[#86EFAC]'}`}>
            {charCount}/1000
          </span>
        </div>

        {/* Error display */}
        {state?.errors?.content && (
          <p className="text-rose-400 text-xs pl-1">{state.errors.content[0]}</p>
        )}

        {/* Media hidden inputs */}
        <input type="hidden" name="media_url" value={mediaUrl} />
        <input type="hidden" name="media_type" value={mediaType} />

        {/* Media preview */}
        {mediaUrl && (
          <div className="relative rounded-2xl overflow-hidden border border-green-100/60 max-h-64">
            {mediaType === 'image' ? (
              <img src={mediaUrl} alt="Aperçu" className="w-full h-64 object-cover" />
            ) : (
              <video src={mediaUrl} controls className="w-full h-64 object-cover bg-black" />
            )}
            <button
              type="button"
              onClick={clearMedia}
              className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Media picker tabs */}
        {!mediaUrl && mediaTab && (
          <div className="rounded-2xl border border-green-100/60 bg-[#F0FDF4] p-4 space-y-3">
            {mediaTab === 'image' && (
              <>
                <p className="text-xs font-semibold text-[#16A34A]">Choisir une image</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => { setMediaUrl(preset.url); setMediaType('image'); setMediaTab(null); }}
                      className="relative h-16 rounded-xl overflow-hidden border border-green-100 hover:border-[#22C55E] transition-all group"
                    >
                      <img src={preset.url} alt={preset.label} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      <span className="absolute bottom-0 left-0 right-0 bg-[#14532D]/60 text-white text-xxs text-center py-0.5">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-green-100" />
                  <span className="text-xxs text-[#86EFAC]">ou uploader</span>
                  <div className="flex-1 h-px bg-green-100" />
                </div>
                <label className="flex items-center justify-center gap-2 border border-dashed border-green-200 rounded-xl p-3 cursor-pointer hover:border-[#22C55E] transition-colors text-xs text-[#86EFAC] hover:text-[#16A34A]">
                  <ImageIcon className="h-4 w-4" />
                  Choisir un fichier image
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />
                </label>
              </>
            )}
            {mediaTab === 'video' && (
              <>
                <p className="text-xs font-semibold text-[#16A34A]">Choisir une vidéo</p>
                <div className="space-y-2">
                  {PRESET_VIDEOS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => { setMediaUrl(preset.url); setMediaType('video'); setMediaTab(null); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-green-100 hover:border-[#22C55E] hover:bg-green-50 transition-all text-left"
                    >
                      <div className="h-10 w-16 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
                        <Video className="h-5 w-5 text-[#22C55E]" />
                      </div>
                      <span className="text-sm text-[#14532D]">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-green-100" />
                  <span className="text-xxs text-[#86EFAC]">ou uploader</span>
                  <div className="flex-1 h-px bg-green-100" />
                </div>
                <label className="flex items-center justify-center gap-2 border border-dashed border-green-200 rounded-xl p-3 cursor-pointer hover:border-[#22C55E] transition-colors text-xs text-[#86EFAC] hover:text-[#16A34A]">
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
            <button
              type="button"
              onClick={() => setMediaTab(mediaTab === 'image' ? null : 'image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                mediaTab === 'image'
                  ? 'bg-green-50 text-[#16A34A] border border-green-200'
                  : 'text-[#86EFAC] hover:text-[#16A34A] hover:bg-green-50 border border-transparent'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Photo
            </button>
            <button
              type="button"
              onClick={() => setMediaTab(mediaTab === 'video' ? null : 'video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                mediaTab === 'video'
                  ? 'bg-green-50 text-[#16A34A] border border-green-200'
                  : 'text-[#86EFAC] hover:text-[#16A34A] hover:bg-green-50 border border-transparent'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              Vidéo
            </button>
          </div>

          <Button
            disabled={pending}
            type="submit"
            className="h-9 px-5 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803d] text-white font-semibold text-sm rounded-xl shadow-md shadow-green-500/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {pending ? (
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
  );
}
