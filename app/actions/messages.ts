'use server';

import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface Conversation {
  conversation_id: number;
  other_user_id: number;
  other_user_name: string | null;
  other_user_bio: string | null;
  other_user_avatar: string | null;
  other_user_last_active: string;
  last_message_content: string | null;
  last_message_image: string | null;
  last_message_sender_id: number | null;
  last_message_status: string | null;
  last_message_created_at: string | null;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string | null;
  image_url: string | null;
  parent_message_id: number | null;
  status: 'sent' | 'delivered' | 'seen';
  created_at: string;
  parent_content: string | null;
  parent_sender_id: number | null;
  parent_sender_name: string | null;
}

export async function getOrCreateConversation(targetUserId: number): Promise<{ success: boolean; conversationId?: number; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  if (currentUser.id === targetUserId) {
    return { success: false, message: 'Impossible d\'ouvrir une discussion avec vous-même.' };
  }

  const u1 = Math.min(currentUser.id, targetUserId);
  const u2 = Math.max(currentUser.id, targetUserId);

  try {
    // Check if conversation exists
    const existing = await sql`
      SELECT id FROM conversations WHERE user1_id = ${u1} AND user2_id = ${u2}
    `;

    if (existing.rows.length > 0) {
      return { success: true, conversationId: existing.rows[0].id };
    }

    // Create new conversation
    const insertRes = await sql`
      INSERT INTO conversations (user1_id, user2_id) VALUES (${u1}, ${u2}) RETURNING id
    `;
    return { success: true, conversationId: insertRes.rows[0].id };
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

export async function getConversations(): Promise<Conversation[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    // Update current user's presence heartbeat
    await sql`
      UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ${currentUser.id}
    `;

    const res = await sql`
      SELECT 
        c.id AS conversation_id,
        u.id AS other_user_id,
        u.name AS other_user_name,
        u.bio AS other_user_bio,
        u.avatar_url AS other_user_avatar,
        u.last_active_at AS other_user_last_active,
        m.content AS last_message_content,
        m.image_url AS last_message_image,
        m.sender_id AS last_message_sender_id,
        m.status AS last_message_status,
        m.created_at AS last_message_created_at,
        (SELECT COUNT(*)::int FROM messages WHERE conversation_id = c.id AND sender_id = u.id AND status <> 'seen') AS unread_count
      FROM conversations c
      JOIN users u ON (c.user1_id = u.id OR c.user2_id = u.id) AND u.id <> ${currentUser.id}
      LEFT JOIN LATERAL (
        SELECT content, image_url, sender_id, status, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON TRUE
      WHERE c.user1_id = ${currentUser.id} OR c.user2_id = ${currentUser.id}
      ORDER BY COALESCE(m.created_at, c.created_at) DESC
    `;

    return res.rows as Conversation[];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

export async function getMessages(conversationId: number): Promise<ChatMessage[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const res = await sql`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.image_url,
        m.parent_message_id,
        m.status,
        m.created_at,
        p.content AS parent_content,
        p.sender_id AS parent_sender_id,
        u.name AS parent_sender_name
      FROM messages m
      LEFT JOIN messages p ON m.parent_message_id = p.id
      LEFT JOIN users u ON p.sender_id = u.id
      WHERE m.conversation_id = ${conversationId}
      ORDER BY m.created_at ASC
      LIMIT 100
    `;
    return res.rows as ChatMessage[];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export async function sendMessage(
  conversationId: number,
  content: string | null,
  imageUrl: string | null = null,
  parentMessageId: number | null = null
): Promise<{ success: boolean; messageData?: ChatMessage; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  if (!content?.trim() && !imageUrl) {
    return { success: false, message: 'Le message ne peut pas être vide.' };
  }

  try {
    const insertRes = await sql`
      INSERT INTO messages (conversation_id, sender_id, content, image_url, parent_message_id, status)
      VALUES (${conversationId}, ${currentUser.id}, ${content ? content.trim() : null}, ${imageUrl}, ${parentMessageId}, 'sent')
      RETURNING id
    `;

    const newMsgId = insertRes.rows[0].id;

    const res = await sql`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.image_url,
        m.parent_message_id,
        m.status,
        m.created_at,
        p.content AS parent_content,
        p.sender_id AS parent_sender_id,
        u.name AS parent_sender_name
      FROM messages m
      LEFT JOIN messages p ON m.parent_message_id = p.id
      LEFT JOIN users u ON p.sender_id = u.id
      WHERE m.id = ${newMsgId}
    `;

    revalidatePath('/messages');
    return { success: true, messageData: res.rows[0] as ChatMessage };
  } catch (error) {
    console.error('Error in sendMessage action:', error);
    return { success: false, message: 'Impossible d\'envoyer le message.' };
  }
}

export async function deleteMessage(messageId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  try {
    const checkRes = await sql`
      SELECT sender_id FROM messages WHERE id = ${messageId}
    `;

    if (checkRes.rows.length === 0) {
      return { success: false, message: 'Message introuvable.' };
    }

    if (checkRes.rows[0].sender_id !== currentUser.id) {
      return { success: false, message: 'Non autorisé à supprimer ce message.' };
    }

    await sql`
      DELETE FROM messages WHERE id = ${messageId}
    `;

    return { success: true };
  } catch (error) {
    console.error('Error in deleteMessage action:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}

export async function markAsRead(conversationId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: 'Non connecté.' };

  try {
    await sql`
      UPDATE messages 
      SET status = 'seen' 
      WHERE conversation_id = ${conversationId} 
        AND sender_id <> ${currentUser.id} 
        AND status <> 'seen'
    `;
    revalidatePath('/messages');
    return { success: true };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { success: false, message: 'Erreur SQL.' };
  }
}

export async function markAsDelivered(conversationId: number): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: 'Non connecté.' };

  try {
    await sql`
      UPDATE messages 
      SET status = 'delivered' 
      WHERE conversation_id = ${conversationId} 
        AND sender_id <> ${currentUser.id} 
        AND status = 'sent'
    `;
    revalidatePath('/messages');
    return { success: true };
  } catch (error) {
    console.error('Error marking messages as delivered:', error);
    return { success: false, message: 'Erreur SQL.' };
  }
}
