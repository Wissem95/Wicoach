"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit() {
    if (!email || !password) {
      toast.error("Email et mot de passe requis.");
      return;
    }
    if (password.length < 6) {
      toast.error("Mot de passe : 6 caractères minimum.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Compte créé. Connexion…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(params.get("redirect") || "/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="text-gradient">Wi</span>coach
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Ton coach fitness & nutrition perso</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{isSignup ? "Créer un compte" : "Connexion"}</CardTitle>
          <CardDescription>
            {isSignup ? "Démarre ton suivi coaching." : "Ravi de te revoir."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Patiente…" : isSignup ? "Créer le compte" : "Se connecter"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? (
              <>
                Déjà un compte ?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Se connecter
                </Link>
              </>
            ) : (
              <>
                Pas de compte ?{" "}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  Créer un compte
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
