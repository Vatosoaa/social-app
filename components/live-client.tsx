'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video, VideoOff, Mic, MicOff, Monitor, Settings, Radio,
  Pause, Play, X, Send, Users, Flame, Heart, Smile,
  Volume2, ShieldAlert, ArrowLeft, Check, Sparkles, AlertCircle,
  MessageSquare, Calendar, BarChart3, Lock, Globe, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DbUser } from '@/lib/session';

// Advanced Live Subcomponents
import type { ChatMsg, Viewer, Guest, ScheduledLive, LiveStats, Privacy } from './live/types';
import { LiveChatPanel } from './live/live-chat-panel';
import { LiveViewersPanel } from './live/live-viewers-panel';
import { LiveGuestsPanel } from './live/live-guests-panel';
import { LiveStatsPanel } from './live/live-stats-panel';
import { LiveScheduler } from './live/live-scheduler';
import { LivePostSummary } from './live/live-post-summary';
import { MOCK_NAMES, MOCK_AVATARS, MOCK_COMMENTS, REACTIONS } from './live/types';

interface LiveClientProps {
  currentUser: DbUser;
}

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface FloatingEmoji {
  id: string;
  char: string;
  left: number; // percentage from right
  animationDelay: number;
}

interface LiveNotification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'live';
}

export default function LiveClient({ currentUser }: LiveClientProps) {
  const router = useRouter();

  // Stream States
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Quality & Devices
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [isHD, setIsHD] = useState(true);

  // Privacy & Scheduling Setup
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [scheduledLives, setScheduledLives] = useState<ScheduledLive[]>([]);

  // Tab Panel State
  const [activeTab, setActiveTab] = useState<'chat' | 'viewers' | 'guests' | 'stats' | 'scheduler'>('chat');

  // Stats & Dynamic Activity
  const [duration, setDuration] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalCommentsCount, setTotalCommentsCount] = useState(0);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  // UI Flow States
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emojiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimationRef = useRef<number | null>(null);

  // Computed stats object
  const currentStats: LiveStats = {
    totalViews: viewers.length + 5,
    peakViewers: Math.max(peakViewers, viewers.length),
    duration: duration,
    totalComments: totalCommentsCount,
    totalReactions: totalLikes,
    avgWatchTime: duration > 10 ? Math.floor(duration * 0.7) : duration,
  };

  // Toast Notification helper
  const addNotification = (text: string, type: 'info' | 'success' | 'warning' | 'live' = 'info') => {
    const id = Math.random().toString();
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // 1. Fetch available cameras and microphones
  const loadDevices = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      tempStream.getTracks().forEach(t => t.stop());

      const videos = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Caméra ${d.deviceId.slice(0, 4)}` }));

      const audios = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 4)}` }));

      setVideoDevices(videos);
      setAudioDevices(audios);

      if (videos.length > 0) setSelectedVideo(videos[0].deviceId);
      if (audios.length > 0) setSelectedAudio(audios[0].deviceId);

      startPreview(videos[0]?.deviceId, audios[0]?.deviceId, isHD);
    } catch (err) {
      console.error('Error loading devices:', err);
      setErrorMsg('Impossible d\'accéder aux périphériques de caméra/micro. Veuillez autoriser les permissions.');
    }
  };

  // Start preview stream
  const startPreview = async (videoId: string, audioId: string, hd: boolean) => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: videoId ? {
          deviceId: { exact: videoId },
          width: hd ? { ideal: 1280 } : { ideal: 640 },
          height: hd ? { ideal: 720 } : { ideal: 480 },
          frameRate: { ideal: 30 }
        } : true,
        audio: audioId ? { deviceId: { exact: audioId } } : true
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setIsCameraOff(false);
      setIsMuted(false);
      setErrorMsg('');

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      setupAudioLevel(newStream);
    } catch (err) {
      console.error('Error starting preview stream:', err);
      setErrorMsg('Erreur lors de l\'initialisation de la caméra. Essayez une autre résolution ou caméra.');
    }
  };

  // Setup Audio Meter using Web Audio API
  const setupAudioLevel = (mediaStream: MediaStream) => {
    if (audioAnimationRef.current) cancelAnimationFrame(audioAnimationRef.current);
    if (audioContextRef.current) audioContextRef.current.close();

    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(mediaStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = ctx;
      audioAnalyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser || isMuted || isPaused) {
          setAudioLevel(0);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(Math.round((average / 128) * 100), 100);
        setAudioLevel(normalized);
        audioAnimationRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('Audio level monitoring failed:', err);
    }
  };

  // Enumerate devices on mount
  useEffect(() => {
    loadDevices();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioAnimationRef.current) cancelAnimationFrame(audioAnimationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Update stream when camera, mic or resolution changes during setup
  useEffect(() => {
    if (isSettingUp && (selectedVideo || selectedAudio)) {
      startPreview(selectedVideo, selectedAudio, isHD);
    }
  }, [selectedVideo, selectedAudio, isHD]);

  // Always sync stream to videoRef.srcObject when components mount
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isLive, isSettingUp]);

  // Live stream duration counter
  useEffect(() => {
    if (isLive && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive, isPaused]);

  // Dynamic simulation: Chat, reactions, viewers count fluctuation
  useEffect(() => {
    if (isLive && !isPaused) {
      // 1. Initial viewers list setup
      const initialViewers: Viewer[] = Array.from({ length: 4 }).map((_, i) => ({
        id: `v-${i}`,
        name: MOCK_NAMES[i % MOCK_NAMES.length],
        avatar: MOCK_AVATARS[i % MOCK_AVATARS.length],
        joinedAt: Date.now() - 30000
      }));
      setViewers(initialViewers);

      // 2. Chat comments simulation
      const initialSystemMsg: ChatMsg = {
        id: 'sys-start',
        name: 'Système',
        avatar: '',
        text: 'La diffusion en direct a commencé. Dites bonjour ! 👋',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      };
      setChatMessages([initialSystemMsg]);

      // Interval for periodic chat comments and viewers joining/leaving
      chatIntervalRef.current = setInterval(() => {
        if (isChatDisabled) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
        const avatar = MOCK_AVATARS[Math.floor(Math.random() * MOCK_AVATARS.length)];
        const text = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];

        // Decide activity: Join or Comment
        if (Math.random() > 0.4) {
          // Comment
          setChatMessages(prev => [...prev, {
            id: Math.random().toString(),
            name,
            avatar,
            text,
            time: timeStr
          }]);
          setTotalCommentsCount(c => c + 1);
        } else {
          // Viewer Join
          const newId = `v-${Math.random()}`;
          const newViewer: Viewer = { id: newId, name, avatar, joinedAt: Date.now() };
          
          setViewers(prev => {
            if (prev.some(v => v.name === name)) return prev;
            return [...prev, newViewer];
          });
          
          setChatMessages(prev => [...prev, {
            id: Math.random().toString(),
            name,
            avatar,
            text: 'a rejoint le direct',
            time: timeStr,
            isSystem: true
          }]);

          // Trigger minor notification toast
          addNotification(`${name} a rejoint le live !`);
        }
      }, 4000);

      // 3. Floating Reactions Simulator
      emojiIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.4) {
          const randomChar = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
          triggerFloatingEmoji(randomChar);
        }
      }, 2000);

      // 4. Random activity: Likes & Shares
      activityIntervalRef.current = setInterval(() => {
        const randName = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
        const actions = [
          'a aimé la vidéo ❤️',
          'a partagé le live 📢',
          'a envoyé un super j\'aime 👍'
        ];
        const text = actions[Math.floor(Math.random() * actions.length)];
        addNotification(`${randName} ${text}`, 'success');

        if (text.includes('aimé') || text.includes('j\'aime')) {
          setTotalLikes(l => l + Math.floor(Math.random() * 3) + 1);
        }
      }, 9000);

      return () => {
        if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
        if (emojiIntervalRef.current) clearInterval(emojiIntervalRef.current);
        if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
      };
    }
  }, [isLive, isPaused, isChatDisabled]);

  // Floating Emoji Helper
  const triggerFloatingEmoji = (char: string) => {
    const id = Math.random().toString();
    const left = Math.floor(Math.random() * 40) + 10;
    const animationDelay = Math.random() * 0.4;
    setFloatingEmojis(prev => [...prev, { id, char, left, animationDelay }]);
    setTotalLikes(l => l + 1);

    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 3200);
  };

  // Toggle HD Resolution quality
  const handleToggleHD = async () => {
    if (isScreenSharing) return;
    const nextHD = !isHD;
    setIsHD(nextHD);
    if (stream) {
      await startPreview(selectedVideo, selectedAudio, nextHD);
    }
  };

  // Toggle Screen Sharing
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      setIsScreenSharing(false);
      await startPreview(selectedVideo, selectedAudio, isHD);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        if (stream) {
          const videoTrack = stream.getVideoTracks()[0];
          const newVideoTrack = screenStream.getVideoTracks()[0];

          stream.removeTrack(videoTrack);
          videoTrack.stop();
          stream.addTrack(newVideoTrack);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          setIsScreenSharing(true);

          newVideoTrack.onended = () => {
            handleToggleScreenShare();
          };
        }
      } catch (err: any) {
        if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return;
        console.error('Error starting screen share:', err);
      }
    }
  };

  // Pause / Resume Stream
  const handleTogglePause = () => {
    if (stream) {
      const nextPaused = !isPaused;
      setIsPaused(nextPaused);
      stream.getTracks().forEach(track => {
        if (track.kind === 'audio') {
          track.enabled = !nextPaused && !isMuted;
        } else if (track.kind === 'video') {
          track.enabled = !nextPaused && !isCameraOff;
        }
      });
    }
  };

  // Toggle Microphone Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (stream) {
      stream.getAudioTracks().forEach(t => {
        t.enabled = !nextMuted && !isPaused;
      });
    }
  };

  // Toggle Camera Off
  const handleToggleCamera = () => {
    const nextCamOff = !isCameraOff;
    setIsCameraOff(nextCamOff);
    if (stream) {
      stream.getVideoTracks().forEach(t => {
        t.enabled = !nextCamOff && !isPaused;
      });
    }
  };

  // Start Live
  const handleStartLive = () => {
    if (!stream) return;
    setIsLive(true);
    setIsSettingUp(false);
    setDuration(0);
    setPeakViewers(0);
    setTotalLikes(0);
    setTotalCommentsCount(0);
    addNotification('Votre diffusion en direct a commencé !', 'live');
  };

  // Stop Live
  const handleStopLive = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setStream(null);
    setIsLive(false);
    setShowSummary(true);
    setGuests([]);
  };

  // Scheduled Lives Handlers
  const handleAddSchedule = (live: Omit<ScheduledLive, 'id'>) => {
    const newScheduled: ScheduledLive = {
      ...live,
      id: Math.random().toString(),
    };
    setScheduledLives(prev => [newScheduled, ...prev]);
    addNotification(`Live programmé : "${live.title}"`, 'info');
  };

  const handleDeleteSchedule = (id: string) => {
    setScheduledLives(prev => prev.filter(l => l.id !== id));
    addNotification('Live programmé annulé', 'warning');
  };

  // Guest invitation simulation
  const handleInviteGuest = (name: string, avatar: string) => {
    const newGuest: Guest = {
      id: Math.random().toString(),
      name,
      avatar,
      status: 'pending',
    };
    setGuests(prev => [...prev, newGuest]);
    addNotification(`Invitation envoyée à ${name}`, 'info');

    // Simulate Guest accepting invite after 4 seconds
    setTimeout(() => {
      setGuests(prev => prev.map(g => {
        if (g.name === name && g.status === 'pending') {
          addNotification(`${name} a rejoint le direct !`, 'success');
          return { ...g, status: 'active' };
        }
        return g;
      }));
    }, 4000);
  };

  const handleMuteGuest = (id: string) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, isMuted: !g.isMuted } : g));
  };

  const handleRemoveGuest = (id: string) => {
    const target = guests.find(g => g.id === id);
    setGuests(prev => prev.filter(g => g.id !== id));
    if (target) {
      addNotification(`${target.name} a quitté le direct`, 'warning');
    }
  };

  // Chat actions
  const handleSendChatMsg = (text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, {
      id: Math.random().toString(),
      name: currentUser.name,
      avatar: currentUser.avatar_url || '',
      text,
      time: timeStr
    }]);
    setTotalCommentsCount(c => c + 1);
  };

  const handlePinChatMsg = (id: string) => {
    setChatMessages(prev => prev.map(m => {
      if (m.id === id) return { ...m, isPinned: !m.isPinned };
      return { ...m, isPinned: false }; // only one pinned message allowed
    }));
  };

  const handleDeleteChatMsg = (id: string) => {
    setChatMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true } : m));
  };

  const handleBanUser = (id: string) => {
    const target = viewers.find(v => v.id === id);
    if (target) {
      addNotification(`${target.name} a été banni`, 'warning');
      setViewers(prev => prev.filter(v => v.id !== id));
      // Add system message
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        name: 'Système',
        avatar: '',
        text: `${target.name} a été banni de la diffusion`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      }]);
    }
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  return (
    <div className="fixed inset-0 bg-[#070b19] text-white z-50 flex flex-col font-sans select-none overflow-hidden">
      
      {/* CSS KEYFRAMES FOR FLOATING EMOJIS */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-20px) scale(1.1) rotate(5deg);
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-380px) scale(0.8) rotate(-15deg);
            opacity: 0;
          }
        }
        .animate-float-emoji {
          animation: floatUp 3.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>

      {/* HEADER BAR */}
      <header className="h-16 flex-shrink-0 bg-[#0d1527]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => {
              if (stream) stream.getTracks().forEach(t => t.stop());
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-rose-600 flex items-center justify-center shadow-md shadow-rose-600/30">
              <Radio className="h-4.5 w-4.5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-tight">Studio en Direct</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Twinkly Live</p>
            </div>
          </div>
        </div>

        {/* Live status badge */}
        {isLive && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-rose-600 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg shadow-rose-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              Direct
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-full">
              <Users className="h-3 w-3 text-sky-400" />
              <span>{viewers.length} spectateurs</span>
            </div>
            <div className="bg-white/5 border border-white/10 text-emerald-400 text-[10px] font-mono font-bold px-3 py-1.5 rounded-full">
              {formatTime(duration)}
            </div>
          </div>
        )}

        {!isLive && (
          <div className="text-xs text-slate-400 font-medium">
            Configuration du flux
          </div>
        )}
      </header>

      {/* TOAST NOTIFICATION CONTAINER */}
      <div className="absolute top-20 left-6 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl backdrop-blur-xl animate-in slide-in-from-left-5 duration-300 max-w-sm ${
              n.type === 'success'
                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'
                : n.type === 'warning'
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                : n.type === 'live'
                ? 'bg-indigo-600 border-indigo-500/30 text-white shadow-indigo-600/20'
                : 'bg-white/10 border-white/10 text-slate-200'
            }`}
          >
            <Bell className={`h-4 w-4 ${n.type === 'live' ? 'animate-bounce' : ''}`} />
            <span>{n.text}</span>
          </div>
        ))}
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* LEFT COLUMN: Video Stream & Setup Screen */}
        <div className="flex-1 flex flex-col relative bg-zinc-950/40 p-6 items-center justify-center min-w-0">
          
          {/* SETUP SCREEN */}
          {isSettingUp && (
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center animate-in fade-in duration-300">
              
              {/* Webcam Preview Screen */}
              <div className="relative aspect-video rounded-3xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${isCameraOff ? 'hidden' : 'block'}`}
                />
                
                {isCameraOff && (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <VideoOff className="h-12 w-12 text-slate-600" />
                    <p className="text-xs">Votre caméra est désactivée</p>
                  </div>
                )}

                {errorMsg && (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-rose-400 gap-3">
                    <ShieldAlert className="h-10 w-10 text-rose-500" />
                    <p className="text-xs font-semibold max-w-xs">{errorMsg}</p>
                    <Button
                      onClick={loadDevices}
                      variant="outline"
                      className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 mt-2"
                    >
                      Réessayer
                    </Button>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${audioLevel > 5 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Aperçu Audio</span>
                </div>

                {isHD && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm">
                    HD
                  </div>
                )}
              </div>

              {/* Devices Control Panel */}
              <div className="space-y-6 bg-slate-900/60 backdrop-blur-md p-7 rounded-3xl border border-white/10 shadow-xl">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white mb-1.5 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-indigo-400" /> Paramètres techniques
                  </h2>
                  <p className="text-xs text-slate-400">Sélectionnez et configurez vos paramètres de diffusion.</p>
                </div>

                <div className="space-y-4">
                  {/* Select Camera */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">Caméra Vidéo</label>
                    <select
                      value={selectedVideo}
                      onChange={(e) => setSelectedVideo(e.target.value)}
                      className="w-full bg-[#0a101f] border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50 transition-colors"
                    >
                      {videoDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                      {videoDevices.length === 0 && <option value="">Aucune caméra détectée</option>}
                    </select>
                  </div>

                  {/* Select Mic */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">Microphone Audio</label>
                    <select
                      value={selectedAudio}
                      onChange={(e) => setSelectedAudio(e.target.value)}
                      className="w-full bg-[#0a101f] border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50 transition-colors"
                    >
                      {audioDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                      {audioDevices.length === 0 && <option value="">Aucun micro détecté</option>}
                    </select>
                  </div>

                  {/* Privacy Selector & HD toggle */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">Qualité Haute Définition</span>
                        <span className="text-[10px] text-slate-400">Diffusion en HD (720p/1080p)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsHD(prev => !prev)}
                        className={`h-6 w-11 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${isHD ? 'bg-indigo-600' : 'bg-slate-800'}`}
                      >
                        <div className={`h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${isHD ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">Confidentialité par défaut</span>
                        <span className="text-[10px] text-slate-400">Qui peut rejoindre votre direct</span>
                      </div>
                      <select
                        value={privacy}
                        onChange={(e) => setPrivacy(e.target.value as Privacy)}
                        className="bg-[#0a101f] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-slate-200 outline-none focus:border-indigo-500/50"
                      >
                        <option value="public">🌍 Public</option>
                        <option value="subscribers">👥 Abonnés</option>
                        <option value="private">🔒 Privé</option>
                      </select>
                    </div>
                  </div>

                  {/* Audio levels indicator */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 block">Niveau du micro :</span>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-75"
                        style={{ width: `${audioLevel}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleStartLive}
                  disabled={!!errorMsg || !stream}
                  className="w-full h-12 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
                >
                  <Radio className="h-4 w-4" /> Démarrer la diffusion en direct
                </Button>
              </div>
            </div>
          )}

          {/* ACTIVE LIVE STREAM SECTION */}
          {isLive && (
            <div className="w-full h-full max-w-5xl flex flex-col justify-between relative animate-in fade-in duration-300">
              
              {/* Central Video/Guests Grid */}
              <div className="flex-1 relative rounded-[32px] bg-slate-900 border border-white/10 overflow-hidden shadow-2xl mb-4 flex flex-col justify-center items-center group/stream">
                
                {/* Multi-guest 2-4 Split screen layout */}
                {guests.filter(g => g.status === 'active').length > 0 ? (
                  <div className={`w-full h-full grid gap-2.5 p-2.5 ${
                    guests.filter(g => g.status === 'active').length === 1 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'
                  }`}>
                    {/* Main camera stream */}
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 ${isCameraOff || isScreenSharing ? 'transform-none' : ''} ${isPaused ? 'hidden' : 'block'}`}
                      />
                      {isPaused && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center gap-1.5 p-4 z-10">
                          <Pause className="h-5 w-5 text-indigo-400 animate-pulse" />
                          <p className="text-[10px] text-slate-300 font-bold">Diffusion en pause</p>
                        </div>
                      )}
                      {!isPaused && isCameraOff && (
                        <div className="flex flex-col items-center gap-2 text-slate-600">
                          <VideoOff className="h-8 w-8" />
                          <p className="text-[9px]">Caméra coupée</p>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded-md text-[9px] font-bold text-white border border-white/10">
                        Vous (Hôte)
                      </div>
                    </div>

                    {/* Guest Stream Panels */}
                    {guests.filter(g => g.status === 'active').map(guest => (
                      <div
                        key={guest.id}
                        className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center"
                      >
                        <img
                          src={guest.avatar}
                          className="h-16 w-16 rounded-full object-cover border-2 border-white/20 animate-pulse"
                          alt=""
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 to-transparent flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-200">{guest.name}</span>
                          {guest.isMuted && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[8px] font-bold">MUTÉ</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Full size single host video stream
                  <div className="w-full h-full relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transform -scale-x-100 ${isCameraOff || isScreenSharing ? 'transform-none' : ''} ${isPaused ? 'hidden' : 'block'}`}
                    />

                    {isPaused && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center gap-4 z-15">
                        <div className="h-16 w-16 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                          <Pause className="h-7 w-7 fill-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">Diffusion en pause</h3>
                          <p className="text-xs text-slate-400 mt-1">Vos spectateurs attendent la reprise du direct</p>
                        </div>
                      </div>
                    )}

                    {!isPaused && isCameraOff && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center gap-3 z-15">
                        <VideoOff className="h-14 w-14 text-slate-600" />
                        <p className="text-xs text-slate-400">Votre caméra est désactivée. Les spectateurs n'entendent que votre voix.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Technical Overlay Widget */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 space-y-1 text-[10px] text-slate-300 font-mono z-10 select-none">
                  <div className="flex items-center justify-between gap-4">
                    <span>Flux :</span>
                    <span className="text-emerald-400 font-bold">ACTIF</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Résolution :</span>
                    <span className="text-white font-bold">{isScreenSharing ? '1920x1080' : isHD ? '1280x720 (HD)' : '640x480 (SD)'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Confid. :</span>
                    <span className="text-white font-bold uppercase">{privacy}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Audio :</span>
                    <span className={isMuted ? 'text-rose-400' : 'text-emerald-400'}>{isMuted ? 'COUPE' : 'ACTIF'}</span>
                  </div>
                </div>

                {/* Floating Emojis Quick triggers */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-10">
                  {['❤️', '🔥', '👍'].map(char => (
                    <button
                      key={char}
                      onClick={() => triggerFloatingEmoji(char)}
                      className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-lg"
                    >
                      {char}
                    </button>
                  ))}
                </div>

                {/* Audio visualizer in active stream */}
                {!isPaused && !isMuted && (
                  <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3 z-10">
                    <span className="text-[10px] font-bold text-slate-300">NIVEAU AUDIO :</span>
                    <div className="flex items-end gap-0.5 h-6">
                      {[1, 2, 3, 4, 5, 6].map((idx) => {
                        const heightPct = Math.min(Math.max((audioLevel / 100) * (50 + idx * 10), 10), 100);
                        return (
                          <div
                            key={idx}
                            className="w-1 bg-emerald-500 rounded-full transition-all duration-75"
                            style={{ height: `${heightPct}%`, minHeight: '3px' }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Floating Emojis animation track */}
                <div className="absolute inset-y-0 right-20 left-20 pointer-events-none overflow-hidden z-20">
                  {floatingEmojis.map(emoji => (
                    <div
                      key={emoji.id}
                      className="absolute bottom-4 animate-float-emoji text-3xl select-none"
                      style={{
                        right: `${emoji.left}%`,
                        animationDelay: `${emoji.animationDelay}s`
                      }}
                    >
                      {emoji.char}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Control Bar */}
              <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-3xl p-5 flex items-center justify-between shadow-xl gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMute}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${
                      isMuted
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={isMuted ? 'Activer le micro' : 'Couper le micro'}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>

                  <button
                    onClick={handleToggleCamera}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${
                      isCameraOff
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={isCameraOff ? 'Activer la caméra' : 'Désactiver la caméra'}
                  >
                    {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleScreenShare}
                    className={`h-11 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${
                      isScreenSharing
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title="Partager l'écran"
                  >
                    <Monitor className="h-4.5 w-4.5" />
                    <span className="hidden sm:inline">Partager l'écran</span>
                  </button>

                  <button
                    onClick={handleToggleHD}
                    disabled={isScreenSharing}
                    className={`h-11 px-4 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all border ${
                      isHD
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                        : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'
                    } disabled:opacity-40`}
                  >
                    <span>{isHD ? 'Qualité : HD' : 'Qualité : SD'}</span>
                  </button>

                  <button
                    onClick={handleTogglePause}
                    className={`h-11 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${
                      isPaused
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isPaused ? <Play className="h-4 w-4 fill-white" /> : <Pause className="h-4 w-4" />}
                    <span>{isPaused ? 'Reprendre' : 'Pause'}</span>
                  </button>
                </div>

                <Button
                  onClick={handleStopLive}
                  className="h-11 px-5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 text-xs transition-colors"
                >
                  Arrêter le direct
                </Button>
              </div>

            </div>
          )}

          {/* SUMMARY MODAL AT END */}
          {showSummary && (
            <LivePostSummary
              stats={currentStats}
              onClose={() => {
                setShowSummary(false);
                setIsSettingUp(true);
                setDuration(0);
                loadDevices();
              }}
              onNewLive={() => {
                setShowSummary(false);
                setIsSettingUp(true);
                setDuration(0);
                loadDevices();
              }}
            />
          )}

        </div>

        {/* RIGHT COLUMN: Sidebar with Navigation Panels */}
        {isLive && (
          <div className="w-[340px] border-l border-white/10 bg-[#0d1527]/50 backdrop-blur-md flex flex-col justify-between min-h-0 select-none">
            
            {/* Sidebar Active Panel Content */}
            <div className="flex-1 min-h-0">
              {activeTab === 'chat' && (
                <LiveChatPanel
                  messages={chatMessages}
                  currentUserName={currentUser.name}
                  currentUserAvatar={currentUser.avatar_url || ''}
                  onSend={handleSendChatMsg}
                  onPin={handlePinChatMsg}
                  onDelete={handleDeleteChatMsg}
                  onReact={triggerFloatingEmoji}
                  isChatDisabled={isChatDisabled}
                  onToggleChat={() => setIsChatDisabled(!isChatDisabled)}
                  isHost={true}
                />
              )}
              {activeTab === 'viewers' && (
                <LiveViewersPanel
                  viewers={viewers}
                  onBan={handleBanUser}
                />
              )}
              {activeTab === 'guests' && (
                <LiveGuestsPanel
                  guests={guests}
                  onInvite={handleInviteGuest}
                  onAccept={(id) => setGuests(prev => prev.map(g => g.id === id ? { ...g, status: 'active' } : g))}
                  onDecline={(id) => setGuests(prev => prev.filter(g => g.id !== id))}
                  onMuteGuest={handleMuteGuest}
                  onRemoveGuest={handleRemoveGuest}
                />
              )}
              {activeTab === 'stats' && (
                <LiveStatsPanel
                  stats={currentStats}
                  currentViewers={viewers.length}
                />
              )}
              {activeTab === 'scheduler' && (
                <LiveScheduler
                  scheduledLives={scheduledLives}
                  onSchedule={handleAddSchedule}
                  onDelete={handleDeleteSchedule}
                />
              )}
            </div>

            {/* Sidebar Navigation Tabs Bar */}
            <div className="h-14 border-t border-white/10 flex items-center justify-around bg-slate-950/20 px-2 flex-shrink-0">
              {[
                { id: 'chat', icon: MessageSquare, label: 'Chat' },
                { id: 'viewers', icon: Users, label: 'Spectateurs' },
                { id: 'guests', icon: Video, label: 'Invités' },
                { id: 'stats', icon: BarChart3, label: 'Stats' },
                { id: 'scheduler', icon: Calendar, label: 'Planning' },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
                      isActive ? 'text-indigo-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={tab.label}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span className="text-[8px] font-bold tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
