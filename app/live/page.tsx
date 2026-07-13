import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import LiveClient from '@/components/live-client';

export const dynamic = 'force-dynamic';

export default async function LivePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  return <LiveClient currentUser={currentUser} />;
}
