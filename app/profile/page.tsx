import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import ProfileForm from './profile-form';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Pass user details to the client form component
  return <ProfileForm user={user} />;
}
