import { redirect, notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import ProfilePublic from '@/components/profile-public';
import type { Post } from '@/lib/definitions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const targetUserId = parseInt(id, 10);

  if (isNaN(targetUserId)) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // If visiting own profile, redirect to the profile dashboard page
  if (currentUser.id === targetUserId) {
    redirect('/profile');
  }

  // Fetch target user details with follow stats
  let targetUser;
  try {
    const userRes = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.bio, 
        u.avatar_url,
        u.role,
        u.experience_level,
        u.favorite_artists,
        u.favorite_genre,
        u.software_equipment,
        u.music_mood,
        u.city_region,
        u.availability,
        u.badges,
        u.tags,
        u.social_youtube,
        u.social_instagram,
        u.social_tiktok,
        u.social_facebook,
        u.social_gmail,
        u.birthday::text as birthday,
        u.school,
        u.workplace,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) AS following_count,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = ${currentUser.id} AND following_id = u.id) AS is_following,
        EXISTS(
          SELECT 1 FROM friendships 
          WHERE (user_id1 = ${currentUser.id} AND user_id2 = u.id)
             OR (user_id1 = u.id AND user_id2 = ${currentUser.id})
        ) AS is_friend,
        EXISTS(SELECT 1 FROM friend_requests WHERE sender_id = ${currentUser.id} AND receiver_id = u.id) AS has_sent_request,
        (SELECT id FROM friend_requests WHERE sender_id = u.id AND receiver_id = ${currentUser.id} LIMIT 1) AS received_request_id
      FROM users u
      WHERE u.id = ${targetUserId}
    `;
    if (userRes.rows.length === 0) {
      notFound();
    }
    targetUser = userRes.rows[0];
  } catch (error) {
    console.error('Error fetching target user profile:', error);
    notFound();
  }

  // Fetch target user's posts
  let posts: Post[] = [];
  try {
    const postsRes = await sql`
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
      WHERE p.user_id = ${targetUserId}
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    const emptyReactions = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    posts = postsRes.rows.map((row) => ({
      ...row,
      reactions_by_type: row.reactions_by_type || emptyReactions,
    })) as Post[];
  } catch (error) {
    console.error('Error fetching public profile posts:', error);
  }

  return (
    <ProfilePublic
      targetUser={{
        id: targetUser.id,
        name: targetUser.name,
        bio: targetUser.bio,
        avatar_url: targetUser.avatar_url,
        role: targetUser.role,
        experience_level: targetUser.experience_level,
        favorite_artists: targetUser.favorite_artists,
        favorite_genre: targetUser.favorite_genre,
        software_equipment: targetUser.software_equipment,
        music_mood: targetUser.music_mood,
        city_region: targetUser.city_region,
        availability: targetUser.availability,
        badges: targetUser.badges,
        tags: targetUser.tags,
        social_youtube: targetUser.social_youtube,
        social_instagram: targetUser.social_instagram,
        social_tiktok: targetUser.social_tiktok,
        social_facebook: targetUser.social_facebook,
        social_gmail: targetUser.social_gmail,
        followers_count: targetUser.followers_count || 0,
        following_count: targetUser.following_count || 0,
        is_following: targetUser.is_following || false,
        birthday: targetUser.birthday || null,
        school: targetUser.school || null,
        workplace: targetUser.workplace || null,
        is_friend: targetUser.is_friend || false,
        has_sent_request: targetUser.has_sent_request || false,
        received_request_id: targetUser.received_request_id || null,
      }}
      currentUser={currentUser}
      posts={posts}
    />
  );
}
