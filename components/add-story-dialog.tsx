'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ImageIcon, Loader2, X, Upload, Music, Users, Type, Play, Pause, Smile 
} from 'lucide-react';
import { createStory } from '@/app/actions/stories';
import { useAlert } from '@/components/providers/alert-provider';
import type { DbUser } from '@/lib/session';

interface AddStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DbUser | null;
  onStoryAdded?: (mediaUrl: string, musicUrl?: string, musicTitle?: string, musicArtist?: string) => void;
}

interface StoryOverlayItem {
  id: string;
  type: 'text' | 'sticker' | 'tag' | 'music';
  content: string;
  subContent?: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  color?: string;
}

const GRADIENTS = [
  { name: 'Violet Romance', colors: ['#8B5CF6', '#EC4899'] },
  { name: 'Ocean Breeze', colors: ['#06B6D4', '#3B82F6'] },
  { name: 'Sunset Glow', colors: ['#F59E0B', '#EF4444'] },
  { name: 'Midnight Blue', colors: ['#1E1B4B', '#312E81'] },
  { name: 'Forest Mint', colors: ['#10B981', '#059669'] },
];

const STICKERS = ['🔥', '✨', '💖', '👑', '🎉', '🚀', '🥳', '🍕', '🎸', '🎧', '🌟', '🍀', '🎈', '🍿', '😂', '😍', '🙌'];

const FRIENDS_LIST = [
  { id: 1, name: 'Jean Dupont' },
  { id: 2, name: 'Marie Martin' },
  { id: 3, name: 'Thomas Dubois' },
  { id: 4, name: 'Quinn' },
  { id: 5, name: 'Alex' },
  { id: 6, name: 'Sarah' },
];

const MUSIC_TRACKS = [
  { id: 'm1', title: 'Blinding Lights', artist: 'The Weeknd', art: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=80&auto=format&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'm2', title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', art: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=80&auto=format&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'm3', title: 'Levitating', artist: 'Dua Lipa', art: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=80&auto=format&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'm4', title: 'Bad Habits', artist: 'Ed Sheeran', art: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=80&auto=format&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'm5', title: 'Industry Baby', artist: 'Lil Nas X & Jack Harlow', art: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=80&auto=format&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
];

export default function AddStoryDialog({ isOpen, onClose, currentUser, onStoryAdded }: AddStoryDialogProps) {
  const { showAlert } = useAlert();
  const [isPending, startTransition] = useTransition();

  // Mode states: 'choose' | 'edit'
  const [editorMode, setEditorMode] = useState<'choose' | 'edit'>('choose');
  const [bgType, setBgType] = useState<'color' | 'image'>('color');

  // Background properties
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);

  // Overlays
  const [overlayItems, setOverlayItems] = useState<StoryOverlayItem[]>([]);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Editor Panel Input States
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [tagFriendId, setTagFriendId] = useState('');
  const [musicSearchQuery, setMusicSearchQuery] = useState('');

  // Audio Playback Preview States
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Selected attached song
  const [attachedSong, setAttachedSong] = useState<typeof MUSIC_TRACKS[0] | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up audio playback
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const resetForm = () => {
    setEditorMode('choose');
    setBgType('color');
    setMediaUrl('');
    setSelectedGradient(GRADIENTS[0]);
    setOverlayItems([]);
    setDraggedItemId(null);
    setTextInput('');
    setTextColor('#FFFFFF');
    setTagFriendId('');
    setMusicSearchQuery('');
    setAttachedSong(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPreviewSongId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhotoStoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlert('Le fichier est trop volumineux. Maximum 5 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
        setBgType('image');
        setEditorMode('edit');
      }
    };
    reader.readAsDataURL(file);
  };

  const startTextStory = () => {
    setBgType('color');
    setEditorMode('edit');
  };

  // Add items
  const addTextOverlay = () => {
    if (!textInput.trim()) return;
    const newItem: StoryOverlayItem = {
      id: 'text_' + Date.now(),
      type: 'text',
      content: textInput.trim(),
      color: textColor,
      x: 50,
      y: 40,
    };
    setOverlayItems(prev => [...prev, newItem]);
    setTextInput('');
  };

  const addStickerOverlay = (sticker: string) => {
    const newItem: StoryOverlayItem = {
      id: 'sticker_' + Date.now(),
      type: 'sticker',
      content: sticker,
      x: 50,
      y: 50,
    };
    setOverlayItems(prev => [...prev, newItem]);
  };

  const addTagOverlay = (friendName: string) => {
    if (!friendName) return;
    // Check if tag already exists
    if (overlayItems.some(i => i.type === 'tag' && i.content === friendName)) {
      showAlert('Ami déjà identifié.');
      return;
    }
    const newItem: StoryOverlayItem = {
      id: 'tag_' + Date.now(),
      type: 'tag',
      content: friendName,
      x: 50,
      y: 60,
    };
    setOverlayItems(prev => [...prev, newItem]);
    setTagFriendId('');
  };

  const addMusicOverlay = (song: typeof MUSIC_TRACKS[0]) => {
    // Only allow one music track attached
    const filtered = overlayItems.filter(item => item.type !== 'music');
    const newItem: StoryOverlayItem = {
      id: 'music_' + Date.now(),
      type: 'music',
      content: song.title,
      subContent: song.artist,
      x: 50,
      y: 30,
    };
    setOverlayItems([...filtered, newItem]);
    setAttachedSong(song);
  };

  const removeOverlayItem = (id: string) => {
    const item = overlayItems.find(i => i.id === id);
    if (item?.type === 'music') {
      setAttachedSong(null);
    }
    setOverlayItems(prev => prev.filter(i => i.id !== id));
  };

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    setDraggedItemId(itemId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedItemId || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const constrainedX = Math.max(5, Math.min(95, x));
    const constrainedY = Math.max(5, Math.min(95, y));

    setOverlayItems(prev => 
      prev.map(item => 
        item.id === draggedItemId 
          ? { ...item, x: constrainedX, y: constrainedY } 
          : item
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedItemId(null);
  };

  // Audio preview playback
  const togglePlayPreview = (song: typeof MUSIC_TRACKS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewSongId === song.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPreviewSongId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(song.url);
      audio.volume = 0.4;
      audio.play().catch(err => console.log('Autoplay blocked:', err));
      audioRef.current = audio;
      setPreviewSongId(song.id);

      audio.onended = () => {
        setPreviewSongId(null);
      };
    }
  };

  // Render overlay elements onto a single JPEG canvas image
  const generateFinalImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context');

      const drawOverlays = () => {
        overlayItems.forEach(item => {
          const itemX = (item.x / 100) * canvas.width;
          const itemY = (item.y / 100) * canvas.height;

          if (item.type === 'text') {
            ctx.save();
            ctx.font = 'bold 38px sans-serif';
            ctx.fillStyle = item.color || '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(item.content, itemX, itemY);
            ctx.restore();
          } else if (item.type === 'sticker') {
            ctx.save();
            ctx.font = '76px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.content, itemX, itemY);
            ctx.restore();
          } else if (item.type === 'tag') {
            ctx.save();
            ctx.font = 'bold 24px sans-serif';
            const text = `🏷️ ${item.content}`;
            const textWidth = ctx.measureText(text).width;
            const px = 22;
            const py = 12;
            const w = textWidth + px * 2;
            const h = 24 + py * 2;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(itemX - w / 2, itemY - h / 2, w, h, 18);
            else ctx.rect(itemX - w / 2, itemY - h / 2, w, h);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, itemX, itemY);
            ctx.restore();
          } else if (item.type === 'music') {
            ctx.save();
            ctx.font = 'bold 22px sans-serif';
            const titleText = `🎵 ${item.content}`;
            const subtitleText = item.subContent || '';
            const textWidth = Math.max(ctx.measureText(titleText).width, ctx.measureText(subtitleText).width);
            const px = 24;
            const py = 18;
            const w = textWidth + px * 2;
            const h = 60 + py * 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(itemX - w / 2, itemY - h / 2, w, h, 20);
            else ctx.rect(itemX - w / 2, itemY - h / 2, w, h);
            ctx.fill();

            // Border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Song Title
            ctx.fillStyle = '#0F172A';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(titleText, itemX, itemY - 24);

            // Artist
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText(subtitleText, itemX, itemY + 8);
            ctx.restore();
          }
        });

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };

      if (bgType === 'color') {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, selectedGradient.colors[0]);
        gradient.addColorStop(1, selectedGradient.colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawOverlays();
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = mediaUrl;
        img.onload = () => {
          const imgRatio = img.width / img.height;
          const canvasRatio = canvas.width / canvas.height;
          let dw = canvas.width;
          let dh = canvas.height;
          let ox = 0;
          let oy = 0;

          if (imgRatio > canvasRatio) {
            dw = canvas.height * imgRatio;
            ox = (canvas.width - dw) / 2;
          } else {
            dh = canvas.width / imgRatio;
            oy = (canvas.height - dh) / 2;
          }

          ctx.drawImage(img, ox, oy, dw, dh);
          drawOverlays();
        };
        img.onerror = () => reject('Failed to load image');
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      try {
        const finalDataUrl = await generateFinalImage();
        const formData = new FormData();
        formData.append('media_url', finalDataUrl);
        formData.append('media_type', 'image'); // Story is rendered to single image

        if (attachedSong) {
          formData.append('music_url', attachedSong.url);
          formData.append('music_title', attachedSong.title);
          formData.append('music_artist', attachedSong.artist);
        }

        const res = await createStory(null, formData);
        if (res?.success) {
          // Optimistic update: notify parent immediately before server re-render
          if (onStoryAdded) {
            onStoryAdded(
              finalDataUrl,
              attachedSong?.url,
              attachedSong?.title,
              attachedSong?.artist,
            );
          }
          showAlert('Votre story a été publiée avec succès ! 🎉');
          handleClose();
        } else {
          showAlert(res?.message || 'Erreur lors de la publication.');
        }
      } catch (err) {
        console.error(err);
        showAlert('Erreur lors du rendu de la story.');
      }
    });
  };

  const filteredMusic = MUSIC_TRACKS.filter(track => 
    track.title.toLowerCase().includes(musicSearchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(musicSearchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className={`${editorMode === 'edit' ? 'sm:max-w-4xl h-[650px]' : 'sm:max-w-md'} bg-white border border-slate-205 shadow-xl rounded-2xl p-0 overflow-hidden flex flex-col`}>
        
        {/* En-tête uniquement en mode choix */}
        {editorMode === 'choose' && (
          <div className="p-5 border-b border-slate-100 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Créer une story</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Sélectionnez le type de story que vous souhaitez partager.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-6">
              {/* Photo Story */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border border-slate-200 hover:border-blue-500 hover:bg-slate-50/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all shadow-xs"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoStoryUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center transition-all group-hover:scale-105 shadow-xs">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700">Story Photo</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">Partagez un fichier photo</p>
                </div>
              </div>

              {/* Text Story */}
              <div 
                onClick={startTextStory}
                className="group border border-slate-200 hover:border-blue-500 hover:bg-slate-50/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all shadow-xs"
              >
                <div className="h-12 w-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center transition-all group-hover:scale-105 shadow-xs">
                  <Type className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700">Story Texte</p>
                  <p className="text-[10px] text-slate-405 mt-1 leading-tight">Commencez avec un fond de couleur</p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-shrink-0">
              <Button type="button" variant="outline" onClick={handleClose} className="h-9 rounded-xl border-slate-200 text-slate-500 font-bold text-xs">
                Annuler
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Mode Éditeur Interactif Split-Screen */}
        {editorMode === 'edit' && (
          <div className="flex flex-1 min-h-0 w-full">
            
            {/* Sidebar gauche (Édition des paramètres) */}
            <aside className="w-[320px] bg-slate-50 border-r border-slate-200 flex flex-col p-5 overflow-y-auto space-y-6 flex-shrink-0 h-full justify-between">
              
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Paramètres de la story</h2>
                  <p className="text-[10px] text-slate-450 mt-0.5 font-medium">Personnalisez votre contenu</p>
                </div>

                {/* 1. Gradient Background Selector (si story texte) */}
                {bgType === 'color' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Fond de couleur</span>
                    <div className="flex flex-wrap gap-2">
                      {GRADIENTS.map(grad => (
                        <button
                          key={grad.name}
                          onClick={() => setSelectedGradient(grad)}
                          className={`h-7 w-7 rounded-full shadow-xs transition-transform hover:scale-110 active:scale-95 ${
                            selectedGradient.name === grad.name ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : ''
                          }`}
                          style={{ background: `linear-gradient(135deg, ${grad.colors[0]}, ${grad.colors[1]})` }}
                          title={grad.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Text Addition Tool */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Ajouter du Texte</span>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                      placeholder="Saisir votre texte..."
                      className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500/50"
                    />
                    
                    {/* Text Colors */}
                    <div className="flex items-center gap-1.5 py-0.5 pl-0.5">
                      {['#FFFFFF', '#000000', '#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#EC4899'].map(color => (
                        <button
                          key={color}
                          onClick={() => setTextColor(color)}
                          className={`h-4.5 w-4.5 rounded-full border border-slate-300 shadow-xs transition-transform hover:scale-110 ${
                            textColor === color ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <Button 
                      onClick={addTextOverlay}
                      disabled={!textInput.trim()}
                      className="h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] w-full"
                    >
                      Ajouter le texte
                    </Button>
                  </div>
                </div>

                {/* 3. Sticker Selection Grid */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Ajouter des Emojis</span>
                  <div className="grid grid-cols-6 gap-2.5 p-2 bg-white border border-slate-200 rounded-xl max-h-24 overflow-y-auto scrollbar-hide">
                    {STICKERS.map(sticker => (
                      <button
                        key={sticker}
                        onClick={() => addStickerOverlay(sticker)}
                        className="text-xl hover:scale-125 transition-transform active:scale-95 flex items-center justify-center"
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Tag Friends list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Identifier des Amis</span>
                  <div className="flex gap-2">
                    <select
                      value={tagFriendId}
                      onChange={e => setTagFriendId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="">Sélectionner un ami...</option>
                      {FRIENDS_LIST.map(friend => (
                        <option key={friend.id} value={friend.name}>{friend.name}</option>
                      ))}
                    </select>
                    <Button 
                      onClick={() => addTagOverlay(tagFriendId)}
                      disabled={!tagFriendId}
                      className="h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px]"
                    >
                      Identifier
                    </Button>
                  </div>
                </div>

                {/* 5. Music selector (Facebook style) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Musique (Facebook style)</span>
                  <input
                    type="text"
                    value={musicSearchQuery}
                    onChange={e => setMusicSearchQuery(e.target.value)}
                    placeholder="Rechercher une chanson..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500/50 mb-1.5"
                  />
                  <div className="space-y-1 bg-white border border-slate-200 rounded-xl max-h-36 overflow-y-auto scrollbar-hide p-1">
                    {filteredMusic.length === 0 ? (
                      <div className="text-[9px] text-slate-400 text-center py-4">Aucune musique trouvée</div>
                    ) : (
                      filteredMusic.map(song => {
                        const isPlaying = previewSongId === song.id;
                        const isAttached = attachedSong?.id === song.id;
                        return (
                          <div 
                            key={song.id}
                            onClick={() => addMusicOverlay(song)}
                            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all hover:bg-slate-50 ${
                              isAttached ? 'bg-blue-50 hover:bg-blue-50 border border-blue-200/50' : 'border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={song.art} className="h-7 w-7 rounded-md object-cover flex-shrink-0 shadow-xs" alt="" />
                              <div className="flex flex-col min-w-0 leading-tight">
                                <span className="text-[10px] font-bold text-slate-800 truncate">{song.title}</span>
                                <span className="text-[8px] text-slate-400 font-semibold truncate">{song.artist}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => togglePlayPreview(song, e)}
                              className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                                isPlaying ? 'bg-rose-500 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-650'
                              }`}
                              title={isPlaying ? 'Pause preview' : 'Ecouter'}
                            >
                              {isPlaying ? <Pause className="h-3 w-3 stroke-[2.5]" /> : <Play className="h-3 w-3 fill-slate-650 stroke-none ml-0.5" />}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-200 flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="flex-1 h-9 rounded-xl border-slate-200 text-slate-500 font-bold text-xs"
                >
                  Retour
                </Button>
                <Button 
                  type="button" 
                  onClick={handlePublish} 
                  disabled={isPending}
                  className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Partager'
                  )}
                </Button>
              </div>
            </aside>

            {/* Zone de preview droite */}
            <main className="flex-1 bg-slate-900 flex items-center justify-center p-4 relative min-h-0 h-full">
              {/* Visual Frame 9:16 layout */}
              <div 
                ref={previewRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative w-[300px] h-[520px] rounded-2xl shadow-2xl overflow-hidden border border-zinc-800 flex flex-col justify-between select-none z-10"
                style={{
                  background: bgType === 'color' 
                    ? `linear-gradient(180deg, ${selectedGradient.colors[0]}, ${selectedGradient.colors[1]})`
                    : 'none'
                }}
              >
                {/* Image Background */}
                {bgType === 'image' && mediaUrl && (
                  <img src={mediaUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="" />
                )}

                {/* Header Mockup */}
                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full border border-white/20 overflow-hidden bg-slate-900">
                      {currentUser?.avatar_url && <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <span className="text-[10px] font-bold text-white shadow-xs">Votre story (Aperçu)</span>
                  </div>
                </div>

                {/* Overlays rendering */}
                {overlayItems.map(item => (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleMouseDown(e, item.id)}
                    style={{
                      position: 'absolute',
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'move',
                      zIndex: 20,
                    }}
                    className="group relative select-none"
                  >
                    {/* Hover delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeOverlayItem(item.id); }}
                      className="absolute -top-3 -right-3 h-4.5 w-4.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-md border border-white/10"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>

                    {item.type === 'text' && (
                      <span
                        style={{ color: item.color || '#FFFFFF' }}
                        className="text-sm font-extrabold drop-shadow-md whitespace-nowrap bg-black/20 px-2 py-0.5 rounded-md border border-white/5"
                      >
                        {item.content}
                      </span>
                    )}

                    {item.type === 'sticker' && (
                      <span className="text-4xl drop-shadow-sm">{item.content}</span>
                    )}

                    {item.type === 'tag' && (
                      <span className="bg-black/70 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1 shadow-md border border-white/10">
                        🏷️ {item.content}
                      </span>
                    )}

                    {item.type === 'music' && (
                      <div className="bg-white/95 text-slate-800 px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2 select-none pointer-events-none whitespace-nowrap">
                        <span className="text-[10px]">🎵</span>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[9px] font-black truncate">{item.content}</span>
                          <span className="text-[7px] text-slate-500 font-bold truncate">{item.subContent}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="absolute bottom-4 text-[10px] text-zinc-400 font-semibold bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                Glissez les éléments pour changer leur position
              </div>
            </main>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
