'use server';

import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface FollowUser {
  id: number;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_following: boolean;
}

export async function toggleFollow(targetUserId: number): Promise<{ success: boolean; following?: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté pour suivre un utilisateur.' };
  }

  if (currentUser.id === targetUserId) {
    return { success: false, message: 'Vous ne pouvez pas vous abonner à vous-même.' };
  }

  try {
    const checkFollow = await sql`
      SELECT id FROM follows WHERE follower_id = ${currentUser.id} AND following_id = ${targetUserId}
    `;

    let following = false;
    if (checkFollow.rows.length > 0) {
      await sql`
        DELETE FROM follows WHERE follower_id = ${currentUser.id} AND following_id = ${targetUserId}
      `;
      await sql`
        DELETE FROM notifications 
        WHERE recipient_id = ${targetUserId} AND notifier_id = ${currentUser.id} AND type = 'follow'
      `;
      following = false;
    } else {
      await sql`
        INSERT INTO follows (follower_id, following_id) VALUES (${currentUser.id}, ${targetUserId})
      `;
      await sql`
        INSERT INTO notifications (recipient_id, notifier_id, type)
        VALUES (${targetUserId}, ${currentUser.id}, 'follow')
      `;
      following = true;
    }

    revalidatePath('/');
    revalidatePath(`/profile`);
    revalidatePath(`/profile/${targetUserId}`);
    return { success: true, following };
  } catch (error) {
    console.error('Error toggling follow:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

export async function getFollowers(userId: number): Promise<FollowUser[]> {
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id || 0;

  try {
    const res = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.bio, 
        u.avatar_url,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = ${currentUserId} AND following_id = u.id) AS is_following
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ${userId}
      ORDER BY f.created_at DESC
    `;
    return res.rows as FollowUser[];
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
}

export async function getFollowing(userId: number): Promise<FollowUser[]> {
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id || 0;

  try {
    const res = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.bio, 
        u.avatar_url,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = ${currentUserId} AND following_id = u.id) AS is_following
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ${userId}
      ORDER BY f.created_at DESC
    `;
    return res.rows as FollowUser[];
  } catch (error) {
    console.error('Error getting following:', error);
    return [];
  }
}

export async function getSuggestions(): Promise<FollowUser[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const res = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.bio, 
        u.avatar_url,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS followers_count
      FROM users u
      WHERE u.id <> ${currentUser.id}
        AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ${currentUser.id})
      ORDER BY followers_count DESC, u.created_at DESC
      LIMIT 5
    `;
    return res.rows.map(row => ({ ...row, is_following: false })) as FollowUser[];
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
}
