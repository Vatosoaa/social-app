import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import GroupDetailClient from '@/components/group-detail-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupPage({ params }: PageProps) {
  const { id } = await params;
  const groupId = parseInt(id, 10);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (isNaN(groupId)) {
    redirect('/');
  }

  let group: any = null;
  let members: any[] = [];
  let posts: any[] = [];
  let isMember = false;
  let userRole: string | null = null;

  try {
    // Fetch group details and membership check concurrently
    const [groupRes, memberCheckRes] = await Promise.all([
      sql`
        SELECT 
          g.*,
          (SELECT COUNT(*)::int FROM group_members WHERE group_id = g.id) AS members_count,
          u.name AS creator_name,
          u.avatar_url AS creator_avatar
        FROM groups g
        JOIN users u ON g.creator_id = u.id
        WHERE g.id = ${groupId}
      `,
      sql`
        SELECT role FROM group_members 
        WHERE group_id = ${groupId} AND user_id = ${currentUser.id}
      `,
    ]);

    if (groupRes.rows.length === 0) {
      redirect('/');
    }

    group = groupRes.rows[0];
    isMember = memberCheckRes.rows.length > 0;
    userRole = memberCheckRes.rows[0]?.role || null;

    // Fetch members and posts (if member) concurrently
    const [membersRes, postsRes] = await Promise.all([
      sql`
        SELECT 
          gm.id, gm.user_id, gm.role, gm.joined_at,
          u.name, u.avatar_url
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ${groupId}
        ORDER BY gm.joined_at ASC
        LIMIT 20
      `,
      isMember
        ? sql`
            SELECT 
              gp.*, 
              u.name AS author_name, 
              u.avatar_url AS author_avatar
            FROM group_posts gp
            JOIN users u ON gp.user_id = u.id
            WHERE gp.group_id = ${groupId}
            ORDER BY gp.created_at DESC
            LIMIT 50
          `
        : Promise.resolve({ rows: [] }),
    ]);

    members = membersRes.rows;
    posts = postsRes.rows;
  } catch (err: any) {
    console.error('Failed to load group:', err);
    redirect('/');
  }

  return (
    <GroupDetailClient
      currentUser={currentUser}
      group={{ ...group, is_member: isMember, user_role: userRole }}
      members={members}
      initialPosts={posts}
    />
  );
}
