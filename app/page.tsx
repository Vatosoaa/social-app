import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import CreatePostForm from '@/components/create-post-form';
import PostsFeed from '@/components/posts-feed';
import { ArrowRight, LogIn, Sparkles, User, UserPlus, Users } from 'lucide-react';
import type { Post } from '@/lib/definitions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const currentUser = await getCurrentUser();
  let posts: Post[] = [];
  let members: any[] = [];
  let error: string | null = null;

  if (currentUser) {
    try {
      const { rows } = await sql`
        SELECT
          p.id,
          p.user_id,
          p.content,
          p.media_url,
          p.media_type,
          p.created_at,
          p.updated_at,
          u.name  AS author_name,
          u.avatar_url AS author_avatar
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
      `;
      posts = rows as Post[];
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      error = err.message;
    }

    try {
      const { rows } = await sql`
        SELECT id, name, bio, avatar_url FROM users ORDER BY created_at DESC LIMIT 8
      `;
      members = rows;
    } catch (err: any) {
      console.error('Failed to load members:', err);
    }
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Navigation bar */}
      <header className="sticky top-0 z-30 w-full border-b border-zinc-900/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent uppercase">
              Réseau Social
            </span>
          </div>
          <div className="flex items-center gap-3">
            {currentUser ? (
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
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="h-9 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm">
                    <LogIn className="h-4 w-4 mr-1.5" /> Connexion
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="h-9 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-violet-500/10">
                    <UserPlus className="h-4 w-4 mr-1.5" /> Rejoindre
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* ─── AUTHENTICATED LAYOUT ─── */}
        {currentUser ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* Feed column */}
            <div className="space-y-5 min-w-0">
              {/* Error banner */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-sm">
                  {error}
                </div>
              )}
              <PostsFeed initialPosts={posts} currentUser={currentUser} />
            </div>

            {/* Sidebar — Members */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <Users className="h-3.5 w-3.5" />
                  Membres ({members.length})
                </div>
                <ul className="space-y-3">
                  {members.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 group">
                      <div className="h-9 w-9 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-4 w-4 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-300 truncate group-hover:text-zinc-100 transition-colors">
                          {member.name || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{member.bio || 'Pas de biographie.'}</p>
                      </div>
                      <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] flex-shrink-0" />
                    </li>
                  ))}
                </ul>
                <Link href="/profile">
                  <Button className="w-full mt-2 h-9 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl border border-zinc-700 transition-all">
                    Gérer mon profil
                  </Button>
                </Link>
              </div>
            </aside>
          </div>
        ) : (
          /* ─── LANDING (UNAUTHENTICATED) ─── */
          <div className="text-center space-y-6 max-w-3xl mx-auto mt-12 animate-fade-in">
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
        )}
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-zinc-600 border-t border-zinc-900/60">
        <p>&copy; 2026 Réseau Social Inc. Conçu avec amour, Next.js 16 et Tailwind CSS v4.</p>
      </footer>
    </div>
  );
}
