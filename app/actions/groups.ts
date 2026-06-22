'use server';

import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { Group, GroupMember, GroupPost } from '@/lib/definitions';

export async function initGroupsTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(10) NOT NULL DEFAULT '🎵',
        cover_url TEXT,
        creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(group_id, user_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS group_posts (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        media_url TEXT,
        media_type VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
  } catch (error) {
    console.error('Error initializing groups tables:', error);
  }
}

export async function createGroup(formData: FormData): Promise<{ success: boolean; groupId?: number; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté pour créer un groupe.' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const icon = (formData.get('icon') as string) || '🎵';
  const coverUrl = formData.get('cover_url') as string;
  const isPublic = formData.get('is_public') !== 'false';

  if (!name || name.trim().length < 2) {
    return { success: false, message: 'Le nom du groupe doit contenir au moins 2 caractères.' };
  }

  try {
    const result = await sql`
      INSERT INTO groups (name, description, icon, cover_url, creator_id, is_public)
      VALUES (${name.trim()}, ${description || null}, ${icon}, ${coverUrl || null}, ${currentUser.id}, ${isPublic})
      RETURNING id
    `;

    const groupId = result.rows[0].id;

    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${currentUser.id}, 'admin')
    `;

    revalidatePath('/groups');
    return { success: true, groupId };
  } catch (error) {
    console.error('Error creating group:', error);
    return { success: false, message: 'Une erreur est survenue lors de la création du groupe.' };
  }
}

export async function getMyGroups(): Promise<Group[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const res = await sql`
      SELECT
        g.id,
        g.name,
        g.description,
        g.icon,
        g.cover_url,
        g.creator_id,
        g.is_public,
        g.created_at,
        (SELECT COUNT(*)::int FROM group_members WHERE group_id = g.id) AS members_count,
        true AS is_member,
        gm.role AS user_role
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ${currentUser.id}
      ORDER BY gm.joined_at DESC
    `;
    return res.rows as Group[];
  } catch (error) {
    console.error('Error getting my groups:', error);
    return [];
  }
}

export async function getDiscoverGroups(): Promise<Group[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const res = await sql`
      SELECT
        g.id,
        g.name,
        g.description,
        g.icon,
        g.cover_url,
        g.creator_id,
        g.is_public,
        g.created_at,
        (SELECT COUNT(*)::int FROM group_members WHERE group_id = g.id) AS members_count,
        false AS is_member,
        NULL AS user_role
      FROM groups g
      WHERE g.is_public = true
        AND g.id NOT IN (SELECT group_id FROM group_members WHERE user_id = ${currentUser.id})
      ORDER BY members_count DESC, g.created_at DESC
    `;
    return res.rows as Group[];
  } catch (error) {
    console.error('Error getting discover groups:', error);
    return [];
  }
}

export async function joinGroup(groupId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté pour rejoindre un groupe.' };
  }

  try {
    const groupCheck = await sql`
      SELECT id, is_public FROM groups WHERE id = ${groupId}
    `;
    if (groupCheck.rows.length === 0) {
      return { success: false, message: 'Groupe introuvable.' };
    }
    if (!groupCheck.rows[0].is_public) {
      return { success: false, message: 'Ce groupe est privé.' };
    }

    const memberCheck = await sql`
      SELECT id FROM group_members WHERE group_id = ${groupId} AND user_id = ${currentUser.id}
    `;
    if (memberCheck.rows.length > 0) {
      return { success: false, message: 'Vous êtes déjà membre de ce groupe.' };
    }

    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${currentUser.id}, 'member')
    `;

    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);
    return { success: true };
  } catch (error) {
    console.error('Error joining group:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

export async function leaveGroup(groupId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  try {
    const memberCheck = await sql`
      SELECT role FROM group_members WHERE group_id = ${groupId} AND user_id = ${currentUser.id}
    `;
    if (memberCheck.rows.length === 0) {
      return { success: false, message: 'Vous n\'êtes pas membre de ce groupe.' };
    }

    if (memberCheck.rows[0].role === 'admin') {
      const adminCount = await sql`
        SELECT COUNT(*)::int AS count FROM group_members WHERE group_id = ${groupId} AND role = 'admin'
      `;
      if (adminCount.rows[0].count <= 1) {
        return { success: false, message: 'Vous êtes le seul admin. Transférez le rôle avant de quitter.' };
      }
    }

    await sql`
      DELETE FROM group_members WHERE group_id = ${groupId} AND user_id = ${currentUser.id}
    `;

    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);
    return { success: true };
  } catch (error) {
    console.error('Error leaving group:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

export async function getGroupDetails(groupId: number): Promise<Group | null> {
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id || 0;

  try {
    const res = await sql`
      SELECT
        g.id,
        g.name,
        g.description,
        g.icon,
        g.cover_url,
        g.creator_id,
        g.is_public,
        g.created_at,
        (SELECT COUNT(*)::int FROM group_members WHERE group_id = g.id) AS members_count,
        EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = ${currentUserId}) AS is_member,
        (SELECT role FROM group_members WHERE group_id = g.id AND user_id = ${currentUserId}) AS user_role
      FROM groups g
      WHERE g.id = ${groupId}
    `;

    if (res.rows.length === 0) return null;
    return res.rows[0] as Group;
  } catch (error) {
    console.error('Error getting group details:', error);
    return null;
  }
}

export async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
  try {
    const res = await sql`
      SELECT
        gm.id,
        gm.user_id,
        u.name,
        u.avatar_url,
        gm.role,
        gm.joined_at
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY
        CASE gm.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,
        gm.joined_at ASC
    `;
    return res.rows as GroupMember[];
  } catch (error) {
    console.error('Error getting group members:', error);
    return [];
  }
}

export async function createGroupPost(
  groupId: number,
  content: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté pour publier.' };
  }

  const memberCheck = await sql`
    SELECT id FROM group_members WHERE group_id = ${groupId} AND user_id = ${currentUser.id}
  `;
  if (memberCheck.rows.length === 0) {
    return { success: false, message: 'Vous devez être membre du groupe pour publier.' };
  }

  if ((!content || content.trim().length === 0) && !mediaUrl) {
    return { success: false, message: 'La publication doit avoir du texte ou un média.' };
  }

  try {
    await sql`
      INSERT INTO group_posts (group_id, user_id, content, media_url, media_type)
      VALUES (${groupId}, ${currentUser.id}, ${content || null}, ${mediaUrl || null}, ${mediaType || null})
    `;

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating group post:', error);
    return { success: false, message: 'Une erreur est survenue lors de la publication.' };
  }
}

export async function getGroupPosts(groupId: number): Promise<GroupPost[]> {
  try {
    const res = await sql`
      SELECT
        gp.id,
        gp.group_id,
        gp.user_id,
        gp.content,
        gp.media_url,
        gp.media_type,
        gp.created_at,
        u.name AS author_name,
        u.avatar_url AS author_avatar
      FROM group_posts gp
      JOIN users u ON u.id = gp.user_id
      WHERE gp.group_id = ${groupId}
      ORDER BY gp.created_at DESC
    `;
    return res.rows as GroupPost[];
  } catch (error) {
    console.error('Error getting group posts:', error);
    return [];
  }
}
