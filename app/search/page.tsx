import { redirect } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { getSuggestions } from '@/app/actions/follows';
import { Sparkles, User, Bookmark, MessageSquare, Search, BookOpen, Users, Hash } from 'lucide-react';
import SuggestionsSidebar from '@/components/suggestions-sidebar';
import PostsFeed from '@/components/posts-feed';
import UserSearchList from '@/components/user-search-list';
import LiveSearchBar from '@/components/live-search-bar';
import type { Post } from '@/lib/definitions';
import type { FollowUser } from '@/app/actions/follows';
import Navbar from '@/components/navbar';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const TRENDING_HASHTAGS = [
  'nextjs',
  'react',
  'tailwindcss',
  'webdev',
  'inspiration',
  'productivite',
  'twinkly',
];

export default async function SearchPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const q = (resolvedParams.q as string || '').trim();
  const activeTab = (resolvedParams.tab as string || 'posts');

  let postsResults: Post[] = [];
  let usersResults: FollowUser[] = [];
  let hashtagsResults: Post[] = [];
  let suggestions: FollowUser[] = [];
  let unreadMessagesCount = 0;
  let error: string | null = null;

  // Fetch suggestions and unread messages count
  try {
    suggestions = await getSuggestions();
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
  } catch (err) {
    console.error('Failed to load initial page data:', err);
  }

  // If there is a search query, run the searches
  if (q) {
    try {
      // 1. Search publications
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
        WHERE p.content ILIKE ${'%' + q + '%'}
        ORDER BY p.created_at DESC
        LIMIT 50
      `;
      const empty = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
      postsResults = postsRes.rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];

      // 2. Search users
      const usersRes = await sql`
        SELECT
          u.id,
          u.name,
          u.bio,
          u.avatar_url,
          EXISTS(SELECT 1 FROM follows WHERE follower_id = ${currentUser.id} AND following_id = u.id) AS is_following
        FROM users u
        WHERE u.id <> ${currentUser.id}
          AND (u.name ILIKE ${'%' + q + '%'} OR u.bio ILIKE ${'%' + q + '%'})
        ORDER BY u.name ASC
        LIMIT 50
      `;
      usersResults = usersRes.rows as FollowUser[];

      // 3. Search hashtags
      const hashtagQuery = q.startsWith('#') ? q : '#' + q;
      const hashtagPostsRes = await sql`
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
        WHERE p.content ILIKE ${'%' + hashtagQuery + '%'}
        ORDER BY p.created_at DESC
        LIMIT 50
      `;
      hashtagsResults = hashtagPostsRes.rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];
    } catch (err: any) {
      console.error('Failed to run search queries:', err);
      error = err.message;
    }
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Navigation bar */}
      <Navbar 
        currentUser={currentUser} 
        activeTab="search" 
        unreadMessagesCount={unreadMessagesCount} 
      />

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_300px] gap-6">
          
          {/* Left Sidebar Navigation */}
          <aside className="hidden md:block">
            <div className="sticky top-24 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-5 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-3">Navigation</p>
                <nav className="space-y-1">
                  {[
                    { name: 'Accueil', href: '/', icon: Sparkles, active: false },
                    { name: 'Recherche', href: '/search', icon: Search, active: true },
                    { name: 'Mes Favoris', href: '/?filter=favorites', icon: Bookmark, active: false },
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
                          <span className="ml-auto bg-violet-650 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
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
                          <User className="h-3.5 w-3.5 text-zinc-550" />
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

          {/* Search workspace column */}
          <div className="space-y-6 min-w-0">
            {/* Error banner */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-sm">
                {error}
              </div>
            )}

            {/* Search Input Box with Live Autocomplete */}
            <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-5 relative">
              <LiveSearchBar initialQuery={q} />
            </div>

            {/* Search Results Display */}
            {q && (
              <div className="space-y-5">
                {/* Search Tabs */}
                <div className="flex gap-2 p-1 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md">
                  {[
                    { id: 'posts', label: 'Publications', icon: BookOpen, count: postsResults.length },
                    { id: 'users', label: 'Membres', icon: Users, count: usersResults.length },
                    { id: 'hashtags', label: 'Hashtags', icon: Hash, count: hashtagsResults.length },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const searchUrl = `/search?q=${encodeURIComponent(q)}&tab=${tab.id}`;
                    return (
                      <Link key={tab.id} href={searchUrl} className="flex-1">
                        <button
                          type="button"
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isActive
                              ? 'bg-violet-600/10 border border-violet-500/20 text-violet-400 font-semibold shadow-[0_0_15px_rgba(139,92,246,0.05)]'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20'
                          }`}
                        >
                          <tab.icon className="h-3.5 w-3.5" />
                          <span>{tab.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      </Link>
                    );
                  })}
                </div>

                {/* Tab content panels */}
                <div className="min-h-0">
                  {activeTab === 'posts' && (
                    <div>
                      {postsResults.length > 0 ? (
                        <PostsFeed initialPosts={postsResults} currentUser={currentUser} />
                      ) : (
                        <div className="text-center py-12 text-zinc-500">
                          <BookOpen className="h-8 w-8 text-zinc-700 mx-auto mb-2 animate-pulse" />
                          <p className="text-sm font-semibold">Aucune publication trouvée</p>
                          <p className="text-xs">Aucun post ne correspond à votre recherche "{q}".</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <UserSearchList initialUsers={usersResults} currentUserId={currentUser.id} />
                  )}

                  {activeTab === 'hashtags' && (
                    <div>
                      {hashtagsResults.length > 0 ? (
                        <PostsFeed initialPosts={hashtagsResults} currentUser={currentUser} />
                      ) : (
                        <div className="text-center py-12 text-zinc-500">
                          <Hash className="h-8 w-8 text-zinc-700 mx-auto mb-2 animate-pulse" />
                          <p className="text-sm font-semibold">Aucun hashtag trouvé</p>
                          <p className="text-xs">Aucune publication ne contient le hashtag ou tag correspondant.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — Suggestions */}
          <aside className="hidden lg:block">
            <SuggestionsSidebar initialSuggestions={suggestions} currentUserId={currentUser.id} />
          </aside>
        </div>
      </main>
    </div>
  );
}
