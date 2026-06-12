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
  avatar_url: z.string().url({ message: 'Veuillez entrer une URL d image valide.' }).optional().or(z.literal('')),
});

export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        bio?: string[];
        avatar_url?: string[];
      };
      message?: string;
      success?: boolean;
      devToken?: string; // Used to display the reset token in local dev UI
    }
  | undefined;
