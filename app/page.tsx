import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import CreatePostForm from '@/components/create-post-form';
import PostsFeed from '@/components/posts-feed';
import SuggestionsSidebar from '@/components/suggestions-sidebar';
import { getSuggestions } from '@/app/actions/follows';
import { ArrowRight, LogIn, Sparkles, User, UserPlus, Users, Bookmark, MessageSquare, Search } from 'lucide-react';
import LiveSearchBar from '@/components/live-search-bar';
import type { Post } from '@/lib/definitions';
import Navbar from '@/components/navbar';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const filter = resolvedSearchParams.filter as string;
  const currentUser = await getCurrentUser();
  let posts: Post[] = [];
  let suggestions: any[] = [];
  let unreadMessagesCount = 0;
  let error: string | null = null;

  if (currentUser) {
    try {
      if (filter === 'favorites') {
        const { rows } = await sql`
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
          JOIN favorites f ON p.id = f.post_id AND f.user_id = ${currentUser.id}
          ORDER BY p.created_at DESC
          LIMIT 50
        `;
        const empty = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
        posts = rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];
      } else if (filter === 'media') {
        const { rows } = await sql`
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
          WHERE p.media_url IS NOT NULL AND p.media_url <> ''
          ORDER BY p.created_at DESC
          LIMIT 50
        `;
        const empty = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
        posts = rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];
      } else {
        const { rows } = await sql`
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
          ORDER BY p.created_at DESC
          LIMIT 50
        `;
        const empty = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
        posts = rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];
      }
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      error = err.message;
    }

    try {
      suggestions = await getSuggestions();
    } catch (err: any) {
      console.error('Failed to load suggestions:', err);
    }

    try {
      const unreadRes = await sql`
        SELECT COUNT(*)::int AS count 
        FROM messages 
        WHERE sender_id <> ${currentUser.id} 
          AND status <> 'seen' 
          AND conversation_id IN (
            SELECT id FROM conversations WHERE user1_id = ${currentUser.id} OR user2_id = ${currentUser.id}
          )
      `;
      unreadMessagesCount = unreadRes.rows[0]?.count || 0;
    } catch (err: any) {
      console.error('Failed to load unread count:', err);
    }
  }

  return (
    <div className="relative flex flex-col h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Navigation bar */}
      <Navbar 
        currentUser={currentUser} 
        activeTab={filter === 'favorites' ? 'favorites' : filter === 'media' ? 'media' : 'home'} 
        unreadMessagesCount={unreadMessagesCount} 
      />

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 flex flex-col overflow-hidden">
        {/* ─── AUTHENTICATED LAYOUT ─── */}
        {currentUser ? (
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_300px] gap-6 h-full">
            {/* Left Sidebar Navigation */}
            <aside className="hidden md:flex flex-col overflow-y-auto scrollbar-hide">
              <div className="my-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-5 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-3">Navigation</p>
                  <nav className="space-y-1">
                    {[
                      { name: 'Accueil', href: '/', icon: Sparkles, active: filter !== 'favorites' },
                      { name: 'Recherche', href: '/search', icon: Search, active: false },
                      { name: 'Mes Favoris', href: '/?filter=favorites', icon: Bookmark, active: filter === 'favorites' },
                      { name: 'Mon Profil', href: '/profile', icon: User, active: false },
                      { name: 'Messages', href: '/messages', icon: MessageSquare, active: false, badge: unreadMessagesCount },
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
                          <span>{item.name}</span>
                          {item.badge && item.badge > 0 ? (
                            <span className="ml-auto bg-violet-650 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          ) : null}
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
                            <User className="h-3.5 w-3.5 text-zinc-655" />
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

            {/* Feed column */}
            <div className="overflow-y-auto scrollbar-hide py-8 space-y-5 min-w-0">
              {/* Error banner */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-sm">
                  {error}
                </div>
              )}
              <PostsFeed initialPosts={posts} currentUser={currentUser} isFavoritesFilter={filter === 'favorites'} />
              <footer className="pt-6 text-center text-xs text-zinc-600 border-t border-zinc-900/60">
                <p>&copy; 2026 Twinkly Inc. Conçu avec amour, Next.js 16 et Tailwind CSS v4.</p>
              </footer>
            </div>

            {/* Sidebar — Suggestions */}
            <aside className="hidden lg:flex flex-col overflow-y-auto scrollbar-hide">
              <SuggestionsSidebar initialSuggestions={suggestions} currentUserId={currentUser.id} />
            </aside>
          </div>
        ) : (
          /* ─── LANDING (UNAUTHENTICATED) ─── */
          <div className="overflow-y-auto scrollbar-hide flex-1">
          <div className="text-center space-y-6 max-w-3xl mx-auto mt-12 pb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/30 border border-violet-800/30 text-violet-400 text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Une expérience utilisateur premium
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent select-none">
              Connectez-vous à la communauté
            </h1>
            <p className="text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Créez un profil, partagez du texte, des images et des vidéos, et suivez les publications de la communauté en temps réel.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-6 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-xl shadow-violet-500/20 transition-all duration-300 hover:scale-[1.02]">
                  Commencer maintenant <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
              {[
                { icon: '📝', title: 'Publications riches', desc: 'Partagez du texte, des images et des vidéos avec la communauté dans un fil chronologique.' },
                { icon: '🛡️', title: 'Sécurité JWT', desc: 'Sessions chiffrées en cookies HttpOnly pour une protection maximale contre les failles XSS.' },
                { icon: '🎨', title: 'Profils personnalisés', desc: 'Avatar, biographie et informations entièrement personnalisables pour chaque membre.' },
              ].map((feat) => (
                <div key={feat.title} className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-lg border border-violet-500/20">{feat.icon}</div>
                  <h3 className="font-bold text-zinc-200">{feat.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}
      </main>
    </div>
  );
}
