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
        COALESCE(lc.cnt, 0)::int AS likes_count,
        COALESCE(cc.cnt, 0)::int AS comments_count,
        (ul.reaction_type IS NOT NULL) AS user_has_liked,
        (uf.post_id IS NOT NULL) AS user_has_favorited,
        ul.reaction_type AS user_reaction,
        json_build_object(
          'like',  COALESCE(lr.like_cnt,  0),
          'love',  COALESCE(lr.love_cnt,  0),
          'haha',  COALESCE(lr.haha_cnt,  0),
          'wow',   COALESCE(lr.wow_cnt,   0),
          'sad',   COALESCE(lr.sad_cnt,   0),
          'angry', COALESCE(lr.angry_cnt, 0)
        ) AS reactions_by_type
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN (SELECT post_id, COUNT(*)::int AS cnt FROM likes GROUP BY post_id) lc ON lc.post_id = p.id
      LEFT JOIN (SELECT post_id, COUNT(*)::int AS cnt FROM comments GROUP BY post_id) cc ON cc.post_id = p.id
      LEFT JOIN likes ul ON ul.post_id = p.id AND ul.user_id = ${currentUser.id}
      LEFT JOIN favorites uf ON uf.post_id = p.id AND uf.user_id = ${currentUser.id}
      LEFT JOIN (
        SELECT post_id,
          COUNT(*) FILTER (WHERE reaction_type = 'like')::int  AS like_cnt,
          COUNT(*) FILTER (WHERE reaction_type = 'love')::int  AS love_cnt,
          COUNT(*) FILTER (WHERE reaction_type = 'haha')::int  AS haha_cnt,
          COUNT(*) FILTER (WHERE reaction_type = 'wow')::int   AS wow_cnt,
          COUNT(*) FILTER (WHERE reaction_type = 'sad')::int   AS sad_cnt,
          COUNT(*) FILTER (WHERE reaction_type = 'angry')::int AS angry_cnt
        FROM likes GROUP BY post_id
      ) lr ON lr.post_id = p.id
      WHERE p.media_url IS NOT NULL
        AND p.media_url <> ''
        AND (
          p.media_type = 'video'
          OR p.media_url ILIKE '%.mp4'
          OR p.media_url ILIKE '%.webm'
          OR p.media_url ILIKE '%.mov'
          OR p.media_url ILIKE '%.avi'
          OR p.media_url ILIKE '%.mkv'
          OR p.media_url ILIKE '%.ogv'
          OR p.media_url ILIKE '%youtube.com%'
          OR p.media_url ILIKE '%youtu.be%'
          OR p.media_url ILIKE '%vimeo.com%'
          OR p.media_url ILIKE '%blob:%'
        )
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
