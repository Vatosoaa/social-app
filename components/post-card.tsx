'use client';

import { useActionState, useState, useTransition } from 'react';
import { updatePost, deletePost } from '@/app/actions/posts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImageIcon, Loader2, MoreHorizontal, Pencil, Trash2, User, Video, X } from 'lucide-react';
import type { Post } from '@/lib/definitions';

interface PostCardProps {
  post: Post;
  currentUserId: number | null;
}

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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const isOwner = currentUserId === post.user_id;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Edit state
  const [editMediaUrl, setEditMediaUrl] = useState(post.media_url || '');
  const [editMediaType, setEditMediaType] = useState<'image' | 'video' | ''>(post.media_type || '');
  const [editMediaTab, setEditMediaTab] = useState<'image' | 'video' | null>(null);

  const [updateState, updateAction, updatePending] = useActionState(updatePost, undefined);

  const handleDelete = () => {
    startTransition(async () => {
      await deletePost(post.id);
      setDeleteConfirm(false);
    });
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
        setEditMediaUrl(reader.result);
        setEditMediaType(type);
        setEditMediaTab(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearEditMedia = () => {
    setEditMediaUrl('');
    setEditMediaType('');
    setEditMediaTab(null);
  };

  if (updateState?.success && editOpen) {
    setEditOpen(false);
  }

  return (
    <>
      <article className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md overflow-hidden transition-all duration-200 hover:border-zinc-700/80 hover:shadow-lg hover:shadow-violet-500/5">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
              {post.author_avatar ? (
                <img src={post.author_avatar} alt={post.author_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-zinc-500">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">{post.author_name || 'Utilisateur'}</p>
              <p className="text-xxs text-zinc-500">{formatRelativeTime(post.created_at)}</p>
            </div>
          </div>

          {/* Actions menu for post owner */}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-xl transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-900 border-zinc-800 text-zinc-200 rounded-xl shadow-xl w-36"
              >
                <DropdownMenuItem
                  className="gap-2 cursor-pointer hover:bg-zinc-800 rounded-lg text-sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5 text-violet-400" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer hover:bg-rose-950/30 rounded-lg text-sm text-rose-400"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Post Content */}
        {post.content && (
          <div className="px-5 pb-3">
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>
        )}

        {/* Media */}
        {post.media_url && (
          <div className="mt-2">
            {post.media_type === 'image' ? (
              <img
                src={post.media_url}
                alt="Média de la publication"
                className="w-full max-h-96 object-cover"
                loading="lazy"
              />
            ) : post.media_type === 'video' ? (
              <video
                src={post.media_url}
                controls
                className="w-full max-h-96 bg-black"
                preload="metadata"
              />
            ) : null}
          </div>
        )}

        {/* Footer spacer */}
        <div className="h-4" />
      </article>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 rounded-3xl text-zinc-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Modifier la publication
            </DialogTitle>
          </DialogHeader>

          <form action={updateAction} className="space-y-4">
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="media_url" value={editMediaUrl} />
            <input type="hidden" name="media_type" value={editMediaType} />

            <textarea
              name="content"
              rows={4}
              maxLength={1000}
              defaultValue={post.content || ''}
              placeholder="Modifiez votre texte..."
              className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:border-violet-500/60 transition-colors"
            />

            {updateState?.errors?.content && (
              <p className="text-rose-400 text-xs">{updateState.errors.content[0]}</p>
            )}

            {/* Media preview in edit mode */}
            {editMediaUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800/60">
                {editMediaType === 'image' ? (
                  <img src={editMediaUrl} alt="Aperçu" className="w-full h-48 object-cover" />
                ) : (
                  <video src={editMediaUrl} controls className="w-full h-48 bg-black" />
                )}
                <button
                  type="button"
                  onClick={clearEditMedia}
                  className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Media tab switcher */}
            {!editMediaUrl && (
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setEditMediaTab(editMediaTab === 'image' ? null : 'image')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${editMediaTab === 'image' ? 'border-violet-800/50 text-violet-400 bg-violet-950/30' : 'border-zinc-800 text-zinc-400 hover:text-violet-400'}`}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Photo
                </button>
                <button type="button"
                  onClick={() => setEditMediaTab(editMediaTab === 'video' ? null : 'video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${editMediaTab === 'video' ? 'border-cyan-800/50 text-cyan-400 bg-cyan-950/30' : 'border-zinc-800 text-zinc-400 hover:text-cyan-400'}`}
                >
                  <Video className="h-3.5 w-3.5" /> Vidéo
                </button>
              </div>
            )}

            {editMediaTab === 'image' && !editMediaUrl && (
              <div className="space-y-3 p-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_IMAGES.map((p) => (
                    <button key={p.url} type="button"
                      onClick={() => { setEditMediaUrl(p.url); setEditMediaType('image'); setEditMediaTab(null); }}
                      className="relative h-16 rounded-xl overflow-hidden border border-zinc-800 hover:border-violet-500 transition-all"
                    >
                      <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xxs text-center py-0.5">{p.label}</span>
                    </button>
                  ))}
                </div>
                <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl p-2.5 cursor-pointer hover:border-violet-500 transition-colors text-xs text-zinc-400">
                  <ImageIcon className="h-4 w-4" /> Uploader une image
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />
                </label>
              </div>
            )}

            {editMediaTab === 'video' && !editMediaUrl && (
              <div className="space-y-2 p-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
                {PRESET_VIDEOS.map((p) => (
                  <button key={p.url} type="button"
                    onClick={() => { setEditMediaUrl(p.url); setEditMediaType('video'); setEditMediaTab(null); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-zinc-800 hover:border-cyan-500 transition-all text-left"
                  >
                    <Video className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-zinc-300">{p.label}</span>
                  </button>
                ))}
                <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl p-2.5 cursor-pointer hover:border-cyan-500 transition-colors text-xs text-zinc-400">
                  <Video className="h-4 w-4" /> Uploader une vidéo
                  <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" />
                </label>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost"
                onClick={() => setEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updatePending}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl"
              >
                {updatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="bg-zinc-900 border-zinc-800 rounded-3xl text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100">Supprimer la publication ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">Cette action est irréversible. La publication sera définitivement effacée.</p>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost"
              onClick={() => setDeleteConfirm(false)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
