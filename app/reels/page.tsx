import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import type { Post } from '@/lib/definitions';
import ReelsClient from '@/components/reels-client';

export const dynamic = 'force-dynamic';

export default async function ReelsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  let reels: Post[] = [];

  try {
    const { rows } = await sql`
      SELECT
        p.id,
        p.user_id,
        p.content,
        p.media_url,
        p.media_type,
        p.created_at,
        p.updated_at,
        u.name AS author_name,
        u.avatar_url AS author_avatar,
        u.role AS author_role,
        (SELECT COUNT(*)::int FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*)::int FROM comments WHERE post_id = p.id) AS comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUser.id}) AS user_has_liked,
        EXISTS(SELECT 1 FROM favorites WHERE post_id = p.id AND user_id = ${currentUser.id}) AS user_has_favorited,
        (SELECT reaction_type FROM likes WHERE post_id = p.id AND user_id = ${currentUser.id} LIMIT 1) AS user_reaction,
        (SELECT json_build_object(
          'like',  COUNT(*) FILTER (WHERE reaction_type = 'like'),
          'love',  COUNT(*) FILTER (WHERE reaction_type = 'love'),
          'haha',  COUNT(*) FILTER (WHERE reaction_type = 'haha'),
          'wow',   COUNT(*) FILTER (WHERE reaction_type = 'wow'),
          'sad',   COUNT(*) FILTER (WHERE reaction_type = 'sad'),
          'angry', COUNT(*) FILTER (WHERE reaction_type = 'angry')
        ) FROM likes WHERE post_id = p.id) AS reactions_by_type
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.media_type = 'video' AND p.media_url IS NOT NULL AND p.media_url <> ''
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    const empty = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    reels = rows.map((row) => ({
      ...row,
      reactions_by_type: row.reactions_by_type || empty,
    })) as Post[];
  } catch (err) {
    console.error('Failed to load reels:', err);
  }

  return <ReelsClient reels={reels} currentUser={currentUser} />;
}
