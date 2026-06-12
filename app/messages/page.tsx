import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { getConversations, getOrCreateConversation } from '@/app/actions/messages';
import MessagesClient from '@/components/messages-client';
import { Button } from '@/components/ui/button';
import { Sparkles, User, Bookmark, MessageSquare, LogIn, UserPlus } from 'lucide-react';

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

  // If a chatUser query parameter is passed (e.g. from Profile page "Message" button)
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
    <div className="relative flex flex-col h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-zinc-900/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent uppercase">
              Twinkly
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all cursor-pointer">
                <div className="h-7 w-7 rounded-full overflow-hidden border border-zinc-700">
                  {currentUser.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-zinc-950">
                      <User className="h-4 w-4 text-zinc-500" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-zinc-300">{currentUser.name}</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 pb-6 pt-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 h-full min-h-0">
          {/* Left Sidebar Navigation */}
          <aside className="hidden md:block h-full min-h-0">
            <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-5 flex flex-col justify-between h-full">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-3">Navigation</p>
                <nav className="space-y-1">
                  {[
                    { name: 'Accueil', href: '/', icon: Sparkles, active: false },
                    { name: 'Mes Favoris', href: '/?filter=favorites', icon: Bookmark, active: false },
                    { name: 'Mon Profil', href: '/profile', icon: User, active: false },
                    { name: 'Messages', href: '/messages', icon: MessageSquare, active: true },
                  ].map((item) => (
                    <Link key={item.name} href={item.href}>
                      <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all group cursor-pointer ${
                        item.active
                          ? 'bg-violet-600/10 border border-violet-500/20 text-violet-400 font-semibold shadow-[0_0_15px_rgba(139,92,246,0.05)]'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}>
                        <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                          item.active ? 'text-violet-400' : 'text-zinc-550 group-hover:text-zinc-300'
                        }`} />
                        {item.name}
                      </div>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="border-t border-zinc-800/60 pt-4">
                <div className="px-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Utilisateur connecté</p>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
                      {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                          <User className="h-3.5 w-3.5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200 truncate leading-tight">{currentUser.name}</p>
                      <p className="text-[10px] text-zinc-550 truncate mt-0.5">{currentUser.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Messages Main Workspace */}
          <div className="min-w-0 h-full min-h-0">
            <MessagesClient
              currentUser={currentUser}
              initialConversations={initialConversations}
              initialActiveId={activeConversationId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
