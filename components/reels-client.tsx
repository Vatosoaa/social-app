'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX,
  Play, Pause, ChevronUp, ChevronDown, ArrowLeft, Plus, Music2,
  Send, X, Loader2, Radio,
} from 'lucide-react';
import type { Post } from '@/lib/definitions';
import type { DbUser } from '@/lib/session';
import { toggleReaction } from '@/app/actions/interactions';
import { addComment, getComments } from '@/app/actions/interactions';
import { toggleFavorite } from '@/app/actions/interactions';
import type { DbComment } from '@/lib/definitions';

interface ReelsClientProps {
  reels: Post[];
  currentUser: DbUser;
}

// ── Single reel video card ──────────────────────────────────────────────────
function ReelCard({
  reel,
  isActive,
  currentUser,
  onGoNext,
  onGoPrev,
  isFirst,
  isLast,
}: {
  reel: Post;
  isActive: boolean;
  currentUser: DbUser;
  onGoNext: () => void;
  onGoPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(reel.user_has_liked);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [bookmarked, setBookmarked] = useState(reel.user_has_favorited);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<DbComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Play / pause when active changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = 0;
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
      setShowComments(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    // Flash controls
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 1500);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * video.duration;
  };

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((p) => (newLiked ? p + 1 : Math.max(0, p - 1)));
    await toggleReaction(reel.id, 'like');
  };

  const handleBookmark = async () => {
    setBookmarked((p) => !p);
    await toggleFavorite(reel.id);
  };

  const openComments = async () => {
    setShowComments(true);
    setLoadingComments(true);
    const data = await getComments(reel.id);
    setComments(data);
    setLoadingComments(false);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSendingComment(true);
    const res = await addComment(reel.id, commentText.trim());
    if (res.success && res.comment) {
      setComments((p) => [...p, res.comment!]);
      setCommentText('');
    }
    setSendingComment(false);
  };

  const formattedCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex-shrink-0 snap-start snap-always">
      {/* Video — native or embedded (YouTube/Vimeo) */}
      {(() => {
        const url = reel.media_url || '';
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

        if (ytMatch) {
          return (
            <iframe
              src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=${isActive ? 1 : 0}&loop=1&mute=${isMuted ? 1 : 0}&playlist=${ytMatch[1]}&controls=0&rel=0&modestbranding=1`}
              className="absolute inset-0 w-full h-full pointer-events-none"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          );
        }

        if (vimeoMatch) {
          return (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${isActive ? 1 : 0}&loop=1&muted=${isMuted ? 1 : 0}&background=1`}
              className="absolute inset-0 w-full h-full pointer-events-none"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          );
        }

        // Native video file
        return (
          <video
            ref={videoRef}
            src={url}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            playsInline
            muted={isMuted}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
          />
        );
      })()}


      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* Play/Pause flash */}
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-5 rounded-full bg-black/40 backdrop-blur-sm animate-ping-once">
            {isPlaying ? <Play className="h-9 w-9 text-white fill-white" /> : <Pause className="h-9 w-9 text-white fill-white" />}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 pt-5 pb-3">
        {/* Back button */}
        <Link
          href="/"
          className="group flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white hover:bg-white/20 transition-all duration-200 shadow-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[11px] font-bold hidden sm:block">Accueil</span>
        </Link>

        {/* Title badge */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-full shadow-xl">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="text-white font-black text-sm tracking-widest uppercase select-none">Reels</span>
        </div>

        {/* Mute button */}
        <button
          onClick={() => setIsMuted((m) => !m)}
          className="p-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white hover:bg-white/20 transition-all duration-200 shadow-lg"
        >
          {isMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30 cursor-pointer"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-white transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Author info (bottom-left) */}
      <div className="absolute bottom-6 left-4 right-20 z-20 space-y-2 pointer-events-none">
        <Link href={reel.user_id === currentUser.id ? '/profile' : `/profile/${reel.user_id}`} className="pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white/60 bg-slate-800 flex-shrink-0">
              {reel.author_avatar ? (
                <img src={reel.author_avatar} alt={reel.author_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white/60 text-xs font-bold">
                  {reel.author_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none drop-shadow">{reel.author_name}</p>
              {reel.author_role && (
                <p className="text-white/60 text-[10px] mt-0.5">{reel.author_role}</p>
              )}
            </div>
          </div>
        </Link>

        {reel.content && (
          <p className="text-white/90 text-xs leading-relaxed line-clamp-2 drop-shadow pointer-events-auto">
            {reel.content}
          </p>
        )}

        {/* Audio bar visual */}
        <div className="flex items-center gap-1.5 pointer-events-none">
          <Music2 className="h-3.5 w-3.5 text-white/70 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="flex items-end gap-0.5 h-3.5">
            {[1, 1.5, 0.8, 1.2, 0.7, 1, 1.3].map((h, i) => (
              <div
                key={i}
                className="w-0.5 bg-white/60 rounded-full"
                style={{
                  height: `${h * 8}px`,
                  animation: isPlaying ? `musicBar 0.${5 + i}s ease-in-out infinite alternate` : 'none',
                }}
              />
            ))}
          </div>
          <span className="text-white/60 text-[10px]">Son original</span>
        </div>
      </div>

      {/* Action buttons (right side) */}
      <div className="absolute bottom-8 right-3 z-20 flex flex-col items-center gap-5">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <div className={`p-2.5 rounded-full transition-all duration-200 ${liked ? 'bg-rose-500/20' : 'bg-black/30 backdrop-blur-sm'} group-hover:scale-110`}>
            <Heart className={`h-6 w-6 ${liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'} transition-all`} />
          </div>
          <span className="text-white text-[10px] font-bold drop-shadow">{formattedCount(likesCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={openComments} className="flex flex-col items-center gap-1 group">
          <div className="p-2.5 rounded-full bg-black/30 backdrop-blur-sm group-hover:scale-110 transition-transform">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[10px] font-bold drop-shadow">{formattedCount(reel.comments_count)}</span>
        </button>

        {/* Save */}
        <button onClick={handleBookmark} className="flex flex-col items-center gap-1 group">
          <div className={`p-2.5 rounded-full transition-all duration-200 ${bookmarked ? 'bg-amber-500/20' : 'bg-black/30 backdrop-blur-sm'} group-hover:scale-110`}>
            <Bookmark className={`h-6 w-6 ${bookmarked ? 'fill-amber-400 text-amber-400' : 'text-white'} transition-all`} />
          </div>
          <span className="text-white text-[10px] font-bold drop-shadow">Sauv.</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1 group">
          <div className="p-2.5 rounded-full bg-black/30 backdrop-blur-sm group-hover:scale-110 transition-transform">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[10px] font-bold drop-shadow">Part.</span>
        </button>

        {/* Nav arrows */}
        {!isFirst && (
          <button onClick={onGoPrev} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronUp className="h-5 w-5 text-white" />
          </button>
        )}
        {!isLast && (
          <button onClick={onGoNext} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronDown className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-40 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-t-3xl max-h-[70%] flex flex-col border-t border-white/10">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10 flex-shrink-0">
            <span className="text-white font-bold text-sm">Commentaires</span>
            <button onClick={() => setShowComments(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white/70 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-white/50 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">Aucun commentaire. Soyez le premier! 💬</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                    {c.author_avatar ? (
                      <img src={c.author_avatar} alt={c.author_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/60 text-[10px] font-bold">
                        {c.author_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="bg-white/8 rounded-2xl px-3 py-2 flex-1">
                    <p className="text-white/80 text-[11px] font-bold mb-0.5">{c.author_name}</p>
                    <p className="text-white/70 text-xs leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <form onSubmit={handleSendComment} className="flex items-center gap-2 px-4 pb-5 pt-2 flex-shrink-0 border-t border-white/10">
            <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white/60 text-[10px] font-bold">
                  {currentUser.name?.charAt(0)}
                </div>
              )}
            </div>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="flex-1 bg-white/10 border border-white/15 text-white placeholder-white/40 text-xs rounded-full px-4 py-2 outline-none focus:border-indigo-400/60 transition-colors"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || sendingComment}
              className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all"
            >
              {sendingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Main Reels Feed ────────────────────────────────────────────────────────
export default function ReelsClient({ reels, currentUser }: ReelsClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    if (currentIndex < reels.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, reels.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  // Scroll to active reel
  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll('[data-reel]');
    cards?.[currentIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentIndex]);

  // Touch / wheel swipe
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 50) return;
    if (delta > 0) goNext();
    else goPrev();
  };

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 z-50">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Play className="h-10 w-10 text-white/30" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-white font-bold text-lg">Aucune vidéo disponible</h2>
          <p className="text-white/50 text-sm max-w-xs text-center">
            Publiez une vidéo depuis le fil d'actualité pour la voir apparaître ici.
          </p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au fil
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Global animation styles */}
      <style>{`
        @keyframes musicBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        @keyframes ping-once {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.6); }
        }
        .animate-ping-once { animation: ping-once 0.6s ease-out forwards; }
      `}</style>

      {/* Full-screen dark container */}
      <div
        className="fixed inset-0 bg-black z-50 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Reel cards container — vertical snap scroll */}
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: 'y mandatory' }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollTop / el.clientHeight);
            if (idx !== currentIndex) setCurrentIndex(idx);
          }}
        >
          {reels.map((reel, idx) => (
            <div
              key={reel.id}
              data-reel
              className="h-screen w-full relative snap-start snap-always flex-shrink-0"
            >
              <ReelCard
                reel={reel}
                isActive={idx === currentIndex}
                currentUser={currentUser}
                onGoNext={goNext}
                onGoPrev={goPrev}
                isFirst={idx === 0}
                isLast={idx === reels.length - 1}
              />
            </div>
          ))}
        </div>

        {/* Floating index dots */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 pointer-events-none">
          {reels.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'w-1.5 h-4 bg-white'
                  : 'w-1 h-1 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Upload & Live CTA */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
          {/* Publish video button */}
          <Link
            href="/"
            className="group relative flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white text-xs font-bold transition-all duration-200 shadow-2xl hover:scale-105 active:scale-95 overflow-hidden"
          >
            {/* Subtle shimmer on hover */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <div className="h-6 w-6 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span className="tracking-wide">Publier une vidéo</span>
          </Link>

          {/* Live button */}
          <Link
            href="/live"
            className="group relative flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-black tracking-wide transition-all duration-200 shadow-2xl shadow-rose-600/40 hover:shadow-rose-500/60 hover:scale-105 active:scale-95 overflow-hidden border border-rose-400/30"
          >
            {/* Glow sweep on hover */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            {/* Pulsing dot */}
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 animate-ping opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
            <Radio className="h-3.5 w-3.5" />
            <span>Démarrer un Live</span>
          </Link>
        </div>
      </div>
    </>
  );
}
