'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
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
  MessageCircle, Share2, Send, Bookmark, CornerDownRight, Clock, Play, Plus,
  ImageIcon, Loader2, MoreHorizontal, Pencil, Trash2, User, Video, X,
} from 'lucide-react';
import type { Post, DbComment } from '@/lib/definitions';
import type { DbUser } from '@/lib/session';
import { toggleReaction, addComment, deleteComment, toggleFavorite, getComments } from '@/app/actions/interactions';
import { useAlert } from '@/components/providers/alert-provider';

function renderContentWithHashtags(content: string | null) {
  if (!content) return null;
  const parts = content.split(/(\s+)/);
  return parts.map((part, index) => {
    if (part.startsWith('#') && part.length > 1) {
      const cleanHashtag = part.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      return (
        <Link
          key={index}
          href={`/search?q=${encodeURIComponent(cleanHashtag)}`}
          className="text-violet-600 hover:text-violet-750 transition-colors hover:underline font-semibold"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
}


interface PostCardProps {
  post: Post;
  currentUser: DbUser | null;
  variant?: 'default' | 'dashboard';
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

const getReactionStyle = (type: string, isActive: boolean) => {
  switch (type) {
    case 'like':
      return {
        bg: isActive ? 'bg-blue-100 border-blue-200' : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50',
        text: 'text-blue-600',
        emoji: '👍',
      };
    case 'love':
      return {
        bg: isActive ? 'bg-rose-100 border-rose-200' : 'bg-rose-50/50 border-rose-100 hover:bg-rose-50',
        text: 'text-rose-600',
        emoji: '❤️',
      };
    case 'haha':
      return {
        bg: isActive ? 'bg-amber-100 border-amber-200' : 'bg-amber-50/50 border-amber-100 hover:bg-amber-50',
        text: 'text-amber-600',
        emoji: '😆',
      };
    case 'wow':
      return {
        bg: isActive ? 'bg-amber-100 border-amber-200' : 'bg-amber-50/50 border-amber-100 hover:bg-amber-50',
        text: 'text-amber-600',
        emoji: '😲',
      };
    case 'sad':
      return {
        bg: isActive ? 'bg-cyan-100 border-cyan-200' : 'bg-cyan-50/50 border-cyan-100 hover:bg-cyan-50',
        text: 'text-cyan-600',
        emoji: '😢',
      };
    case 'angry':
      return {
        bg: isActive ? 'bg-orange-100 border-orange-200' : 'bg-orange-50/50 border-orange-100 hover:bg-orange-50',
        text: 'text-orange-600',
        emoji: '😡',
      };
    default:
      return {
        bg: 'bg-slate-50 border-slate-200/50',
        text: 'text-slate-500',
        emoji: '👍',
      };
  }
};


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

export default function PostCard({ post, currentUser, variant = 'default' }: PostCardProps) {
  const { showAlert, showConfirm } = useAlert();
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
      await showAlert('Vous devez être connecté pour réagir.');
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
      await showAlert(res.message || 'Une erreur est survenue.');
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
      await showAlert('Vous devez être connecté pour enregistrer en favoris.');
      return;
    }
    const nextFav = !favorited;
    setFavorited(nextFav);

    const res = await toggleFavorite(post.id);
    if (!res.success) {
      setFavorited(!nextFav);
      await showAlert(res.message || 'Une erreur est survenue.');
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
      await showAlert(res.message || 'Impossible d enregistrer le commentaire.');
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
      await showAlert(res.message || 'Impossible d enregistrer la réponse.');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const confirmed = await showConfirm('Supprimer ce commentaire ?');
    if (!confirmed) return;
    const res = await deleteComment(commentId);
    if (res.success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } else {
      await showAlert(res.message || 'Une erreur est survenue.');
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
  if (variant === 'dashboard') {
    const date = new Date(post.created_at);
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = String(date.getDate()).padStart(2, '0');
    
    const textLines = post.content ? post.content.split('\n').filter(l => l.trim().length > 0) : [];
    const title = textLines[0] || "Mise à jour";
    const excerpt = textLines.slice(1).join('\n') || post.content || '';
    
    const formattedTime = date.toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

    const cardGradients = [
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-pink-500',
      'from-teal-400 to-emerald-500',
      'from-rose-400 to-orange-500',
    ];
    const gradient = cardGradients[Math.abs(post.id) % cardGradients.length];

    return (
      <>
        <article className="bg-white border border-slate-200/60 rounded-[20px] overflow-hidden p-3 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col md:flex-row gap-3 relative group w-full">
          
          {isOwner && !isOptimistic && (
            <div className="absolute top-3 right-3 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-700 rounded-xl shadow-lg w-32">
                  <DropdownMenuItem className="gap-2 cursor-pointer text-xs rounded-lg hover:bg-slate-50" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3 w-3 text-blue-500" /> Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer text-xs rounded-lg text-rose-500 hover:bg-rose-50" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Left: Compact Thumbnail/Media Area */}
          <div className="w-full md:w-40 h-44 md:h-48 flex-shrink-0 relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
            {post.media_url ? (
              post.media_type === 'video' ? (
                <video src={post.media_url} className="w-full h-full object-cover" muted loop preload="metadata" />
              ) : (
                <img src={post.media_url} className="w-full h-full object-cover" alt="" loading="lazy" />
              )
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} p-3 flex flex-col justify-between text-white`}>
                <span className="text-[9px] uppercase font-bold tracking-wider opacity-85">Update</span>
                <p className="text-[11px] font-bold leading-snug line-clamp-3">{post.content || "Twinkly Post"}</p>
                <span className="text-[8px] opacity-70">{formattedTime}</span>
              </div>
            )}
            
            {post.media_type === 'video' && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <span className="p-2.5 rounded-full bg-white/20 backdrop-blur-xs text-white">
                  <Play className="h-4 w-4 fill-white" />
                </span>
              </div>
            )}
          </div>

          {/* Right: Compact Info & Metadata */}
          <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
            <div>
              {/* Header: Date Badge & Title */}
              <div className="flex items-start gap-3">
                {/* Date Tag */}
                <div className="flex flex-col items-center justify-center bg-blue-50/50 text-blue-600 font-bold px-2 py-0.5 rounded-xl text-center flex-shrink-0 w-11 h-11 border border-blue-100">
                  <span className="text-[8px] uppercase tracking-wider text-blue-500 font-black leading-none">{month}</span>
                  <span className="text-base leading-tight mt-0.5 font-extrabold">{day}</span>
                </div>

                <div className="min-w-0 pr-8">
                  <h3 className="text-xs font-extrabold text-slate-800 tracking-tight leading-snug line-clamp-2">
                    {title}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {formattedTime}
                  </p>
                </div>
              </div>

              {/* Description Body */}
              {excerpt && (
                <p className="text-[11px] text-slate-500 leading-relaxed mt-2 font-medium whitespace-pre-wrap line-clamp-2">
                  {renderContentWithHashtags(excerpt)}
                </p>
              )}
            </div>

            {/* Author Profile and Footer Interactions */}
            <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
              {/* Author Row */}
              <Link href={isOwner ? '/profile' : `/profile/${post.user_id}`} className="flex items-center gap-2 group/author">
                <div className="relative h-6 w-6 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                  {post.author_avatar ? (
                    <img src={post.author_avatar} alt={post.author_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors leading-tight">
                    {post.author_name}
                  </p>
                </div>
              </Link>

              {/* Reaction summary row */}
              {!isOptimistic && totalReactions > 0 && (
                <div className="flex items-center gap-3 px-1 pt-1.5 pb-0.5">
                  {REACTIONS
                    .filter((r) => (reactions as Record<string, number>)[r.type] > 0)
                    .map((r) => {
                      const count = (reactions as Record<string, number>)[r.type] || 0;
                      return (
                        <span key={r.type} className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <span className="text-xs leading-none">{r.emoji}</span>
                          <span>{count}</span>
                        </span>
                      );
                    })}
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/80">
                <div className="flex items-center gap-1.5">
                  {/* Reaction Button (hover for picker) */}
                  <div className="relative" onMouseEnter={handleReactionHoverEnter} onMouseLeave={handleReactionHoverLeave}>
                    {showReactionPicker && (
                      <div className="absolute -top-[44px] left-0 z-50 flex items-center gap-0.5 bg-white border border-slate-200 rounded-2xl px-1.5 py-0.5 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-155">
                        {REACTIONS.map((r) => (
                          <button
                            key={r.type}
                            type="button"
                            onClick={() => handleReaction(r.type)}
                            title={r.label}
                            className={`text-base leading-none px-1 py-0.5 rounded-lg transition-all duration-100 hover:scale-[1.3] hover:bg-slate-55 ${
                              userReaction === r.type ? 'scale-[1.2] bg-slate-100' : ''
                            }`}
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleReaction(userReaction || 'like')}
                      className={`h-7 px-3 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 border transition-colors ${
                        userReaction 
                          ? 'bg-slate-100 border-slate-200/60 text-slate-800' 
                          : 'bg-slate-55 hover:bg-slate-100 border-transparent text-slate-500'
                      }`}
                    >
                      <span>{currentReaction?.emoji || '👍'}</span>
                      <span>{currentReaction?.label || "J'aime"}</span>
                    </button>
                  </div>

                  {/* Comment button */}
                  <button
                    type="button"
                    onClick={handleToggleComments}
                    className="h-7 px-2.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 bg-slate-55 hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{post.comments_count || 0}</span>
                  </button>

                  {/* Bookmark button */}
                  <button
                    type="button"
                    onClick={handleFavorite}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-all border ${
                      favorited
                        ? 'bg-amber-50 border-amber-250 text-amber-500'
                        : 'bg-slate-55 hover:bg-slate-100 border-transparent text-slate-400'
                    }`}
                    title="Enregistrer en favoris"
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${favorited ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleShare}
                  className="h-7 px-2.5 rounded-full flex items-center gap-1.5 bg-slate-55 hover:bg-slate-100 text-slate-500 font-bold border border-transparent transition-all text-[10px]"
                >
                  <Share2 className="h-3 w-3 text-slate-400" />
                  <span>Partager</span>
                </button>
              </div>
            </div>

            {showShareToast && (
              <div className="absolute bottom-14 right-3 z-20 flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-white px-3 py-1.5 rounded-xl shadow-md text-[9px] font-semibold">
                <span className="h-1.5 w-1.5 bg-blue-400 animate-pulse rounded-full" />
                Lien copié ! 🔗
              </div>
            )}

            {/* Light-Themed Comments Section */}
            {showComments && (
              <div className="border-t border-slate-100 px-1 py-3 bg-slate-50/20 space-y-3 mt-2">
                {currentUser ? (
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 mt-0.5">
                      {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="User" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleCommentSubmit} className="flex-1 flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Écrire un commentaire..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="h-6 px-2.5 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold rounded-lg disabled:opacity-40 transition-colors"
                      >
                        Envoyer
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 italic">Connectez-vous pour commenter.</p>
                )}

                {loadingComments ? (
                  <div className="flex items-center justify-center py-1 text-slate-400 text-[10px]">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500 mr-1.5" /> Chargement...
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-[9px] text-slate-400 italic">Aucun commentaire.</p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                    {comments.map((comment) => (
                      <div key={comment.id} className="text-[11px] space-y-0.5 bg-white border border-slate-100 p-2 rounded-xl shadow-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                            {comment.author_avatar ? (
                              <img src={comment.author_avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-slate-200 flex items-center justify-center text-slate-400">
                                <User className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-850">{comment.author_name}</span>
                            <span className="text-[8px] text-slate-400 ml-1.5">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-600 pl-6 leading-relaxed">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </article>

        {/* Edit and Delete Dialogs */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-2xl p-4 shadow-xl max-w-md">
            <DialogHeader className="pb-2 border-b border-slate-100">
              <DialogTitle className="text-xs font-extrabold text-slate-800">Modifier la publication</DialogTitle>
            </DialogHeader>
            <form action={updateAction} className="space-y-3 pt-2">
              <input type="hidden" name="post_id" value={post.id} />
              <textarea
                name="content"
                rows={3}
                defaultValue={post.content || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500/50"
                placeholder="Modifier le contenu..."
              />
              <DialogFooter className="gap-1.5">
                <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="h-8 text-xs rounded-lg text-slate-500">
                  Annuler
                </Button>
                <Button type="submit" disabled={updatePending} className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold px-3">
                  {updatePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-2xl p-4 shadow-xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-xs font-extrabold text-slate-800">Supprimer la publication ?</DialogTitle>
            </DialogHeader>
            <p className="text-[11px] text-slate-500 leading-relaxed">Cette action est irréversible. Êtes-vous sûr de vouloir supprimer ce post ?</p>
            <DialogFooter className="gap-1.5 pt-1">
              <Button type="button" variant="ghost" onClick={() => setDeleteConfirm(false)} className="h-8 text-xs rounded-lg text-slate-500">
                Annuler
              </Button>
              <Button type="button" onClick={handleDelete} disabled={isPending} className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold px-3">
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Supprimer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // DEFAULT THEME: Now white background, compact size, elegant design as requested
  return (
    <>
      <article
        className={`group relative rounded-2xl overflow-hidden transition-all duration-300 max-w-xl mx-auto w-full
          ${isOptimistic
            ? 'opacity-70 animate-pulse border border-zinc-200/40 bg-white/40'
            : 'bg-white border border-zinc-200/80 hover:border-violet-500/25 hover:shadow-xl hover:shadow-violet-550/5 hover:-translate-y-0.5'
          }`}
      >
        {/* Gradient top accent line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <Link
            href={isOwner ? '/profile' : `/profile/${post.user_id}`}
            className="flex items-center gap-2.5 group/author cursor-pointer"
          >
            {/* Avatar with ring glow */}
            <div className="relative flex-shrink-0">
              <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-zinc-100 group-hover/author:ring-violet-500/40 transition-all duration-300 bg-zinc-50">
                {post.author_avatar ? (
                  <img src={post.author_avatar} alt={post.author_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20">
                    <User className="h-4 w-4 text-zinc-400" />
                  </div>
                )}
              </div>
              {/* Online status dot */}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
            </div>

            <div>
              <p className="text-xs font-bold text-zinc-800 group-hover/author:text-violet-600 transition-colors leading-tight">
                {post.author_name || 'Utilisateur'}
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{formatRelativeTime(post.created_at)}</p>
            </div>
          </Link>

          {/* Actions menu */}
          {isOwner && !isOptimistic && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white border-zinc-200 text-zinc-800 rounded-xl shadow-lg w-32"
              >
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-xs rounded-lg"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3 w-3 text-violet-500" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-xs rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Text content */}
        {post.content && (
          <div className="px-4 pb-2">
            <p className="text-xs text-zinc-850 leading-relaxed whitespace-pre-wrap">{renderContentWithHashtags(post.content)}</p>
          </div>
        )}

        {/* Media (Reduced height as requested) */}
        {post.media_url && (
          <div className="relative mt-0.5 overflow-hidden">
            {post.media_type === 'image' ? (
              <div className="relative">
                <img
                  src={post.media_url}
                  alt="Média"
                  className="w-full max-h-[320px] object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                  loading="lazy"
                />
                {/* Image gradient overlay bottom */}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
              </div>
            ) : post.media_type === 'video' ? (
              <video
                src={post.media_url}
                controls
                className="w-full max-h-[320px] bg-black"
                preload="metadata"
              />
            ) : null}
          </div>
        )}

        {/* Reaction summary row — style Facebook */}
        {!isOptimistic && (totalReactions > 0 || post.comments_count > 0) && (
          <div className="px-4 pt-2 pb-1 flex items-center justify-between">
            {/* Left: emoji bubbles + total */}
            <div className="flex items-center gap-1.5">
              {REACTIONS
                .filter((r) => (reactions as Record<string, number>)[r.type] > 0)
                .sort((a, b) => (reactions as Record<string, number>)[b.type] - (reactions as Record<string, number>)[a.type])
                .slice(0, 3)
                .map((r) => (
                  <span
                    key={r.type}
                    className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-slate-100 border border-slate-200/60 text-xs leading-none shadow-xs -ml-1 first:ml-0"
                    title={r.label}
                  >
                    {r.emoji}
                  </span>
                ))}
              {totalReactions > 0 && (
                <span className="text-[10px] text-zinc-500 font-medium ml-0.5">{totalReactions}</span>
              )}
            </div>
            {/* Right: comment count */}
            {post.comments_count > 0 && (
              <button
                onClick={handleToggleComments}
                className="text-[10px] text-zinc-500 hover:text-zinc-800 hover:underline transition-colors"
              >
                {post.comments_count} commentaire{post.comments_count > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Action bar — compact design matching capture */}
        {!isOptimistic && (
          <div className="flex flex-col border-t border-slate-100 mt-0.5 relative">
            <div className="flex items-center px-3 py-1 gap-1.5">

              {/* Like button */}
              <div
                className="relative"
                onMouseEnter={handleReactionHoverEnter}
                onMouseLeave={handleReactionHoverLeave}
              >
                {showReactionPicker && (
                  <div className="absolute -top-[48px] left-0 z-50 flex items-center gap-0.5 bg-white border border-slate-200/80 rounded-2xl px-1.5 py-1 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-150">
                    {REACTIONS.map((r) => (
                      <button
                        key={r.type}
                        onClick={() => handleReaction(r.type)}
                        title={r.label}
                        className={`text-lg leading-none px-1 py-0.5 rounded-xl transition-all duration-100 hover:scale-[1.3] hover:bg-slate-100 ${
                          userReaction === r.type ? 'scale-[1.2] bg-slate-100' : ''
                        }`}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleReaction(userReaction || 'like')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 hover:bg-slate-50 ${
                    userReaction
                      ? `${currentReaction?.color || 'text-blue-650'}`
                      : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  <span className="text-sm leading-none">{currentReaction?.emoji || '👍'}</span>
                  <span>{currentReaction?.label || "J'aime"}</span>
                </button>
              </div>

              {/* Comment button */}
              <button
                onClick={handleToggleComments}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 hover:bg-slate-50 ${
                  showComments ? 'text-cyan-600' : 'text-slate-500 hover:text-cyan-600'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{post.comments_count || 0}</span>
              </button>

              {/* Bookmark button */}
              <button
                onClick={handleFavorite}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 hover:bg-slate-50 ${
                  favorited ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'
                }`}
                title="Enregistrer en favoris"
              >
                <Bookmark className={`h-3.5 w-3.5 ${favorited ? 'fill-amber-500' : ''}`} />
              </button>

              {/* Share button (pushed to the right) */}
              <button
                onClick={handleShare}
                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg text-slate-500 hover:text-violet-600 hover:bg-slate-50 transition-all duration-200"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Partager</span>
              </button>

            </div>

            {/* Share link copied notice toast */}
            {showShareToast && (
              <div className="absolute bottom-12 right-3 z-20 flex items-center gap-1.5 bg-white border border-violet-500/20 text-slate-800 px-3 py-1.5 rounded-xl shadow-md backdrop-blur-md text-[10px] font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="h-1 w-1 bg-violet-500 rounded-full animate-pulse" />
                Lien copié ! 🔗
              </div>
            )}

            {/* Expandable Comments list */}
            {showComments && (
              <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/40 space-y-3">
                {/* Input form */}
                {currentUser ? (
                  <div className="flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 mt-0.5">
                      {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="User" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-200 text-zinc-400">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleCommentSubmit} className="flex-1 flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Écrire un commentaire..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-500/40"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="h-7 px-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-40 transition-colors"
                      >
                        Envoyer
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-400 italic">Connectez-vous pour commenter.</p>
                )}

                {loadingComments ? (
                  <div className="flex items-center justify-center py-2 text-zinc-500 text-[10px] gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-violet-600" /> Chargement...
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-3 pt-1 max-h-[300px] overflow-y-auto pr-1">
                    {comments.filter(c => !c.parent_comment_id).map((comment) => {
                      const replies = comments.filter(c => c.parent_comment_id === comment.id);
                      return (
                        <div key={comment.id} className="space-y-2.5">
                          <div className="flex items-start gap-2.5 text-xs">
                            <Link href={currentUser?.id === comment.user_id ? "/profile" : `/profile/${comment.user_id}`}>
                              <div className="h-7 w-7 rounded-full overflow-hidden border border-zinc-200 bg-slate-100 flex-shrink-0 mt-0.5 cursor-pointer">
                                {comment.author_avatar ? (
                                  <img src={comment.author_avatar} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-slate-200 text-zinc-400">
                                    <User className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div className="flex-1 space-y-0.5">
                              <div className="bg-slate-50 border border-zinc-100 rounded-xl px-3 py-1.5">
                                <div className="flex items-center justify-between mb-0.5">
                                  <Link href={currentUser?.id === comment.user_id ? "/profile" : `/profile/${comment.user_id}`} className="font-bold text-zinc-800 hover:text-violet-650 cursor-pointer">
                                    {comment.author_name}
                                  </Link>
                                  <span className="text-[9px] text-zinc-400">{formatRelativeTime(comment.created_at)}</span>
                                </div>
                                <p className="text-zinc-700 leading-relaxed text-[11px] whitespace-pre-wrap">{renderContentWithHashtags(comment.content)}</p>
                              </div>
                              
                              <div className="flex items-center gap-3 pl-1.5">
                                {currentUser && (
                                  <button
                                    onClick={() => {
                                      setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                                      setReplyText('');
                                    }}
                                    className={`text-[9px] font-bold flex items-center gap-1 ${
                                      activeReplyId === comment.id ? 'text-violet-600' : 'text-zinc-400 hover:text-zinc-700'
                                    }`}
                                  >
                                    <CornerDownRight className="h-2.5 w-2.5" /> Répondre
                                  </button>
                                )}
                                {currentUser?.id === comment.user_id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-[9px] font-bold text-rose-500 hover:text-rose-600"
                                  >
                                    Supprimer
                                  </button>
                                )}
                              </div>

                              {activeReplyId === comment.id && currentUser && (
                                <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="flex gap-1.5 mt-1.5 pt-1 pl-1.5">
                                  <input
                                    type="text"
                                    placeholder={`Répondre à ${comment.author_name}...`}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="flex-1 bg-white border border-zinc-200 rounded-lg px-2.5 py-0.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    disabled={!replyText.trim()}
                                    className="h-6 px-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-semibold rounded-md disabled:opacity-40"
                                  >
                                    Répondre
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>

                          {replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2.5 pl-8 text-xs">
                              <Link href={currentUser?.id === reply.user_id ? "/profile" : `/profile/${reply.user_id}`}>
                                <div className="h-6 w-6 rounded-full overflow-hidden border border-zinc-200 bg-slate-100 flex-shrink-0 mt-0.5 cursor-pointer">
                                  {reply.author_avatar ? (
                                    <img src={reply.author_avatar} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-slate-200 text-zinc-400">
                                      <User className="h-2.5 w-2.5" />
                                    </div>
                                  )}
                                </div>
                              </Link>
                              <div className="flex-1 space-y-0.5">
                                <div className="bg-slate-100/60 border border-zinc-100 rounded-xl px-3 py-1.5">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <Link href={currentUser?.id === reply.user_id ? "/profile" : `/profile/${reply.user_id}`} className="font-bold text-zinc-800 hover:text-violet-650 cursor-pointer">
                                      {reply.author_name}
                                    </Link>
                                    <span className="text-[9px] text-zinc-400">{formatRelativeTime(reply.created_at)}</span>
                                  </div>
                                  <p className="text-zinc-650 text-[11px] leading-relaxed whitespace-pre-wrap">{renderContentWithHashtags(reply.content)}</p>
                                </div>
                                {currentUser?.id === reply.user_id && (
                                  <div className="pl-1.5">
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-[9px] font-bold text-rose-500 hover:text-rose-600"
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
                  <p className="text-[10px] text-zinc-400 text-center py-1">Aucun commentaire.</p>
                )}
              </div>
            )}
          </div>
        )}
      </article>

      {/* Edit and Delete Dialogs */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white border-zinc-200 rounded-3xl text-zinc-800 max-w-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
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
              className="w-full bg-slate-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-500/40 transition-colors"
            />

            {updateState?.errors?.content && (
              <p className="text-rose-600 text-xs">{updateState.errors.content[0]}</p>
            )}

            {editMediaUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-200">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${editMediaTab === 'image' ? 'border-violet-500/40 text-violet-600 bg-violet-50' : 'border-zinc-200 text-zinc-550 hover:text-violet-600'}`}>
                  <ImageIcon className="h-3.5 w-3.5" /> Photo
                </button>
                <button type="button"
                  onClick={() => setEditMediaTab(editMediaTab === 'video' ? null : 'video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${editMediaTab === 'video' ? 'border-cyan-500/40 text-cyan-600 bg-cyan-50' : 'border-zinc-200 text-zinc-550 hover:text-cyan-600'}`}>
                  <Video className="h-3.5 w-3.5" /> Vidéo
                </button>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost"
                onClick={() => setEditOpen(false)}
                className="text-zinc-500 hover:text-zinc-800 hover:bg-slate-100 rounded-xl">
                Annuler
              </Button>
              <Button type="submit" disabled={updatePending}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-md shadow-violet-550/20">
                {updatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="bg-white border-zinc-200 rounded-3xl text-zinc-800 max-w-sm shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-800">Supprimer la publication ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Cette action est irréversible. La publication et ses médias seront définitivement effacés.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost"
              onClick={() => setDeleteConfirm(false)}
              className="text-zinc-500 hover:text-zinc-800 hover:bg-slate-100 rounded-xl">
              Annuler
            </Button>
            <Button type="button" disabled={isPending} onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-md shadow-rose-550/20">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '🗑 Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
