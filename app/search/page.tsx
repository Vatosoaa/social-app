import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { getSuggestions } from '@/app/actions/follows';
import { BookOpen, Users, Hash } from 'lucide-react';
import SuggestionsSidebar from '@/components/suggestions-sidebar';
import PostsFeed from '@/components/posts-feed';
import UserSearchList from '@/components/user-search-list';
import LiveSearchBar from '@/components/live-search-bar';
import AppShell from '@/components/app-shell';
import Link from 'next/link';
import type { Post } from '@/lib/definitions';
import type { FollowUser } from '@/app/actions/follows';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

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
  let error: string | null = null;

  try {
    suggestions = await getSuggestions();
  } catch (err) {
    console.error('Failed to load suggestions:', err);
  }

  if (q) {
    try {
      const empty = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };

      const postsRes = await sql`
        SELECT
          p.id, p.user_id, p.content, p.media_url, p.media_type, p.created_at, p.updated_at,
          u.name AS author_name, u.avatar_url AS author_avatar,
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
      postsResults = postsRes.rows.map((row) => ({ ...row, reactions_by_type: row.reactions_by_type || empty })) as Post[];

      const usersRes = await sql`
        SELECT u.id, u.name, u.bio, u.avatar_url,
          EXISTS(SELECT 1 FROM follows WHERE follower_id = ${currentUser.id} AND following_id = u.id) AS is_following
        FROM users u
        WHERE u.id <> ${currentUser.id}
          AND (u.name ILIKE ${'%' + q + '%'} OR u.bio ILIKE ${'%' + q + '%'})
        ORDER BY u.name ASC
        LIMIT 50
      `;
      usersResults = usersRes.rows as FollowUser[];

      const hashtagQuery = q.startsWith('#') ? q : '#' + q;
      const hashtagPostsRes = await sql`
        SELECT
          p.id, p.user_id, p.content, p.media_url, p.media_type, p.created_at, p.updated_at,
          u.name AS author_name, u.avatar_url AS author_avatar,
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
    <AppShell
      currentUser={currentUser}
      rightSidebar={<SuggestionsSidebar initialSuggestions={suggestions} currentUserId={currentUser.id} />}
    >
      <div className="space-y-6 max-w-2xl mx-auto w-full py-2">

        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm">
            {error}
          </div>
        )}

        {/* Search bar */}
        <div className="rounded-3xl bg-white border border-slate-200/60 shadow-xs p-5">
          <LiveSearchBar initialQuery={q} />
        </div>

        {/* Results */}
        {q && (
          <div className="space-y-5">
            {/* Tab switcher */}
            <div className="flex gap-2 p-1 rounded-2xl bg-white border border-slate-200/60 shadow-xs">
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
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  </Link>
                );
              })}
            </div>

            {/* Tab content */}
            <div>
              {activeTab === 'posts' && (
                postsResults.length > 0 ? (
                  <PostsFeed initialPosts={postsResults} currentUser={currentUser} />
                ) : (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-200/60 shadow-xs">
                    <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm font-semibold">Aucune publication trouvée</p>
                    <p className="text-xs mt-1">Aucun post ne correspond à &ldquo;{q}&rdquo;.</p>
                  </div>
                )
              )}

              {activeTab === 'users' && (
                <UserSearchList initialUsers={usersResults} currentUserId={currentUser.id} />
              )}

              {activeTab === 'hashtags' && (
                hashtagsResults.length > 0 ? (
                  <PostsFeed initialPosts={hashtagsResults} currentUser={currentUser} />
                ) : (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-200/60 shadow-xs">
                    <Hash className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm font-semibold">Aucun hashtag trouvé</p>
                    <p className="text-xs mt-1">Aucune publication ne contient ce hashtag.</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
