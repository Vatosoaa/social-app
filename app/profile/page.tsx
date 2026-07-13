import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import ProfileForm from './profile-form';
import type { Post } from '@/lib/definitions';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const emptyReactions = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };

  // Run follow stats and posts queries in parallel
  const [statsRes, postsRes] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM follows WHERE following_id = ${user.id}) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = ${user.id}) AS following_count
    `,
    sql`
      SELECT
        p.id, p.user_id, p.content, p.media_url, p.media_type, p.created_at, p.updated_at,
        u.name AS author_name, u.avatar_url AS author_avatar,
        (SELECT COUNT(*)::int FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*)::int FROM comments WHERE post_id = p.id) AS comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${user.id}) AS user_has_liked,
        EXISTS(SELECT 1 FROM favorites WHERE post_id = p.id AND user_id = ${user.id}) AS user_has_favorited,
        (SELECT reaction_type FROM likes WHERE post_id = p.id AND user_id = ${user.id} LIMIT 1) AS user_reaction,
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
      WHERE p.user_id = ${user.id}
      ORDER BY p.created_at DESC
      LIMIT 50
    `,
  ]);

  const stats = statsRes.rows[0] || { followers_count: 0, following_count: 0 };
  const posts: Post[] = postsRes.rows.map((row) => ({
    ...row,
    reactions_by_type: row.reactions_by_type || emptyReactions,
  })) as Post[];

  return (
    <ProfileForm
      user={{
        ...user,
        followers_count: stats.followers_count || 0,
        following_count: stats.following_count || 0,
      }}
      posts={posts}
    />
  );
}
