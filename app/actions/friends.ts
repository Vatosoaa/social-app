'use server';

import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface FriendUser {
  id: number;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  city_region: string | null;
  school: string | null;
  workplace: string | null;
  birthday?: string | null;
  is_online?: boolean;
  time?: string;
}

export interface FriendRequest {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  sender_role: string | null;
  created_at: string;
}

export interface FriendSuggestion {
  id: number;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  city_region: string | null;
  school: string | null;
  workplace: string | null;
  mutual_friends_count: number;
  has_sent_request: boolean;
  has_received_request: boolean;
  reason: string;
  score: number;
}

/**
 * Get pending friend requests received by the current user
 */
export async function getFriendRequests(): Promise<FriendRequest[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const res = await sql`
      SELECT 
        fr.id,
        fr.sender_id,
        u.name AS sender_name,
        u.avatar_url AS sender_avatar,
        u.role AS sender_role,
        fr.created_at::text AS created_at
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = ${currentUser.id} AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `;
    return res.rows as FriendRequest[];
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
}

/**
 * Get all friends of the current user, optionally filtered by a search query
 */
export async function getFriends(query: string = ''): Promise<FriendUser[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const searchQuery = `%${query}%`;
    const res = await sql`
      SELECT DISTINCT
        u.id,
        u.name,
        u.avatar_url,
        u.bio,
        u.role,
        u.city_region,
        u.school,
        u.workplace,
        u.birthday::text as birthday
      FROM friendships f
      JOIN users u ON (f.user_id1 = u.id OR f.user_id2 = u.id)
      WHERE 
        (f.user_id1 = ${currentUser.id} OR f.user_id2 = ${currentUser.id})
        AND u.id <> ${currentUser.id}
        AND (${query === ''} OR LOWER(u.name) LIKE LOWER(${searchQuery}))
      ORDER BY u.name ASC
    `;
    // Add mock online status and active time for the sidebar
    return res.rows.map((row, idx) => ({
      ...row,
      is_online: idx % 3 === 0,
      time: idx % 3 === 0 ? 'online' : `${idx * 4 + 3} min`,
    })) as FriendUser[];
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
}

/**
 * Get friends celebrating their birthday today
 */
export async function getBirthdaysToday(): Promise<FriendUser[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const res = await sql`
      SELECT DISTINCT
        u.id,
        u.name,
        u.avatar_url,
        u.birthday::text as birthday
      FROM friendships f
      JOIN users u ON (f.user_id1 = u.id OR f.user_id2 = u.id)
      WHERE 
        (f.user_id1 = ${currentUser.id} OR f.user_id2 = ${currentUser.id})
        AND u.id <> ${currentUser.id}
        AND u.birthday IS NOT NULL
        AND EXTRACT(MONTH FROM u.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM u.birthday) = EXTRACT(DAY FROM CURRENT_DATE)
    `;
    return res.rows as FriendUser[];
  } catch (error) {
    console.error('Error fetching today\'s birthdays:', error);
    return [];
  }
}

/**
 * Get friend suggestions based on mutual friends, city, school, or workplace
 */
export async function getFriendSuggestions(): Promise<FriendSuggestion[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const currentUserId = currentUser.id;
    const currentCity = currentUser.city_region || '';
    const currentSchool = currentUser.school || '';
    const currentWorkplace = currentUser.workplace || '';

    // Fetch users who are:
    // 1. Not the current user
    // 2. Not already friends with current user
    const res = await sql`
      SELECT 
        u.id,
        u.name,
        u.avatar_url,
        u.bio,
        u.role,
        u.city_region,
        u.school,
        u.workplace,
        
        -- Compute mutual friends count
        (
          SELECT COUNT(*)::int
          FROM friendships f1
          JOIN friendships f2 ON 
            (CASE WHEN f1.user_id1 = ${currentUserId} THEN f1.user_id2 ELSE f1.user_id1 END) = 
            (CASE WHEN f2.user_id1 = u.id THEN f2.user_id2 ELSE f2.user_id1 END)
          WHERE 
            (f1.user_id1 = ${currentUserId} OR f1.user_id2 = ${currentUserId})
            AND (f2.user_id1 = u.id OR f2.user_id2 = u.id)
            -- Exclude self and candidate from mutual friend list
            AND (CASE WHEN f1.user_id1 = ${currentUserId} THEN f1.user_id2 ELSE f1.user_id1 END) <> ${currentUserId}
            AND (CASE WHEN f1.user_id1 = ${currentUserId} THEN f1.user_id2 ELSE f1.user_id1 END) <> u.id
        ) AS mutual_friends_count,

        -- Check if a friend request exists
        EXISTS(SELECT 1 FROM friend_requests WHERE sender_id = ${currentUserId} AND receiver_id = u.id) AS has_sent_request,
        EXISTS(SELECT 1 FROM friend_requests WHERE sender_id = u.id AND receiver_id = ${currentUserId}) AS has_received_request
        
      FROM users u
      WHERE 
        u.id <> ${currentUserId}
        
        -- Not already friends
        AND NOT EXISTS(
          SELECT 1 FROM friendships 
          WHERE (user_id1 = ${currentUserId} AND user_id2 = u.id)
             OR (user_id1 = u.id AND user_id2 = ${currentUserId})
        )
      LIMIT 30
    `;

    const rawSuggestions = res.rows as any[];

    // Map and score/filter suggestions based on shared criteria
    const suggestions: FriendSuggestion[] = rawSuggestions.map(row => {
      let score = 0;
      const reasons: string[] = [];

      if (row.mutual_friends_count > 0) {
        score += row.mutual_friends_count * 5;
        reasons.push(`${row.mutual_friends_count} ami(s) commun(s)`);
      }

      if (currentCity && row.city_region && currentCity.trim().toLowerCase() === row.city_region.trim().toLowerCase()) {
        score += 3;
        reasons.push(`Habite à ${row.city_region}`);
      }

      if (currentSchool && row.school && currentSchool.trim().toLowerCase() === row.school.trim().toLowerCase()) {
        score += 2;
        reasons.push(`A étudié à ${row.school}`);
      }

      if (currentWorkplace && row.workplace && currentWorkplace.trim().toLowerCase() === row.workplace.trim().toLowerCase()) {
        score += 2;
        reasons.push(`Travaille chez ${row.workplace}`);
      }

      // Default reason if no criteria matched
      const reason = reasons.length > 0 ? reasons.join(' • ') : 'Suggéré pour vous';

      return {
        id: row.id,
        name: row.name,
        avatar_url: row.avatar_url,
        bio: row.bio,
        role: row.role,
        city_region: row.city_region,
        school: row.school,
        workplace: row.workplace,
        mutual_friends_count: row.mutual_friends_count,
        has_sent_request: row.has_sent_request,
        has_received_request: row.has_received_request,
        reason,
        score
      };
    });

    // Sort by score DESC
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions;
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(targetUserId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: 'Non autorisé.' };

  try {
    // Check if request or friendship already exists
    const checkRequest = await sql`
      SELECT id FROM friend_requests 
      WHERE (sender_id = ${currentUser.id} AND receiver_id = ${targetUserId})
         OR (sender_id = ${targetUserId} AND receiver_id = ${currentUser.id})
    `;
    if (checkRequest.rows.length > 0) {
      return { success: false, message: 'Une invitation ou amitié existe déjà.' };
    }

    // Insert request
    await sql`
      INSERT INTO friend_requests (sender_id, receiver_id, status)
      VALUES (${currentUser.id}, ${targetUserId}, 'pending')
    `;

    // Create notification
    await sql`
      INSERT INTO notifications (recipient_id, notifier_id, type)
      VALUES (${targetUserId}, ${currentUser.id}, 'friend_request')
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

/**
 * Accept an incoming friend request
 */
export async function acceptFriendRequest(requestId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: 'Non autorisé.' };

  try {
    // Find request details
    const requestRes = await sql`
      SELECT sender_id, receiver_id FROM friend_requests WHERE id = ${requestId}
    `;

    if (requestRes.rows.length === 0) {
      return { success: false, message: 'Invitation introuvable.' };
    }

    const request = requestRes.rows[0];
    if (request.receiver_id !== currentUser.id) {
      return { success: false, message: 'Non autorisé à accepter cette invitation.' };
    }

    const id1 = Math.min(request.sender_id, currentUser.id);
    const id2 = Math.max(request.sender_id, currentUser.id);

    // Insert friendship
    await sql`
      INSERT INTO friendships (user_id1, user_id2)
      VALUES (${id1}, ${id2})
      ON CONFLICT (user_id1, user_id2) DO NOTHING
    `;

    // Delete request
    await sql`
      DELETE FROM friend_requests WHERE id = ${requestId}
    `;

    // Remove the friend_request notification
    await sql`
      DELETE FROM notifications 
      WHERE recipient_id = ${currentUser.id} AND notifier_id = ${request.sender_id} AND type = 'friend_request'
    `;

    // Create confirmation notification
    await sql`
      INSERT INTO notifications (recipient_id, notifier_id, type)
      VALUES (${request.sender_id}, ${currentUser.id}, 'friend_accept')
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

/**
 * Decline/Delete an incoming friend request
 */
export async function declineFriendRequest(requestId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: 'Non autorisé.' };

  try {
    // Find request details
    const requestRes = await sql`
      SELECT sender_id, receiver_id FROM friend_requests WHERE id = ${requestId}
    `;

    if (requestRes.rows.length === 0) {
      return { success: false, message: 'Invitation introuvable.' };
    }

    const request = requestRes.rows[0];
    if (request.receiver_id !== currentUser.id) {
      return { success: false, message: 'Non autorisé.' };
    }

    // Delete request
    await sql`
      DELETE FROM friend_requests WHERE id = ${requestId}
    `;

    // Delete notification
    await sql`
      DELETE FROM notifications 
      WHERE recipient_id = ${currentUser.id} AND notifier_id = ${request.sender_id} AND type = 'friend_request'
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error declining friend request:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

/**
 * Cancel a sent friend request
 */
export async function cancelFriendRequest(targetUserId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: 'Non autorisé.' };

  try {
    // Delete request
    await sql`
      DELETE FROM friend_requests 
      WHERE sender_id = ${currentUser.id} AND receiver_id = ${targetUserId}
    `;

    // Delete notification
    await sql`
      DELETE FROM notifications 
      WHERE recipient_id = ${targetUserId} AND notifier_id = ${currentUser.id} AND type = 'friend_request'
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

/**
 * Unfriend a user
 */
export async function unfriend(friendId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: 'Non autorisé.' };

  try {
    const id1 = Math.min(currentUser.id, friendId);
    const id2 = Math.max(currentUser.id, friendId);

    // Delete friendship
    await sql`
      DELETE FROM friendships 
      WHERE user_id1 = ${id1} AND user_id2 = ${id2}
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error unfriending:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}
