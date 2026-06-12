'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { updatePost, deletePost } from '@/app/actions/posts';
import { Button } from '@/components/ui/button';
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
import {
  MessageCircle, Share2, Send, Bookmark, CornerDownRight,
  ImageIcon, Loader2, MoreHorizontal, Pencil, Trash2, User, Video, X,
} from 'lucide-react';
import type { Post, DbComment } from '@/lib/definitions';
import type { DbUser } from '@/lib/session';
import { toggleReaction, addComment, deleteComment, toggleFavorite, getComments } from '@/app/actions/interactions';

interface PostCardProps {
  post: Post;
  currentUser: DbUser | null;
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

const REACTIONS = [
  { type: 'like',  emoji: '👍', label: "J'aime",   color: 'text-blue-400'   },
  { type: 'love',  emoji: '❤️', label: "J'adore",  color: 'text-rose-400'   },
  { type: 'haha',  emoji: '😆', label: 'Haha',     color: 'text-amber-400'  },
  { type: 'wow',   emoji: '😮', label: 'Wow',      color: 'text-amber-400'  },
  { type: 'sad',   emoji: '😢', label: 'Triste',   color: 'text-cyan-400'   },
  { type: 'angry', emoji: '😡', label: 'Grrr',     color: 'text-orange-500' },
];

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

export default function PostCard({ post, currentUser }: PostCardProps) {
  const isOwner = currentUser?.id === post.user_id;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reaction states
  const [userReaction, setUserReaction] = useState<string | null>(post.user_reaction || null);
  const [reactions, setReactions] = useState(post.reactions_by_type || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 });
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [favorited, setFavorited] = useState(post.user_has_favorited || false);

  // Comments & Replies states
  const [showComments, setShowComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<DbComment[]>([]);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // Share notification
  const [showShareToast, setShowShareToast] = useState(false);

  // Edit media state
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

  const handleReaction = async (type: string) => {
    if (!currentUser) {
      alert('Vous devez être connecté pour réagir.');
      return;
    }
    setShowReactionPicker(false);
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    const prevReaction = userReaction;
    const prevReactions = { ...reactions };
    const newReaction = prevReaction === type ? null : type;

    setUserReaction(newReaction);
    setReactions((prev) => {
      const next = { ...prev } as Record<string, number>;
      if (prevReaction) next[prevReaction] = Math.max(0, (next[prevReaction] || 0) - 1);
      if (newReaction)  next[newReaction]  = ((next[newReaction] || 0) + 1);
      return next as typeof reactions;
    });

    const res = await toggleReaction(post.id, type as 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry');
    if (!res.success) {
      setUserReaction(prevReaction);
      setReactions(prevReactions);
      alert(res.message || 'Une erreur est survenue.');
    } else if (res.reactions) {
      setReactions(res.reactions);
      setUserReaction(res.user_reaction !== undefined ? res.user_reaction : newReaction);
    }
  };

  const handleReactionHoverEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (!showReactionPicker) {
      hoverTimerRef.current = setTimeout(() => {
        setShowReactionPicker(true);
      }, 400);
    }
  };

  const handleReactionHoverLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setShowReactionPicker(false);
    }, 600);
  };

  const handleFavorite = async () => {
    if (!currentUser) {
      alert('Vous devez être connecté pour enregistrer en favoris.');
      return;
    }
    const nextFav = !favorited;
    setFavorited(nextFav);

    const res = await toggleFavorite(post.id);
    if (!res.success) {
      setFavorited(!nextFav);
      alert(res.message || 'Une erreur est survenue.');
    }
  };

  const handleToggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);
    if (nextState) {
      setLoadingComments(true);
      try {
        const dbComments = await getComments(post.id);
        setComments(dbComments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;
    const text = commentText.trim();
    setCommentText('');

    const res = await addComment(post.id, text);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
    } else {
      alert(res.message || 'Impossible d enregistrer le commentaire.');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyText.trim() || !currentUser) return;
    const text = replyText.trim();
    setReplyText('');
    setActiveReplyId(null);

    const res = await addComment(post.id, text, parentId);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
    } else {
      alert(res.message || 'Impossible d enregistrer la réponse.');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    const res = await deleteComment(commentId);
    if (res.success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } else {
      alert(res.message || 'Une erreur est survenue.');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    navigator.clipboard.writeText(url);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  if (updateState?.success && editOpen) setEditOpen(false);

  const totalReactions = (Object.values(reactions) as number[]).reduce((a, b) => a + b, 0);
  const currentReaction = REACTIONS.find((r) => r.type === userReaction) || null;

  // Optimistic cards (negative id) get a "sending" shimmer
  const isOptimistic = post.id < 0;

  return (
    <>
      <article
        className={`group relative rounded-2xl overflow-hidden transition-all duration-300
          ${isOptimistic
            ? 'opacity-70 animate-pulse border border-zinc-800/40 bg-zinc-900/40'
            : 'bg-zinc-900/50 border border-zinc-800/60 hover:border-violet-500/20 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-0.5'
          } backdrop-blur-md`}
      >
        {/* Gradient top accent line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            {/* Avatar with ring glow */}
            <div className="relative flex-shrink-0">
              <div className="h-11 w-11 rounded-full overflow-hidden ring-2 ring-zinc-800 group-hover:ring-violet-500/30 transition-all duration-300 bg-zinc-950">
                {post.author_avatar ? (
                  <img src={post.author_avatar} alt={post.author_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40">
                    <User className="h-5 w-5 text-zinc-500" />
                  </div>
                )}
              </div>
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            </div>

            <div>
              <p className="text-sm font-bold text-zinc-100 leading-tight">
                {post.author_name || 'Utilisateur'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{formatRelativeTime(post.created_at)}</p>
            </div>
          </div>

          {/* Actions menu */}
          {isOwner && !isOptimistic && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-8 w-8 flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800/70 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-900/95 backdrop-blur-lg border-zinc-800 text-zinc-200 rounded-xl shadow-2xl shadow-black/40 w-38"
              >
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-sm rounded-lg"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5 text-violet-400" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-sm rounded-lg text-rose-400"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Text content */}
        {post.content && (
          <div className="px-5 pb-3">
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>
        )}

        {/* Media */}
        {post.media_url && (
          <div className="relative mt-1 overflow-hidden">
            {post.media_type === 'image' ? (
              <div className="relative">
                <img
                  src={post.media_url}
                  alt="Média"
                  className="w-full max-h-[480px] object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                  loading="lazy"
                />
                {/* Image gradient overlay bottom */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950/40 to-transparent pointer-events-none" />
              </div>
            ) : post.media_type === 'video' ? (
              <video
                src={post.media_url}
                controls
                className="w-full max-h-[480px] bg-black"
                preload="metadata"
              />
            ) : null}
          </div>
        )}

        {/* Reaction summary */}
        {!isOptimistic && totalReactions > 0 && (
          <div className="px-5 pt-2 pb-1 flex items-center gap-3 flex-wrap">
            {REACTIONS
              .filter((r) => (reactions as Record<string, number>)[r.type] > 0)
              .sort((a, b) => (reactions as Record<string, number>)[b.type] - (reactions as Record<string, number>)[a.type])
              .slice(0, 3)
              .map((r) => (
                <span key={r.type} className="flex items-center gap-1">
                  <span className="text-sm leading-none">{r.emoji}</span>
                  <span className="text-xs font-semibold text-zinc-300">{(reactions as Record<string, number>)[r.type]}</span>
                </span>
              ))}
            <span className="text-xs text-zinc-500 ml-auto">{totalReactions} réaction{totalReactions > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Reaction bar */}
        {!isOptimistic && (
          <div className="flex flex-col border-t border-zinc-800/40 mt-1 relative">
            <div className="flex items-center gap-1 px-4 py-2.5">
              {/* Reaction picker + main button */}
              <div
                className="relative"
                onMouseEnter={handleReactionHoverEnter}
                onMouseLeave={handleReactionHoverLeave}
              >
                {showReactionPicker && (
                  <div className="absolute -top-[52px] left-0 z-50 flex items-center gap-0.5 bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl px-2 py-1.5 shadow-2xl shadow-black/70 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    {REACTIONS.map((r) => (
                      <button
                        key={r.type}
                        onClick={() => handleReaction(r.type)}
                        title={r.label}
                        className={`text-xl leading-none px-1.5 py-1 rounded-xl transition-all duration-100 hover:scale-[1.4] hover:bg-zinc-800/60 ${
                          userReaction === r.type ? 'scale-[1.25] bg-zinc-800/50' : ''
                        }`}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleReaction(userReaction || 'like')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    userReaction
                      ? `${currentReaction?.color || 'text-blue-400'} bg-zinc-800/50 hover:bg-zinc-800/80`
                      : 'text-zinc-500 hover:text-blue-400 hover:bg-zinc-800/30'
                  }`}
                >
                  <span className="text-sm leading-none">{currentReaction?.emoji || '👍'}</span>
                  <span>{currentReaction?.label || "J'aime"}</span>
                </button>
              </div>

              {/* Comment */}
              <button
                onClick={handleToggleComments}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  showComments
                    ? 'text-cyan-400 bg-cyan-950/30 hover:bg-cyan-950/50'
                    : 'text-zinc-500 hover:text-cyan-400 hover:bg-cyan-950/20'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{comments.length}</span>
              </button>

              {/* Favorite/Bookmark */}
              <button
                onClick={handleFavorite}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  favorited
                    ? 'text-amber-400 bg-amber-950/30 hover:bg-amber-950/50'
                    : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-950/20'
                }`}
                title="Enregistrer en favoris"
              >
                <Bookmark className={`h-3.5 w-3.5 transition-all duration-200 ${favorited ? 'fill-amber-400' : ''}`} />
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-violet-400 hover:bg-violet-950/20 transition-all duration-200 ml-auto"
              >
                <Share2 className="h-3.5 w-3.5" />
                Partager
              </button>
            </div>

            {/* Share link copied notice toast */}
            {showShareToast && (
              <div className="absolute bottom-14 right-4 z-20 flex items-center gap-2 bg-zinc-950/90 border border-violet-500/30 text-zinc-200 px-4 py-2 rounded-2xl shadow-xl shadow-black/50 backdrop-blur-md text-[11px] font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                Lien de la publication copié ! 🔗
              </div>
            )}

            {/* Expandable Interactive Comments & Nested Replies */}
            {showComments && (
              <div className="border-t border-zinc-800/20 px-5 py-4 bg-zinc-950/20 space-y-4">
                {/* Comment Input Form */}
                {currentUser ? (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0 mt-0.5">
                      {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt={currentUser.name || 'User'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40 text-[10px] font-bold text-zinc-300">
                          {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleCommentSubmit} className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Écrire un commentaire..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/60 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="h-8 w-8 flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white rounded-xl disabled:opacity-40 disabled:hover:bg-violet-600 transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-550 text-center py-1 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                    Veuillez vous connecter pour participer à la discussion.
                  </p>
                )}

                {loadingComments ? (
                  <div className="flex items-center justify-center py-4 text-zinc-500 text-xs gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Chargement des commentaires...
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4 pt-1 max-h-[380px] overflow-y-auto pr-1">
                    {/* Top Level Comments */}
                    {comments.filter(c => !c.parent_comment_id).map((comment) => {
                      const replies = comments.filter(c => c.parent_comment_id === comment.id);
                      return (
                        <div key={comment.id} className="space-y-3">
                          {/* Parent Comment */}
                          <div className="flex items-start gap-3 text-xs">
                            <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0 mt-0.5">
                              {comment.author_avatar ? (
                                <img src={comment.author_avatar} alt={comment.author_name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-[9px] font-bold text-zinc-500">
                                  {comment.author_name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="bg-zinc-900/30 border border-zinc-850/60 rounded-2xl px-3.5 py-2">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-bold text-zinc-200">{comment.author_name}</span>
                                  <span className="text-[10px] text-zinc-550">{formatRelativeTime(comment.created_at)}</span>
                                </div>
                                <p className="text-zinc-300 leading-relaxed">{comment.content}</p>
                              </div>
                              {/* Reply & Delete actions */}
                              <div className="flex items-center gap-3 pl-2">
                                {currentUser && (
                                  <button
                                    onClick={() => {
                                      setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                                      setReplyText('');
                                    }}
                                    className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                      activeReplyId === comment.id ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-350'
                                    }`}
                                  >
                                    <CornerDownRight className="h-3 w-3" />
                                    Répondre
                                  </button>
                                )}
                                {currentUser?.id === comment.user_id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-400 transition-colors"
                                  >
                                    Supprimer
                                  </button>
                                )}
                              </div>

                              {/* Nested Reply Form */}
                              {activeReplyId === comment.id && currentUser && (
                                <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="flex gap-2 mt-2 pt-1 pl-2 animate-in fade-in duration-200">
                                  <input
                                    type="text"
                                    placeholder={`Répondre à ${comment.author_name}...`}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl px-3.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-550 focus:outline-none focus:border-violet-500/50"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    disabled={!replyText.trim()}
                                    className="h-7 px-3 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-semibold rounded-lg disabled:opacity-40 transition-colors"
                                  >
                                    Répondre
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>

                          {/* Nested Replies list */}
                          {replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3 pl-10 text-xs">
                              <div className="h-7 w-7 rounded-full overflow-hidden border border-zinc-850 bg-zinc-950 flex-shrink-0 mt-0.5">
                                {reply.author_avatar ? (
                                  <img src={reply.author_avatar} alt={reply.author_name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-[8px] font-bold text-zinc-500">
                                    {reply.author_name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl px-3.5 py-2">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-zinc-300">{reply.author_name}</span>
                                    <span className="text-[10px] text-zinc-550">{formatRelativeTime(reply.created_at)}</span>
                                  </div>
                                  <p className="text-zinc-350 leading-relaxed">{reply.content}</p>
                                </div>
                                {currentUser?.id === reply.user_id && (
                                  <div className="pl-2">
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-[10px] font-bold text-rose-500 hover:text-rose-400 transition-colors"
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 text-center py-2">Aucun commentaire pour l'instant. Soyez le premier !</p>
                )}
              </div>
            )}
          </div>
        )}
      </article>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800 rounded-3xl text-zinc-100 max-w-lg shadow-2xl shadow-black/60">
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
              className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:border-violet-500/60 transition-colors"
            />

            {updateState?.errors?.content && (
              <p className="text-rose-400 text-xs">{updateState.errors.content[0]}</p>
            )}

            {editMediaUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800/60">
                {editMediaType === 'image' ? (
                  <img src={editMediaUrl} alt="Aperçu" className="w-full h-48 object-cover" />
                ) : (
                  <video src={editMediaUrl} controls className="w-full h-48 bg-black" />
                )}
                <button type="button" onClick={() => { setEditMediaUrl(''); setEditMediaType(''); setEditMediaTab(null); }}
                  className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {!editMediaUrl && (
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setEditMediaTab(editMediaTab === 'image' ? null : 'image')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${editMediaTab === 'image' ? 'border-violet-700/60 text-violet-400 bg-violet-950/30' : 'border-zinc-800 text-zinc-400 hover:text-violet-400 hover:border-violet-800/40'}`}>
                  <ImageIcon className="h-3.5 w-3.5" /> Photo
                </button>
                <button type="button"
                  onClick={() => setEditMediaTab(editMediaTab === 'video' ? null : 'video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${editMediaTab === 'video' ? 'border-cyan-700/60 text-cyan-400 bg-cyan-950/30' : 'border-zinc-800 text-zinc-400 hover:text-cyan-400 hover:border-cyan-800/40'}`}>
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
                      className="relative h-16 rounded-xl overflow-hidden border border-zinc-800 hover:border-violet-500 transition-all group/img">
                      <img src={p.url} alt={p.label} className="h-full w-full object-cover group-hover/img:scale-105 transition-transform duration-200" />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">{p.label}</span>
                    </button>
                  ))}
                </div>
                <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl p-2.5 cursor-pointer hover:border-violet-500 transition-colors text-xs text-zinc-400">
                  <ImageIcon className="h-4 w-4" /> Uploader
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />
                </label>
              </div>
            )}

            {editMediaTab === 'video' && !editMediaUrl && (
              <div className="space-y-2 p-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
                {PRESET_VIDEOS.map((p) => (
                  <button key={p.url} type="button"
                    onClick={() => { setEditMediaUrl(p.url); setEditMediaType('video'); setEditMediaTab(null); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-zinc-800 hover:border-cyan-500 transition-all text-left">
                    <Video className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-zinc-300">{p.label}</span>
                  </button>
                ))}
                <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl p-2.5 cursor-pointer hover:border-cyan-500 transition-colors text-xs text-zinc-400">
                  <Video className="h-4 w-4" /> Uploader
                  <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" />
                </label>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost"
                onClick={() => setEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl">
                Annuler
              </Button>
              <Button type="submit" disabled={updatePending}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-md shadow-violet-500/20">
                {updatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800 rounded-3xl text-zinc-100 max-w-sm shadow-2xl shadow-black/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100">Supprimer la publication ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Cette action est irréversible. La publication et ses médias seront définitivement effacés.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost"
              onClick={() => setDeleteConfirm(false)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl">
              Annuler
            </Button>
            <Button type="button" disabled={isPending} onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-md shadow-rose-500/20">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '🗑 Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
