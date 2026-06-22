'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX, Plus, Send, User, Trash2 } from 'lucide-react';
import type { UserStoryGroup } from '@/lib/definitions';
import type { DbUser } from '@/lib/session';
import { markStoryAsViewed } from '@/app/actions/stories';
import { useAlert } from '@/components/providers/alert-provider';

interface StoryViewerProps {
  activeGroup: UserStoryGroup;
  groups: UserStoryGroup[];
  onSelectGroup: (group: UserStoryGroup) => void;
  currentUser: DbUser | null;
  onClose: () => void;
  onNextUser?: () => void;
  onPrevUser?: () => void;
  onStoryViewed?: (storyId: number) => void;
  onAddStoryClick: () => void;
  onDeleteStory?: (storyId: number) => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({
  activeGroup,
  groups,
  onSelectGroup,
  currentUser,
  onClose,
  onNextUser,
  onPrevUser,
  onStoryViewed,
  onAddStoryClick,
  onDeleteStory,
}: StoryViewerProps) {
  const { showAlert } = useAlert();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; char: string; left: number }[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const storyAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  // Tracks progress value without needing functional setState (avoids calling handleNext inside a state updater)
  const progressRef = useRef(0);

  const currentStory = activeGroup.stories[currentIndex];

  // Mark story as viewed when it is active
  useEffect(() => {
    if (currentStory) {
      markStoryAsViewed(currentStory.id).catch((err) => {
        console.error('Failed to mark story as viewed:', err);
      });
      if (onStoryViewed) {
        // Defer parent state update to the next tick to avoid React render phase warnings
        const timer = setTimeout(() => {
          onStoryViewed(currentStory.id);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [activeGroup.user_id, currentIndex, currentStory?.id, onStoryViewed]);

  // Reset index and progress ref when group changes
  useEffect(() => {
    progressRef.current = 0;
    setCurrentIndex(0);
    setProgress(0);
    setIsPaused(false);
  }, [activeGroup.user_id]);

  // Play/pause story music
  useEffect(() => {
    if (storyAudioRef.current) {
      storyAudioRef.current.pause();
      storyAudioRef.current = null;
    }

    if (currentStory?.music_url) {
      const audio = new Audio(currentStory.music_url);
      audio.loop = true;
      audio.volume = isMuted ? 0 : 0.5;
      storyAudioRef.current = audio;

      if (!isPaused) {
        audio.play().catch(e => console.log('Story music play blocked:', e));
      }
    }

    return () => {
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
        storyAudioRef.current = null;
      }
    };
  }, [currentStory?.id, activeGroup.user_id]);

  // Sync music pause/play
  useEffect(() => {
    if (storyAudioRef.current) {
      if (isPaused) {
        storyAudioRef.current.pause();
      } else {
        storyAudioRef.current.play().catch(e => console.log('Story music play blocked:', e));
      }
    }
  }, [isPaused]);

  // Sync music volume/mute
  useEffect(() => {
    if (storyAudioRef.current) {
      storyAudioRef.current.volume = isMuted ? 0 : 0.5;
    }
  }, [isMuted]);

  // Handle story progress timer — never call handleNext inside a setState updater
  useEffect(() => {
    if (isPaused) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }

    const intervalTime = 50;
    const step = 100 / (STORY_DURATION / intervalTime);

    if (currentStory?.media_type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => setIsPaused(true));
    }

    progressInterval.current = setInterval(() => {
      // ── Video mode ──
      if (currentStory?.media_type === 'video' && videoRef.current && !isNaN(videoRef.current.duration)) {
        const video = videoRef.current;
        const pct = (video.currentTime / video.duration) * 100;
        if (video.ended || pct >= 100) {
          clearInterval(progressInterval.current!);
          progressRef.current = 0;
          setProgress(0);
          handleNext();
          return;
        }
        progressRef.current = pct;
        setProgress(pct);
        return;
      }

      // ── Image / text mode ──
      const next = progressRef.current + step;
      if (next >= 100) {
        clearInterval(progressInterval.current!);
        progressRef.current = 0;
        setProgress(0);
        handleNext();
        return;
      }
      progressRef.current = next;
      setProgress(next);
    }, intervalTime);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [currentIndex, isPaused, activeGroup.user_id, currentStory]);

  const handlePrev = () => {
    progressRef.current = 0;
    setProgress(0);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (onPrevUser) {
      onPrevUser();
    } else {
      setCurrentIndex(0);
    }
  };

  const handleNext = () => {
    progressRef.current = 0;
    setProgress(0);
    if (currentIndex < activeGroup.stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (onNextUser) {
      onNextUser();
    } else {
      onClose();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
        if (currentStory?.media_type === 'video' && videoRef.current) {
          if (isPaused) {
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isPaused, activeGroup.user_id]);

  const handleScreenTouchStart = () => {
    setIsPaused(true);
    if (currentStory?.media_type === 'video' && videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleScreenTouchEnd = () => {
    setIsPaused(false);
    if (currentStory?.media_type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(prev => !prev);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    showAlert(`Message envoyé à ${activeGroup.user_name} : "${messageText}" ✉️`);
    setMessageText('');
  };

  const handleReaction = (char: string) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 50) + 25; // 25% to 75%
    setFloatingReactions(prev => [...prev, { id, char, left }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const emojis = [
    { char: '👍', label: 'Like' },
    { char: '❤️', label: 'Love' },
    { char: '🥰', label: 'Care' },
    { char: '😂', label: 'Haha' },
    { char: '😮', label: 'Wow' },
    { char: '😢', label: 'Sad' },
    { char: '😡', label: 'Angry' },
  ];

  const ownGroup = groups.find(g => g.user_id === currentUser?.id);
  const ownStoriesCount = ownGroup?.stories.length || 0;
  const hasOwnStories = ownStoriesCount > 0;
  const isOwnActive = activeGroup.user_id === currentUser?.id;
  const otherGroups = groups.filter(g => g.user_id !== currentUser?.id);

  const handleDeleteCurrentStory = () => {
    if (!onDeleteStory || !currentStory) return;
    if (!window.confirm('Supprimer cette story ?')) return;
    onDeleteStory(currentStory.id);
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950 text-zinc-100 select-none overflow-hidden animate-in fade-in duration-200">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-300px) scale(1.3);
            opacity: 0;
          }
        }
        .animate-float {
          animation: floatUp 2s ease-out forwards;
        }
      `}} />

      {/* Left Sidebar (360px) */}
      <aside className="w-[360px] bg-white border-r border-slate-200/80 flex flex-col p-5 text-slate-800 h-full z-10 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <button 
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-655 transition-all hover:scale-105 active:scale-95 shadow-xs"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              E
            </div>
            <span className="text-sm font-bold text-slate-800 tracking-tight">Twinkly</span>
          </div>
        </div>

        {/* Title */}
        <div className="py-4">
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Stories</h1>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600 mt-1 select-none">
            <span className="hover:underline cursor-pointer">Archive</span>
            <span className="text-slate-300">•</span>
            <span className="hover:underline cursor-pointer">Paramètres</span>
          </div>
        </div>

        {/* Scrollable list content */}
        <div className="flex-1 overflow-y-auto space-y-5 scrollbar-hide pr-0.5">
          {/* Section: Votre story */}
          {currentUser && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Votre story
              </span>
              <div 
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                  isOwnActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <div 
                  onClick={() => {
                    if (hasOwnStories && ownGroup) {
                      onSelectGroup(ownGroup);
                    } else {
                      onAddStoryClick();
                    }
                  }}
                  className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                >
                  <div className="relative h-11 w-11 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/50">
                    {currentUser.avatar_url ? (
                      <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-405 font-semibold">
                      {hasOwnStories ? `${ownStoriesCount} active${ownStoriesCount > 1 ? 's' : ''}` : 'Créer une story'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onAddStoryClick}
                  className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  title="Créer une story"
                >
                  <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* Section: Toutes les stories */}
          <div className="space-y-1.5 flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 select-none">
              Toutes les stories
            </span>
            
            {otherGroups.length === 0 ? (
              <div className="text-[11px] text-slate-400 pl-1 py-2 font-medium">
                Aucune autre story disponible.
              </div>
            ) : (
              otherGroups.map(group => {
                const isActive = activeGroup.user_id === group.user_id;
                const unviewedCount = group.stories.filter(s => !s.is_viewed).length;
                const latestStory = group.stories[group.stories.length - 1];
                const timeString = latestStory 
                  ? new Date(latestStory.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '';
                  
                return (
                  <div
                    key={group.user_id}
                    onClick={() => onSelectGroup(group)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                      isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-0.5 rounded-full ${
                      group.has_unviewed 
                        ? 'bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500' 
                        : 'bg-slate-200'
                    } ring-2 ring-white/80 shadow-xs flex-shrink-0`}>
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-white p-0.5">
                        {group.user_avatar ? (
                          <img src={group.user_avatar} alt="" className="h-full w-full object-cover rounded-full" />
                        ) : (
                          <div className="h-full w-full bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                            {group.user_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {group.user_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                        {group.has_unviewed ? (
                          <span className="text-blue-600 font-bold">{unviewedCount} nouvelle{unviewedCount > 1 ? 's' : ''}</span>
                        ) : (
                          <span>Déjà vue</span>
                        )}
                        <span className="text-slate-350">•</span>
                        <span>{timeString}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Right Story Display (Flex-1) */}
      <main className="flex-1 bg-zinc-955 flex flex-col justify-between relative p-4 h-full">
        {/* Background Radial Glow */}
        <div 
          className="absolute inset-0 opacity-20 blur-3xl scale-105 pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(236, 72, 153, 0.2) 50%, rgba(0, 0, 0, 0) 100%)`
          }}
        />

        {/* Top Spacer or Header Elements (like notification / user menu if necessary, similar to screenshot) */}
        <div className="h-14 flex items-center justify-end px-4 gap-3 z-10">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-zinc-800/80 border border-zinc-700/30 flex items-center justify-center cursor-pointer hover:bg-zinc-700 text-white transition-all shadow-xs">
              <span className="text-sm">💬</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-zinc-800/80 border border-zinc-700/30 flex items-center justify-center cursor-pointer hover:bg-zinc-700 text-white transition-all shadow-xs">
              <span className="text-sm">🔔</span>
            </div>
            <div className="h-9 w-9 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700/30">
              {currentUser?.avatar_url && <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" />}
            </div>
          </div>
        </div>

        {/* Center Panel (Viewer with Nav buttons on left/right background) */}
        <div className="flex-1 flex items-center justify-center relative select-none">
          {/* Left Arrow Button */}
          {onPrevUser && (
            <button 
              onClick={onPrevUser}
              className="absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full transition-all border border-zinc-800/50 shadow-lg z-20 hover:scale-105 active:scale-95"
              title="Précédent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Right Arrow Button */}
          {onNextUser && (
            <button 
              onClick={onNextUser}
              className="absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full transition-all border border-zinc-800/50 shadow-lg z-20 hover:scale-105 active:scale-95"
              title="Suivant"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Centered Vertical Story Card */}
          <div className="relative w-full max-w-[360px] h-[640px] max-h-[75vh] rounded-2xl overflow-hidden flex flex-col justify-between bg-zinc-900 border border-zinc-800/80 shadow-2xl z-10">
            
            {/* Top Indicator overlays */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
              
              {/* Progress Indicators */}
              <div className="flex gap-1.5 mb-3">
                {activeGroup.stories.map((story, index) => (
                  <div 
                    key={story.id} 
                    className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
                  >
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                      style={{
                        width: 
                          index < currentIndex 
                            ? '100%' 
                            : index === currentIndex 
                              ? `${progress}%` 
                              : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* User header on the card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8.5 w-8.5 rounded-full overflow-hidden border border-white/20 bg-zinc-950 p-0.5 flex-shrink-0">
                    {activeGroup.user_avatar ? (
                      <img src={activeGroup.user_avatar} alt="" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <div className="h-full w-full bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        {activeGroup.user_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-extrabold text-white leading-tight shadow-xs">
                      {activeGroup.user_name}
                    </span>
                    <span className="text-[9px] text-white/70 font-semibold shadow-xs">
                      {timeString(currentStory.created_at)}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5">
                  {currentStory.media_type === 'video' && (
                    <button 
                      onClick={toggleMute}
                      className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsPaused(prev => !prev);
                      if (currentStory?.media_type === 'video' && videoRef.current) {
                        if (!isPaused) videoRef.current.pause();
                        else videoRef.current.play().catch(() => {});
                      }
                    }}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                  {/* Delete button — only for own stories */}
                  {isOwnActive && onDeleteStory && (
                    <button
                      onClick={handleDeleteCurrentStory}
                      className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-all"
                      title="Supprimer cette story"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Story Media Area */}
            <div 
              className="relative flex-1 flex items-center justify-center bg-black cursor-pointer"
              onMouseDown={handleScreenTouchStart}
              onMouseUp={handleScreenTouchEnd}
              onTouchStart={handleScreenTouchStart}
              onTouchEnd={handleScreenTouchEnd}
            >
              {currentStory.media_type === 'image' ? (
                <img 
                  src={currentStory.media_url} 
                  alt="Story Content" 
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <video 
                  ref={videoRef}
                  src={currentStory.media_url} 
                  className="w-full h-full object-cover"
                  playsInline
                  muted={isMuted}
                  loop={false}
                />
              )}

              {/* Music sticker overlay if present */}
              {currentStory.music_title && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white/90 text-slate-800 px-3.5 py-2 rounded-xl shadow-lg border border-white/20 flex items-center gap-2.5 z-20 animate-bounce pointer-events-none select-none max-w-[80%]">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <span className="text-xs">🎵</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black leading-tight truncate">{currentStory.music_title}</span>
                    <span className="text-[8px] font-bold text-slate-500 leading-tight truncate">{currentStory.music_artist}</span>
                  </div>
                  {/* Micro animation equalizer */}
                  {!isPaused && (
                    <div className="flex items-end gap-0.5 h-3 flex-shrink-0">
                      <span className="w-0.5 bg-blue-500 animate-pulse h-2" style={{ animationDelay: '0.1s' }} />
                      <span className="w-0.5 bg-blue-500 animate-pulse h-3.5" style={{ animationDelay: '0.3s' }} />
                      <span className="w-0.5 bg-blue-500 animate-pulse h-1.5" style={{ animationDelay: '0.5s' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Float emoji rendering overlay */}
              {floatingReactions.map(reaction => (
                <span
                  key={reaction.id}
                  className="absolute bottom-16 text-3xl animate-float pointer-events-none z-30"
                  style={{ left: `${reaction.left}%` }}
                >
                  {reaction.char}
                </span>
              ))}

              {/* Click Areas for Card Navigation */}
              <div className="absolute inset-y-0 left-0 w-1/4" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
              <div className="absolute inset-y-0 right-0 w-1/4" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
            </div>

          </div>
        </div>

        {/* Bottom Bar: Input and Reactions (Positioned horizontally centered under the card) */}
        <div className="h-20 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mx-auto z-10 px-4">
          <form onSubmit={handleSendMessage} className="relative w-full sm:flex-1 max-w-xs sm:max-w-none">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Envoyer un message...`}
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-full py-2 px-4 pr-10 text-[11px] text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all font-semibold"
            />
            <button
              type="submit"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Quick Reaction Emojis */}
          <div className="flex items-center gap-1.5 sm:gap-2 select-none bg-zinc-900/60 border border-zinc-800/50 rounded-full px-3 py-1 backdrop-blur-xs font-sans">
            {emojis.map(emoji => (
              <button
                key={emoji.char}
                onClick={() => handleReaction(emoji.char)}
                className="text-xl sm:text-2xl hover:scale-130 transition-transform active:scale-95 duration-105"
                title={emoji.label}
              >
                {emoji.char}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function timeString(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${Math.max(1, diffMins)} min`;
  }
  return `${diffHours} h`;
}
