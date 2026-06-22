'use server';

import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { DbComment } from '@/lib/definitions';
import { revalidatePath } from 'next/cache';

export async function toggleLike(postId: number): Promise<{ success: boolean; liked?: boolean; count?: number; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté pour aimer une publication.' };
  }

  try {
    // Check if like exists
    const checkLike = await sql`
      SELECT id FROM likes WHERE user_id = ${currentUser.id} AND post_id = ${postId}
    `;

    let liked = false;
    if (checkLike.rows.length > 0) {
      // Remove like
      await sql`
        DELETE FROM likes WHERE user_id = ${currentUser.id} AND post_id = ${postId}
      `;
      await sql`
        DELETE FROM notifications 
        WHERE recipient_id = (SELECT user_id FROM posts WHERE id = ${postId}) 
          AND notifier_id = ${currentUser.id} 
          AND type = 'reaction' 
          AND post_id = ${postId}
      `;
      liked = false;
    } else {
      // Add like
      await sql`
        INSERT INTO likes (user_id, post_id) VALUES (${currentUser.id}, ${postId})
      `;
      await sql`
        INSERT INTO notifications (recipient_id, notifier_id, type, post_id)
        SELECT user_id, ${currentUser.id}, 'reaction', ${postId}
        FROM posts
        WHERE id = ${postId} AND user_id <> ${currentUser.id}
      `;
      liked = true;
    }

    // Get updated like count
    const countRes = await sql`
      SELECT COUNT(*)::int AS count FROM likes WHERE post_id = ${postId}
    `;
    const count = countRes.rows[0]?.count || 0;

    revalidatePath('/');
    return { success: true, liked, count };
  } catch (error) {
    console.error('Error toggling like:', error);
    return { success: false, message: 'Une erreur est survenue lors de l interaction.' };
  }
}

export async function toggleReaction(
  postId: number,
  reactionType: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'
): Promise<{
  success: boolean;
  reactions?: { like: number; love: number; haha: number; wow: number; sad: number; angry: number };
  user_reaction?: string | null;
  message?: string;
}> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté pour réagir.' };
  }

  try {
    const existing = await sql`
      SELECT id, reaction_type FROM likes WHERE user_id = ${currentUser.id} AND post_id = ${postId}
    `;

    let user_reaction: string | null = null;

    if (existing.rows.length > 0) {
      const curr = existing.rows[0].reaction_type;
      if (curr === reactionType) {
        await sql`DELETE FROM likes WHERE user_id = ${currentUser.id} AND post_id = ${postId}`;
        await sql`
          DELETE FROM notifications 
          WHERE recipient_id = (SELECT user_id FROM posts WHERE id = ${postId}) 
            AND notifier_id = ${currentUser.id} 
            AND type = 'reaction' 
            AND post_id = ${postId}
        `;
        user_reaction = null;
      } else {
        await sql`
          UPDATE likes SET reaction_type = ${reactionType}
          WHERE user_id = ${currentUser.id} AND post_id = ${postId}
        `;
        // Insert notification if not exists
        await sql`
          INSERT INTO notifications (recipient_id, notifier_id, type, post_id)
          SELECT user_id, ${currentUser.id}, 'reaction', ${postId}
          FROM posts
          WHERE id = ${postId} AND user_id <> ${currentUser.id}
            AND NOT EXISTS (
              SELECT 1 FROM notifications 
              WHERE recipient_id = posts.user_id AND notifier_id = ${currentUser.id} AND type = 'reaction' AND post_id = ${postId}
            )
        `;
        user_reaction = reactionType;
      }
    } else {
      await sql`
        INSERT INTO likes (user_id, post_id, reaction_type) VALUES (${currentUser.id}, ${postId}, ${reactionType})
      `;
      await sql`
        INSERT INTO notifications (recipient_id, notifier_id, type, post_id)
        SELECT user_id, ${currentUser.id}, 'reaction', ${postId}
        FROM posts
        WHERE id = ${postId} AND user_id <> ${currentUser.id}
          AND NOT EXISTS (
            SELECT 1 FROM notifications 
            WHERE recipient_id = posts.user_id AND notifier_id = ${currentUser.id} AND type = 'reaction' AND post_id = ${postId}
          )
      `;
      user_reaction = reactionType;
    }

    const countsRes = await sql`
      SELECT
        COUNT(*) FILTER (WHERE reaction_type = 'like')::int  AS "like",
        COUNT(*) FILTER (WHERE reaction_type = 'love')::int  AS love,
        COUNT(*) FILTER (WHERE reaction_type = 'haha')::int  AS haha,
        COUNT(*) FILTER (WHERE reaction_type = 'wow')::int   AS wow,
        COUNT(*) FILTER (WHERE reaction_type = 'sad')::int   AS sad,
        COUNT(*) FILTER (WHERE reaction_type = 'angry')::int AS angry
      FROM likes WHERE post_id = ${postId}
    `;
    const r = countsRes.rows[0];
    const reactions = {
      like: r.like || 0, love: r.love || 0, haha: r.haha || 0,
      wow: r.wow || 0,   sad: r.sad || 0,   angry: r.angry || 0,
    };

    revalidatePath('/');
    return { success: true, reactions, user_reaction };
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return { success: false, message: 'Une erreur est survenue lors de la réaction.' };
  }
}

export async function addComment(
  postId: number, 
  content: string, 
  parentCommentId: number | null = null
): Promise<{ success: boolean; comment?: DbComment; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté pour commenter.' };
  }

  if (!content || !content.trim()) {
    return { success: false, message: 'Le commentaire ne peut pas être vide.' };
  }

  try {
    // Insert comment
    const insertRes = await sql`
      INSERT INTO comments (user_id, post_id, content, parent_comment_id)
      VALUES (${currentUser.id}, ${postId}, ${content.trim()}, ${parentCommentId})
      RETURNING id
    `;

    const newCommentId = insertRes.rows[0].id;

    // Create comment notification (if post author is not the comment author)
    await sql`
      INSERT INTO notifications (recipient_id, notifier_id, type, post_id, comment_id)
      SELECT user_id, ${currentUser.id}, 'comment', ${postId}, ${newCommentId}
      FROM posts
      WHERE id = ${postId} AND user_id <> ${currentUser.id}
    `;

    // Fetch the inserted comment with author info
    const commentRes = await sql`
      SELECT 
        c.id,
        c.user_id,
        c.post_id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        u.name AS author_name,
        u.avatar_url AS author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ${newCommentId}
    `;

    const comment = commentRes.rows[0] as DbComment;

    revalidatePath('/');
    return { success: true, comment };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, message: 'Impossible d enregistrer le commentaire.' };
  }
}

export async function deleteComment(commentId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  try {
    // Check ownership of the comment
    const checkRes = await sql`
      SELECT id FROM comments WHERE id = ${commentId} AND user_id = ${currentUser.id}
    `;

    if (checkRes.rows.length === 0) {
      return { success: false, message: 'Non autorisé à supprimer ce commentaire.' };
    }

    await sql`
      DELETE FROM comments WHERE id = ${commentId} AND user_id = ${currentUser.id}
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, message: 'Une erreur est survenue lors de la suppression.' };
  }
}

export async function toggleFavorite(postId: number): Promise<{ success: boolean; favorited?: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté pour enregistrer en favoris.' };
  }

  try {
    const checkFav = await sql`
      SELECT id FROM favorites WHERE user_id = ${currentUser.id} AND post_id = ${postId}
    `;

    let favorited = false;
    if (checkFav.rows.length > 0) {
      await sql`
        DELETE FROM favorites WHERE user_id = ${currentUser.id} AND post_id = ${postId}
      `;
      favorited = false;
    } else {
      await sql`
        INSERT INTO favorites (user_id, post_id) VALUES (${currentUser.id}, ${postId})
      `;
      favorited = true;
    }

    revalidatePath('/');
    return { success: true, favorited };
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

export async function getComments(postId: number): Promise<DbComment[]> {
  try {
    const commentsRes = await sql`
      SELECT 
        c.id,
        c.user_id,
        c.post_id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        u.name AS author_name,
        u.avatar_url AS author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at ASC
    `;

    return commentsRes.rows as DbComment[];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function clearAllFavorites(): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  try {
    await sql`
      DELETE FROM favorites WHERE user_id = ${currentUser.id}
    `;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error clearing favorites:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

