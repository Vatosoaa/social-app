import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { cache } from 'react';

const secretKey = process.env.SESSION_SECRET || 'default-very-secure-secret-key-32-chars-long';
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  userId: number;
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ userId: payload.userId, expiresAt: payload.expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    console.log('Failed to verify session:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function createSession(userId: number) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function updateSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const payload = await decrypt(session);

  if (!session || !payload) {
    return null;
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export interface DbUser {
  id: number;
  email: string;
  name: string;
  bio: string;
  avatar_url: string;
  role?: string;
  experience_level?: string;
  favorite_artists?: string;
  favorite_genre?: string;
  software_equipment?: string;
  music_mood?: string;
  city_region?: string;
  availability?: string;
  badges?: string;
  tags?: string;
  social_youtube?: string;
  social_instagram?: string;
  social_tiktok?: string;
  social_facebook?: string;
  social_gmail?: string;
  birthday?: string;
  school?: string;
  workplace?: string;
  gender_pronouns?: string;
  relationship_status?: string;
  languages?: string;
  job_title?: string;
  skills?: string;
  phone?: string;
  hometown?: string;
  website?: string;
  social_linkedin?: string;
  hobbies?: string;
  interests?: string;
  cover_url?: string;
}

/**
 * Helper to fetch the current authenticated user from the database.
 * Cached per-request so multiple calls within the same render don't re-query the DB.
 */
export const getCurrentUser = cache(async (): Promise<DbUser | null> => {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const payload = await decrypt(session);

  if (!payload || !payload.userId) {
    return null;
  }

  try {
    const { rows } = await sql`
      SELECT 
        id, email, name, bio, avatar_url,
        role, experience_level, favorite_artists, favorite_genre,
        software_equipment, music_mood, city_region, availability,
        badges, tags, social_youtube, social_instagram, social_tiktok,
        social_facebook, social_gmail, birthday::text as birthday, school, workplace,
        gender_pronouns, relationship_status, languages, job_title, skills,
        phone, hometown, website, social_linkedin, hobbies, interests, cover_url
      FROM users WHERE id = ${payload.userId}
    `;
    if (rows && rows.length > 0) {
      return rows[0] as DbUser;
    }
  } catch (error) {
    console.error('Failed to retrieve current user from DB:', error);
  }

  return null;
});
