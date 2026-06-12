import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import ProfileForm from './profile-form';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch follower and following counts
  const statsRes = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM follows WHERE following_id = ${user.id}) AS followers_count,
      (SELECT COUNT(*)::int FROM follows WHERE follower_id = ${user.id}) AS following_count
  `;
  const stats = statsRes.rows[0] || { followers_count: 0, following_count: 0 };

  // Pass user details with follow stats to the client form component
  return (
    <ProfileForm
      user={{
        id: user.id,
        email: user.email,
        name: user.name || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        followers_count: stats.followers_count || 0,
        following_count: stats.following_count || 0,
      }}
    />
  );
}
