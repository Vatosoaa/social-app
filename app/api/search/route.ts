import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ users: [], posts: [], hashtags: [] }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 1) {
    return NextResponse.json({ users: [], posts: [], hashtags: [] });
  }

  const like = '%' + q + '%';
  const hashtagQuery = q.startsWith('#') ? q : '#' + q;
  const hashtagLike = '%' + hashtagQuery + '%';

  try {
    const [usersRes, postsRes, hashtagsRes] = await Promise.all([
      // Users
      sql`
        SELECT
          u.id,
          u.name,
          u.bio,
          u.avatar_url,
          (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS followers_count,
          EXISTS(SELECT 1 FROM follows WHERE follower_id = ${currentUser.id} AND following_id = u.id) AS is_following
        FROM users u
        WHERE u.id <> ${currentUser.id}
          AND (u.name ILIKE ${like} OR u.bio ILIKE ${like})
        ORDER BY followers_count DESC, u.name ASC
        LIMIT 5
      `,
      // Posts (keyword)
      sql`
        SELECT
          p.id,
          p.content,
          u.name AS author_name,
          u.avatar_url AS author_avatar
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.content ILIKE ${like}
          AND NOT (p.content ILIKE ${hashtagLike})
        ORDER BY p.created_at DESC
        LIMIT 4
      `,
      // Hashtags
      sql`
        SELECT
          p.id,
          p.content,
          u.name AS author_name,
          u.avatar_url AS author_avatar
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.content ILIKE ${hashtagLike}
        ORDER BY p.created_at DESC
        LIMIT 3
      `,
    ]);

    return NextResponse.json({
      users: usersRes.rows,
      posts: postsRes.rows,
      hashtags: hashtagsRes.rows,
    });
  } catch (err: any) {
    console.error('Search API error:', err);
    return NextResponse.json({ users: [], posts: [], hashtags: [], error: err.message }, { status: 500 });
  }
}
