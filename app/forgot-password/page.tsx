'use client';

import { useActionState } from 'react';
import { forgotPassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 font-sans text-zinc-100 overflow-hidden px-4">
      {/* Glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-pulse duration-3000" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none animate-pulse duration-3000" />

      <main className="relative z-10 w-full max-w-md">
        <Card className="border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl shadow-2xl rounded-3xl transition-all duration-300 hover:border-zinc-700/80">
          <CardHeader className="space-y-2 text-center pt-8">
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent select-none">
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm">
              Saisissez votre e-mail pour réinitialiser votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success message */}
            {state?.success && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 text-xs leading-relaxed animate-fade-in">
                {state.message}
              </div>
            )}

            {/* Error message */}
            {state?.message && !state?.success && !state?.errors && (
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs leading-relaxed animate-fade-in">
                {state.message}
              </div>
            )}

            {!state?.success && (
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

                {/* Submit Button */}
                <Button
                  disabled={pending}
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {pending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...
                    </span>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>
              </form>
            )}

            {/* Local dev simulation box */}
            {state?.success && state?.devToken && (
              <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-850/45 text-violet-300 text-xs leading-relaxed animate-fade-in space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-zinc-200">
                  <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-ping" />
                  🛠️ Simulation Locale
                </p>
                <p>Aucun serveur d envoi d emails n est configuré. Utilisez ce lien généré pour modifier votre mot de passe :</p>
                <Link
                  href={`/reset-password?token=${state.devToken}`}
                  className="block p-2 bg-black/40 rounded-lg text-cyan-400 font-mono text-xxs break-all border border-zinc-800/60 hover:bg-black/60 hover:text-cyan-300 transition-all"
                >
                  /reset-password?token={state.devToken}
                </Link>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center pb-8 border-t border-zinc-800/40 pt-6">
            <Link href="/login" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Retour à la connexion
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
