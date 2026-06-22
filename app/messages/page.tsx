import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getConversations, getOrCreateConversation } from '@/app/actions/messages';
import MessagesClient from '@/components/messages-client';
import AppShell from '@/components/app-shell';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const chatUserStr = resolvedParams.chatUser as string | undefined;
  const conversationIdStr = resolvedParams.conversationId as string | undefined;

  let activeConversationId: number | undefined;

  if (chatUserStr) {
    const targetUserId = parseInt(chatUserStr, 10);
    if (!isNaN(targetUserId)) {
      const res = await getOrCreateConversation(targetUserId);
      if (res.success && res.conversationId) {
        activeConversationId = res.conversationId;
      }
    }
  } else if (conversationIdStr) {
    const parsedId = parseInt(conversationIdStr, 10);
    if (!isNaN(parsedId)) {
      activeConversationId = parsedId;
    }
  }

  const initialConversations = await getConversations();

  return (
    <AppShell currentUser={currentUser}>
      <div className="h-full min-h-[560px] flex flex-col">
        <MessagesClient
          currentUser={currentUser}
          initialConversations={initialConversations}
          initialActiveId={activeConversationId}
        />
      </div>
    </AppShell>
  );
}
