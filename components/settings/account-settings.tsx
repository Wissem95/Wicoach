"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { apiSend } from "@/lib/client-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountSettings({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [busy, setBusy] = React.useState<"pwd" | "email" | "del" | null>(null);

  async function changePassword() {
    if (password.length < 6) return toast.error("6 caractères minimum.");
    setBusy("pwd");
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(null);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Mot de passe mis à jour");
  }

  async function changeEmail() {
    if (!newEmail.includes("@")) return toast.error("Email invalide.");
    setBusy("email");
    const { error } = await createClient().auth.updateUser({ email: newEmail });
    setBusy(null);
    if (error) return toast.error(error.message);
    setNewEmail("");
    toast.success("Vérifie tes emails pour confirmer la nouvelle adresse.");
  }

  async function deleteAccount() {
    if (!window.confirm("Supprimer définitivement ton compte et toutes tes données ? Action irréversible.")) return;
    setBusy("del");
    try {
      await apiSend("/api/account", "DELETE");
      await createClient().auth.signOut();
      toast.success("Compte supprimé.");
      router.replace("/");
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof Error ? e.message : "Échec de la suppression");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" /> Compte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Connecté en tant que <b>{email}</b></p>

        <div className="space-y-1.5">
          <Label htmlFor="np">Nouveau mot de passe</Label>
          <div className="flex gap-2">
            <Input id="np" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <Button onClick={changePassword} disabled={busy === "pwd"}>
              {busy === "pwd" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Changer"}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ne" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Nouvel email</Label>
          <div className="flex gap-2">
            <Input id="ne" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nouveau@email.com" />
            <Button variant="outline" onClick={changeEmail} disabled={busy === "email"}>
              {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour"}
            </Button>
          </div>
        </div>

        <div className="border-t pt-3">
          <Button variant="destructive" className="w-full" onClick={deleteAccount} disabled={busy === "del"}>
            {busy === "del" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Supprimer mon compte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
