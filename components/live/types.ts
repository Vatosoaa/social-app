// Shared types for the Live Studio components

export type Privacy = 'public' | 'subscribers' | 'private';

export interface Viewer {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
  isBanned?: boolean;
}

export interface ChatMsg {
  id: string;
  userId?: string;
  name: string;
  avatar: string;
  text: string;
  time: string;
  isPinned?: boolean;
  isSystem?: boolean;
  isDeleted?: boolean;
  reaction?: string;
}

export interface Guest {
  id: string;
  name: string;
  avatar: string;
  status: 'pending' | 'active' | 'declined';
  isMuted?: boolean;
}

export interface ScheduledLive {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  privacy: Privacy;
}

export interface LiveStats {
  totalViews: number;
  peakViewers: number;
  duration: number;
  totalComments: number;
  totalReactions: number;
  avgWatchTime: number;
}

export const MOCK_NAMES = [
  'Léa Martin', 'Thomas Dubois', 'Sarah Ben', 'Marc Lefevre', 'Emma Petit',
  'Lucas Roux', 'Chloé Garcia', 'Antoine Morel', 'Clara Vincent', 'Hugo Robin',
  'Camille Durand', 'Julien Blanc', 'Sophie Lemaire', 'Nicolas Renaud',
];

export const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
];

export const MOCK_COMMENTS = [
  'Trop cool ce live ! 🔥',
  'La qualité est superbe ! 👍',
  'Bonjour de Paris ! 👋',
  "Quel sujet aujourd'hui ?",
  'Incroyable ce partage d\'écran !',
  'Tu utilises quoi comme micro ? 🎙️',
  'Merci pour le partage ! 🙌',
  'Est-ce que le live sera enregistré ?',
  "C'est super intéressant ! ❤️",
  'Design de fou ! 😍',
  '@Léa Martin tu as vu ce live ?',
  'Excellent contenu comme toujours 💯',
];

export const SPAM_WORDS = ['spam', 'arnaque', 'escroquerie', 'pub', 'promo'];

export const REACTIONS = ['❤️', '👍', '😂', '😮', '🔥', '👏'];
