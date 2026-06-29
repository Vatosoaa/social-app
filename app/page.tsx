import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { getStories } from '@/app/actions/stories';
import { getFriendRequests, getFriends, getFriendSuggestions, getBirthdaysToday } from '@/app/actions/friends';
import type { Post } from '@/lib/definitions';
import HomeClient from '@/components/home-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function fetchPosts(currentUserId: number, filter: string): Promise<Post[]> {
  const empty = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };

  if (filter === 'favorites') {
    const { rows } = await sql`
      SELECT
        p.id, p.user_id, p.content, p.media_url, p.media_type, p.created_at, p.updated_at,
        u.name AS author_name, u.avatar_url AS author_avatar, u.role AS author_role,
        (SELECT COUNT(*)::int FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*)::int FROM comments WHERE post_id = p.id) AS comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUserId}) AS user_has_liked,
        EXISTS(SELECT 1 FROM favorites WHERE post_id = p.id AND user_id = ${currentUserId}) AS user_has_favorited,
        (SELECT reaction_type FROM likes WHERE post_id = p.id AND user_id = ${currentUserId} LIMIT 1) AS user_reaction,
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
      JOIN favorites f ON p.id = f.post_id AND f.user_id = ${currentUserId}
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    return rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];
  }

  if (filter === 'media') {
    const { rows } = await sql`
      SELECT
        p.id, p.user_id, p.content, p.media_url, p.media_type, p.created_at, p.updated_at,
        u.name AS author_name, u.avatar_url AS author_avatar, u.role AS author_role,
        (SELECT COUNT(*)::int FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*)::int FROM comments WHERE post_id = p.id) AS comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUserId}) AS user_has_liked,
        EXISTS(SELECT 1 FROM favorites WHERE post_id = p.id AND user_id = ${currentUserId}) AS user_has_favorited,
        (SELECT reaction_type FROM likes WHERE post_id = p.id AND user_id = ${currentUserId} LIMIT 1) AS user_reaction,
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
      WHERE p.media_url IS NOT NULL AND p.media_url <> ''
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    return rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];
  }

  const { rows } = await sql`
    SELECT
      p.id, p.user_id, p.content, p.media_url, p.media_type, p.created_at, p.updated_at,
      u.name AS author_name, u.avatar_url AS author_avatar, u.role AS author_role,
      (SELECT COUNT(*)::int FROM likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*)::int FROM comments WHERE post_id = p.id) AS comments_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUserId}) AS user_has_liked,
      EXISTS(SELECT 1 FROM favorites WHERE post_id = p.id AND user_id = ${currentUserId}) AS user_has_favorited,
      (SELECT reaction_type FROM likes WHERE post_id = p.id AND user_id = ${currentUserId} LIMIT 1) AS user_reaction,
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
    ORDER BY p.created_at DESC
    LIMIT 50
  `;
  return rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];
}

async function fetchUnreadCount(currentUserId: number): Promise<number> {
  const res = await sql`
    SELECT COUNT(*)::int AS count 
    FROM messages 
    WHERE sender_id <> ${currentUserId} 
      AND status <> 'seen' 
      AND conversation_id IN (
        SELECT id FROM conversations WHERE user1_id = ${currentUserId} OR user2_id = ${currentUserId}
      )
  `;
  return res.rows[0]?.count || 0;
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const filter = resolvedSearchParams.filter as string;
  const currentUser = await getCurrentUser();

  let posts: Post[] = [];
  let suggestions: any[] = [];
  let friendRequests: any[] = [];
  let friendsList: any[] = [];
  let birthdaysToday: any[] = [];
  let unreadMessagesCount = 0;
  let error: string | null = null;
  let stories: any[] = [];

  if (currentUser) {
    const [
      postsResult,
      suggestionsResult,
      friendRequestsResult,
      friendsListResult,
      birthdaysTodayResult,
      unreadResult,
      storiesResult,
    ] = await Promise.allSettled([
      fetchPosts(currentUser.id, filter),
      getFriendSuggestions(),
      getFriendRequests(),
      getFriends(),
      getBirthdaysToday(),
      fetchUnreadCount(currentUser.id),
      getStories(),
    ]);

    if (postsResult.status === 'fulfilled') posts = postsResult.value;
    else { console.error('Failed to load posts:', postsResult.reason); error = (postsResult.reason as any)?.message ?? 'Unknown error'; }

    if (suggestionsResult.status === 'fulfilled') suggestions = suggestionsResult.value;
    else console.error('Failed to load suggestions:', suggestionsResult.reason);

    if (friendRequestsResult.status === 'fulfilled') friendRequests = friendRequestsResult.value;
    else console.error('Failed to load friend requests:', friendRequestsResult.reason);

    if (friendsListResult.status === 'fulfilled') friendsList = friendsListResult.value;
    else console.error('Failed to load friends list:', friendsListResult.reason);

    if (birthdaysTodayResult.status === 'fulfilled') birthdaysToday = birthdaysTodayResult.value;
    else console.error('Failed to load birthdays:', birthdaysTodayResult.reason);

    if (unreadResult.status === 'fulfilled') unreadMessagesCount = unreadResult.value;
    else console.error('Failed to load unread count:', unreadResult.reason);

    if (storiesResult.status === 'fulfilled') stories = storiesResult.value;
    else console.error('Failed to load stories:', storiesResult.reason);
  }

  return (
    <HomeClient
      currentUser={currentUser}
      initialPosts={posts}
      initialSuggestions={suggestions}
      initialFriendRequests={friendRequests}
      initialFriendsList={friendsList}
      initialBirthdaysToday={birthdaysToday}
      unreadMessagesCount={unreadMessagesCount}
      filter={filter || ''}
      error={error}
      stories={stories}
    />
  );
}
