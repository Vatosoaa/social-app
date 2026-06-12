'use server';

import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface AppNotification {
  id: number;
  recipient_id: number;
  notifier_id: number;
  notifier_name: string | null;
  notifier_avatar: string | null;
  type: 'follow' | 'reaction' | 'comment';
  post_id: number | null;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    const res = await sql`
      SELECT 
        n.id,
        n.recipient_id,
        n.notifier_id,
        u.name AS notifier_name,
        u.avatar_url AS notifier_avatar,
        n.type,
        n.post_id,
        n.is_read,
        n.created_at::text
      FROM notifications n
      JOIN users u ON n.notifier_id = u.id
      WHERE n.recipient_id = ${currentUser.id}
      ORDER BY n.created_at DESC
      LIMIT 30
    `;
    return res.rows as AppNotification[];
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return [];
  }
}

export async function markNotificationsAsRead(): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'Non authentifié.' };
  }

  try {
    await sql`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE recipient_id = ${currentUser.id} AND is_read = FALSE
    `;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error in markNotificationsAsRead:', error);
    return { success: false, message: 'Une erreur est survenue.' };
  }
}
