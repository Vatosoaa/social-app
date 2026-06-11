import { sql } from "@vercel/postgres";

export const dynamic = "force-dynamic";

export default async function Home() {
  let users: any[] = [];
  let error: string | null = null;

  try {
    // Attempt to query users from Neon / Vercel Postgres
    const { rows } = await sql`SELECT * FROM users`;
    users = rows;
  } catch (err: any) {
    console.error("Database connection or query error:", err);
    error = err.message || "Failed to load users";
  }

  return (
    <div className="relative flex flex-col min-h-screen items-center justify-center bg-zinc-950 font-sans text-zinc-100 overflow-hidden px-4">
      {/* Decorative gradient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      <main className="relative z-10 flex flex-col w-full max-w-lg bg-zinc-900/60 backdrop-blur-xl p-8 rounded-3xl border border-zinc-800/80 shadow-2xl transition-all duration-300 hover:border-zinc-700/80">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm select-none">
            Bonjour
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Base de données PostgreSQL connectée
          </p>
        </div>

        {error ? (
          <div className="p-5 text-sm text-rose-300 bg-rose-950/20 rounded-2xl border border-rose-900/30 w-full animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <p className="font-semibold text-rose-200">Erreur de connexion</p>
            </div>
            <p className="opacity-95 leading-relaxed font-mono text-xs overflow-x-auto p-2 bg-black/40 rounded-lg">
              {error}
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              Veuillez vérifier que <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xxs font-mono">POSTGRES_URL</code> est défini dans votre fichier <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xxs font-mono">.env</code> local ou configuré sur Vercel.
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/20 text-zinc-400 flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-300 font-bold">
              ?
            </div>
            <div>
              <p className="font-medium text-zinc-300">Aucun utilisateur</p>
              <p className="text-xs text-zinc-500 mt-1">La table `users` semble vide ou inexistante.</p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">
              <span>Utilisateurs ({users.length})</span>
              <span>Statut</span>
            </div>
            <ul className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {users.map((user) => (
                <li 
                  key={user.id} 
                  className="flex items-center justify-between p-4 rounded-2xl bg-zinc-800/40 border border-zinc-800/40 hover:bg-zinc-800/80 hover:border-zinc-700/50 transition-all duration-200 group"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors duration-150">
                      {user.name || user.username || "Utilisateur sans nom"}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {user.email || "Pas d'adresse e-mail"}
                    </span>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] group-hover:scale-125 transition-transform duration-200" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}


