'use client';

import { useActionState, useEffect, useState, Suspense } from 'react';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [state, action, pending] = useActionState(login, undefined);

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccessMessage('Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
    }
  }, [searchParams]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 font-sans text-zinc-100 overflow-hidden px-4">
      {/* Glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-pulse duration-3000" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none animate-pulse duration-3000" />

      <main className="relative z-10 w-full max-w-md">
        <Card className="border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl shadow-2xl rounded-3xl transition-all duration-300 hover:border-zinc-700/80">
          <CardHeader className="space-y-2 text-center pt-8">
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent select-none">
              Connexion
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm">
              Accédez à votre espace membre sur le Réseau Social
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success alert */}
            {successMessage && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 text-xs leading-relaxed animate-fade-in">
                {successMessage}
              </div>
            )}

            {/* Error banner */}
            {state?.message && !state?.errors && (
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs leading-relaxed animate-fade-in">
                {state.message}
              </div>
            )}

            <form action={action} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-zinc-300">
                  Adresse e-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    defaultValue={state?.errors ? '' : undefined}
                    className="pl-10 h-11 bg-zinc-950/50 border-zinc-800/80 rounded-xl focus-visible:ring-violet-500 text-zinc-100 placeholder:text-zinc-600"
                    required
                  />
                </div>
                {state?.errors?.email && (
                  <p className="text-rose-400 text-xxs font-medium mt-1 pl-1">
                    {state.errors.email[0]}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-semibold text-zinc-300">
                    Mot de passe
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 bg-zinc-950/50 border-zinc-800/80 rounded-xl focus-visible:ring-violet-500 text-zinc-100 placeholder:text-zinc-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {state?.errors?.password && (
                  <p className="text-rose-400 text-xxs font-medium mt-1 pl-1">
                    {state.errors.password[0]}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                disabled={pending}
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                {pending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Connexion en cours...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pb-8 border-t border-zinc-800/40 pt-6">
            <p className="text-xs text-zinc-500">
              Nouveau membre ?{' '}
              <Link href="/signup" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors ml-1">
                Créer un compte
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Chargement...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
