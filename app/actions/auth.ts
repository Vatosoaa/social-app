'use server';

import { sql } from '@vercel/postgres';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { createSession, deleteSession, getCurrentUser } from '@/lib/session';
import { SignupSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema, ProfileSchema, FormState } from '@/lib/definitions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function signup(state: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = SignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validatedFields.data;
  const passwordHash = hashPassword(password);
  let userId: number | null = null;

  try {
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    if (existingUser.rows.length > 0) {
      return {
        errors: {
          email: ['Cette adresse e-mail est déjà utilisée.'],
        },
      };
    }

    const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
    const result = await sql`
      INSERT INTO users (name, email, password_hash, avatar_url, bio)
      VALUES (${name}, ${email}, ${passwordHash}, ${defaultAvatar}, '')
      RETURNING id
    `;
    
    if (result.rows.length > 0) {
      userId = result.rows[0].id;
    }
  } catch (error) {
    console.error('Signup database error:', error);
    return {
      message: 'Une erreur est survenue lors de la création du compte.',
    };
  }

  if (userId) {
    await createSession(userId);
    redirect('/');
  }

  return { message: 'Une erreur est survenue.' };
}

export async function login(state: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;
  let userId: number | null = null;

  try {
    const result = await sql`
      SELECT id, password_hash FROM users WHERE email = ${email}
    `;

    if (result.rows.length === 0) {
      return {
        message: 'Identifiants de connexion incorrects.',
      };
    }

    const user = result.rows[0];
    const passwordMatch = verifyPassword(password, user.password_hash);

    if (!passwordMatch) {
      return {
        message: 'Identifiants de connexion incorrects.',
      };
    }

    userId = user.id;
  } catch (error) {
    console.error('Login database error:', error);
    return {
      message: 'Une erreur est survenue lors de la connexion.',
    };
  }

  if (userId) {
    await createSession(userId);
    redirect('/');
  }

  return { message: 'Une erreur est survenue.' };
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}

export async function forgotPassword(state: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = ForgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email } = validatedFields.data;
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour

  try {
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (userResult.rows.length === 0) {
      return {
        message: 'Si cet e-mail existe dans notre système, un lien de réinitialisation vous a été envoyé.',
        success: true,
      };
    }

    await sql`
      UPDATE users
      SET reset_token = ${token}, reset_token_expires = ${expires.toISOString()}
      WHERE email = ${email}
    `;

    return {
      message: 'Si cet e-mail existe dans notre système, un lien de réinitialisation vous a été envoyé.',
      success: true,
      devToken: token,
    };
  } catch (error) {
    console.error('Forgot password error:', error);
    return {
      message: 'Une erreur est survenue.',
    };
  }
}

export async function resetPassword(state: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = ResetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { token, password } = validatedFields.data;
  const newHash = hashPassword(password);
  let isSuccessful = false;

  try {
    const userResult = await sql`
      SELECT id, reset_token_expires FROM users WHERE reset_token = ${token}
    `;

    if (userResult.rows.length === 0) {
      return {
        message: 'Jeton de réinitialisation invalide ou expiré.',
      };
    }

    const user = userResult.rows[0];
    const expiry = new Date(user.reset_token_expires);

    if (expiry < new Date()) {
      return {
        message: 'Le jeton de réinitialisation a expiré.',
      };
    }

    await sql`
      UPDATE users
      SET password_hash = ${newHash}, reset_token = NULL, reset_token_expires = NULL
      WHERE id = ${user.id}
    `;
    
    isSuccessful = true;
  } catch (error) {
    console.error('Reset password database error:', error);
    return {
      message: 'Une erreur est survenue lors de la réinitialisation du mot de passe.',
    };
  }

  if (isSuccessful) {
    redirect('/login?reset=success');
  }

  return { message: 'Une erreur est survenue.' };
}

export async function updateProfile(state: FormState, formData: FormData): Promise<FormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      message: 'Non autorisé.',
    };
  }

  const validatedFields = ProfileSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio'),
    avatar_url: formData.get('avatar_url'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, bio, avatar_url } = validatedFields.data;

  try {
    await sql`
      UPDATE users
      SET name = ${name}, bio = ${bio || ''}, avatar_url = ${avatar_url || ''}
      WHERE id = ${currentUser.id}
    `;
    
    revalidatePath('/profile');
    return {
      success: true,
      message: 'Profil mis à jour avec succès !',
    };
  } catch (error) {
    console.error('Update profile database error:', error);
    return {
      message: 'Une erreur est survenue lors de la mise à jour du profil.',
    };
  }
}
