import { z } from 'zod';

export const SignupSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères.' }).trim(),
  email: z.string().email({ message: 'Veuillez entrer une adresse e-mail valide.' }).trim(),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }).trim(),
});

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Veuillez entrer une adresse e-mail valide.' }).trim(),
  password: z.string().min(1, { message: 'Le mot de passe est requis.' }),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Veuillez entrer une adresse e-mail valide.' }).trim(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Jeton de réinitialisation invalide.' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }).trim(),
});

export const ProfileSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères.' }).trim(),
  bio: z.string().max(200, { message: 'La biographie ne peut pas dépasser 200 caractères.' }).optional().or(z.literal('')),
  avatar_url: z.string().optional().or(z.literal('')),
  role: z.string().max(100).optional().or(z.literal('')),
  experience_level: z.string().max(100).optional().or(z.literal('')),
  favorite_artists: z.string().max(255).optional().or(z.literal('')),
  favorite_genre: z.string().max(100).optional().or(z.literal('')),
  software_equipment: z.string().max(100).optional().or(z.literal('')),
  music_mood: z.string().max(100).optional().or(z.literal('')),
  city_region: z.string().max(100).optional().or(z.literal('')),
  availability: z.string().max(100).optional().or(z.literal('')),
  badges: z.string().max(500).optional().or(z.literal('')),
  tags: z.string().max(500).optional().or(z.literal('')),
  social_youtube: z.string().optional().or(z.literal('')),
  social_instagram: z.string().optional().or(z.literal('')),
  social_tiktok: z.string().optional().or(z.literal('')),
  social_facebook: z.string().optional().or(z.literal('')),
  social_gmail: z.string().optional().or(z.literal('')),
  birthday: z.string().optional().or(z.literal('')),
  school: z.string().max(255).optional().or(z.literal('')),
  workplace: z.string().max(255).optional().or(z.literal('')),
  gender_pronouns: z.string().max(100).optional().or(z.literal('')),
  relationship_status: z.string().max(100).optional().or(z.literal('')),
  languages: z.string().max(255).optional().or(z.literal('')),
  job_title: z.string().max(255).optional().or(z.literal('')),
  skills: z.string().max(1000).optional().or(z.literal('')),
  phone: z.string().max(100).optional().or(z.literal('')),
  hometown: z.string().max(255).optional().or(z.literal('')),
  website: z.string().max(255).optional().or(z.literal('')),
  social_linkedin: z.string().optional().or(z.literal('')),
  hobbies: z.string().max(1000).optional().or(z.literal('')),
  interests: z.string().max(1000).optional().or(z.literal('')),
  cover_url: z.string().optional().or(z.literal('')),
});

export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        bio?: string[];
        avatar_url?: string[];
        content?: string[];
        media_url?: string[];
        media_type?: string[];
      };
      message?: string;
      success?: boolean;
      devToken?: string; // Used to display the reset token in local dev UI
    }
  | undefined;

export const PostSchema = z.object({
  content: z.string().max(1000, { message: 'Le contenu ne peut pas dépasser 1000 caractères.' }).optional().or(z.literal('')),
  media_url: z.string().optional().or(z.literal('')),
  media_type: z.enum(['image', 'video', '']).optional(),
}).refine((data) => (data.content && data.content.trim().length > 0) || (data.media_url && data.media_url.trim().length > 0), {
  message: 'La publication doit avoir du texte ou un média.',
  path: ['content'],
});

export type PostFormState =
  | {
      errors?: {
        content?: string[];
        media_url?: string[];
        media_type?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

export interface Post {
  id: number;
  user_id: number;
  content: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_avatar: string | null;
  author_role?: string | null;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  user_has_favorited: boolean;
  user_reaction: string | null;
  reactions_by_type: {
    like: number;
    love: number;
    haha: number;
    wow: number;
    sad: number;
    angry: number;
  };
}

export interface DbComment {
  id: number;
  user_id: number;
  post_id: number;
  content: string;
  parent_comment_id: number | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  cover_url: string | null;
  creator_id: number;
  is_public: boolean;
  created_at: string;
  members_count: number;
  is_member: boolean;
  user_role: string | null;
}

export interface GroupMember {
  id: number;
  user_id: number;
  name: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

export interface GroupPost {
  id: number;
  group_id: number;
  user_id: number;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

export interface Story {
  id: number;
  user_id: number;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  is_viewed?: boolean;
  music_url?: string | null;
  music_title?: string | null;
  music_artist?: string | null;
}

export interface UserStoryGroup {
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  stories: Story[];
  has_unviewed: boolean;
}


