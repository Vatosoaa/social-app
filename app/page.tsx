import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, LogIn, Sparkles, User, UserPlus, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const currentUser = await getCurrentUser();
  let users: any[] = [];
  let error: string | null = null;

  try {
    const { rows } = await sql`
      SELECT id, email, name, bio, avatar_url FROM users ORDER BY created_at DESC LIMIT 5
    `;
    users = rows;
  } catch (err: any) {
    console.error('Failed to load users for feed:', err);
    error = err.message || 'Impossible de charger les utilisateurs';
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Decorative gradient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Main Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between px-6 py-6 border-b border-zinc-900/60 bg-zinc-950/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <span className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent uppercase">
            Réseau Social
          </span>
        </div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <Link href="/profile">
              <Button className="h-10 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800/80 rounded-xl transition-all">
                <User className="h-4 w-4 mr-2" /> Mon Profil
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="h-10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 rounded-xl">
                  <LogIn className="h-4 w-4 mr-2" /> Se connecter
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-violet-500/10">
                  <UserPlus className="h-4 w-4 mr-2" /> Rejoindre
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero / Main Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-12 w-full gap-16">
        
        {/* Landing View (If NOT Logged In) */}
        {!currentUser ? (
          <div className="text-center space-y-6 max-w-3xl animate-fade-in mt-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/30 border border-violet-800/30 text-violet-400 text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Une expérience utilisateur premium
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm select-none">
              Connectez-vous à la communauté
            </h1>
            <p className="text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Découvrez notre tout nouveau réseau social. Créez un profil personnalisé, mettez à jour votre biographie et partagez avec les autres membres de la plateforme.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-6 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-xl shadow-violet-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  Commencer maintenant <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-3">
                <div className="h-10 w-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-400 font-bold border border-violet-500/20">
                  🛡️
                </div>
                <h3 className="font-bold text-zinc-200">Sécurité JWT + HttpOnly</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sessions chiffrées sans état sauvegardées dans des cookies sécurisés HTTP-Only, immunisées contre les failles XSS.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-3">
                <div className="h-10 w-10 rounded-xl bg-fuchsia-600/10 flex items-center justify-center text-fuchsia-400 font-bold border border-fuchsia-500/20">
                  🎨
                </div>
                <h3 className="font-bold text-zinc-200">Profils Personnalisés</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Choisissez parmi nos superbes avatars dessinés ou téléversez vos propres photos encodées en Base64.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-600/10 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/20">
                  ⚡
                </div>
                <h3 className="font-bold text-zinc-200">Next.js 16 Server Actions</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Des mutations de données instantanées côté serveur avec validation Zod et transitions fluides.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* User Dashboard / Feed View (If Logged In) */
          <div className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-xl p-8 rounded-3xl border border-zinc-800/80 shadow-2xl space-y-8 animate-fade-in">
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-850">
              <div className="h-14 w-14 rounded-full overflow-hidden border border-violet-500/30 bg-zinc-950">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-zinc-500"><User className="h-6 w-6" /></div>
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-medium">Ravi de vous revoir,</p>
                <h2 className="text-xl font-bold text-zinc-200">{currentUser.name || 'Utilisateur'} 👋</h2>
              </div>
            </div>

            {/* List of members */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Membres de la communauté</span>
                <span>En ligne</span>
              </div>

              {error ? (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs">{error}</div>
              ) : users.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">Aucun autre utilisateur enregistré.</p>
              ) : (
                <ul className="space-y-3">
                  {users.map((user) => (
                    <li
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-zinc-850/40 border border-zinc-850/60 hover:bg-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-11 w-11 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-zinc-600"><User className="h-5 w-5" /></div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors duration-150">
                            {user.name || 'Utilisateur anonyme'}
                          </span>
                          <span className="text-xs text-zinc-400 line-clamp-1">
                            {user.bio || "Pas de biographie rédigée."}
                          </span>
                        </div>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] group-hover:scale-125 transition-transform duration-200" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-2">
              <Link href="/profile">
                <Button className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-lg transition-all duration-300">
                  Gérer mon profil
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-xs text-zinc-600 border-t border-zinc-900/60">
        <p>&copy; 2026 Réseau Social Inc. Conçu avec amour, Next.js et Tailwind CSS v4.</p>
      </footer>
    </div>
  );
}
