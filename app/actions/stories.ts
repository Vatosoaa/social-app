'use server';

import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import type { UserStoryGroup } from '@/lib/definitions';
import { z } from 'zod';

const StorySchema = z.object({
  media_url: z.string().min(1, { message: "L'URL du média est requise." }),
  media_type: z.enum(['image', 'video']),
  music_url: z.string().optional().nullable(),
  music_title: z.string().optional().nullable(),
  music_artist: z.string().optional().nullable(),
});

/**
 * Fetch active stories from the last 24 hours, grouped by user.
 * Each story will indicate if the current user has already viewed it.
 */
export async function getStories(): Promise<UserStoryGroup[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const { rows } = await sql`
      SELECT 
        s.id,
        s.user_id,
        s.media_url,
        s.media_type,
        s.created_at,
        s.music_url,
        s.music_title,
        s.music_artist,
        u.name AS author_name,
        u.avatar_url AS author_avatar,
        EXISTS(
          SELECT 1 FROM story_views 
          WHERE story_id = s.id AND user_id = ${currentUser.id}
        ) AS is_viewed
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY s.created_at ASC
    `;

    const groupsMap: Record<number, UserStoryGroup> = {};

    for (const row of rows) {
      const userId = row.user_id;
      if (!groupsMap[userId]) {
        groupsMap[userId] = {
          user_id: userId,
          user_name: row.author_name,
          user_avatar: row.author_avatar,
          stories: [],
          has_unviewed: false,
        };
      }

      groupsMap[userId].stories.push({
        id: row.id,
        user_id: userId,
        media_url: row.media_url,
        media_type: row.media_type as 'image' | 'video',
        created_at: new Date(row.created_at).toISOString(),
        is_viewed: row.is_viewed,
        music_url: row.music_url,
        music_title: row.music_title,
        music_artist: row.music_artist,
      });
    }

    const groups = Object.values(groupsMap);
    for (const group of groups) {
      group.has_unviewed = group.stories.some(s => !s.is_viewed);
    }

    // Sort user story groups:
    // 1. Groups with unviewed stories first
    // 2. Then ordered by the date of their latest story (newest first)
    return groups.sort((a, b) => {
      if (a.has_unviewed && !b.has_unviewed) return -1;
      if (!a.has_unviewed && b.has_unviewed) return 1;

      const aLatest = new Date(a.stories[a.stories.length - 1].created_at).getTime();
      const bLatest = new Date(b.stories[b.stories.length - 1].created_at).getTime();
      return bLatest - aLatest;
    });

  } catch (error) {
    console.error('Error fetching stories:', error);
    return [];
  }
}

/**
 * Create a new story.
 */
export async function createStory(state: any, formData: FormData): Promise<{ success?: boolean; message?: string; errors?: any }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { message: 'Vous devez être connecté pour partager une story.' };
  }

  const validatedFields = StorySchema.safeParse({
    media_url: formData.get('media_url'),
    media_type: formData.get('media_type'),
    music_url: formData.get('music_url'),
    music_title: formData.get('music_title'),
    music_artist: formData.get('music_artist'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { media_url, media_type, music_url, music_title, music_artist } = validatedFields.data;

  try {
    await sql`
      INSERT INTO stories (user_id, media_url, media_type, music_url, music_title, music_artist)
      VALUES (${currentUser.id}, ${media_url}, ${media_type}, ${music_url || null}, ${music_title || null}, ${music_artist || null})
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error creating story:', error);
    return { message: 'Une erreur est survenue lors de la création de la story.' };
  }
}

/**
 * Delete a story owned by the current user.
 */
export async function deleteStory(storyId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Non authentifié.' };
  }

  try {
    const { rowCount } = await sql`
      DELETE FROM stories
      WHERE id = ${storyId} AND user_id = ${currentUser.id}
    `;

    if (!rowCount || rowCount === 0) {
      return { success: false, message: 'Story introuvable ou accès refusé.' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting story:', error);
    return { success: false, message: 'Erreur lors de la suppression.' };
  }
}

/**
 * Mark a specific story as viewed by the current user.
 */
export async function markStoryAsViewed(storyId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Non authentifié.' };
  }

  try {
    await sql`
      INSERT INTO story_views (story_id, user_id)
      VALUES (${storyId}, ${currentUser.id})
      ON CONFLICT (story_id, user_id) DO NOTHING
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error marking story as viewed:', error);
    return { success: false, message: 'Erreur lors du marquage de la story.' };
  }
}
