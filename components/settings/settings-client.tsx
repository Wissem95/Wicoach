"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, Check, Brain, Target, Smartphone, Bell, Activity } from "lucide-react";
import { toast } from "sonner";
import { apiSend } from "@/lib/client-api";
import { todayISO } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PushToggle } from "@/components/settings/push-toggle";

export interface SettingsProfile {
  currentWeight: number;
  targetWeight: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  coachNotes: string | null;
  emailReminders: boolean;
  ingestToken: string;
}

export function SettingsClient({
  profile,
  ingestUrl,
}: {
  profile: SettingsProfile;
  ingestUrl: string;
}) {
  const [targets, setTargets] = React.useState({
    target_weight: profile.targetWeight,
    target_calories: profile.targetCalories,
    target_protein: profile.targetProtein,
    target_carbs: profile.targetCarbs,
    target_fats: profile.targetFats,
  });
  const [notes, setNotes] = React.useState(profile.coachNotes ?? "");
  const [email, setEmail] = React.useState(profile.emailReminders);
  const [steps, setSteps] = React.useState("");
  const [sleep, setSleep] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const fullIngestUrl = `${ingestUrl}?token=${profile.ingestToken}`;

  const saveTargets = useMutation({
    mutationFn: () => apiSend("/api/profile", "PUT", targets),
    onSuccess: () => toast.success("Cibles enregistrées"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  const saveNotes = useMutation({
    mutationFn: () => apiSend("/api/profile", "PUT", { coach_notes: notes }),
    onSuccess: () => toast.success("Mémoire du coach enregistrée"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  const saveEmail = useMutation({
    mutationFn: (v: boolean) => apiSend("/api/profile", "PUT", { email_reminders: v }),
    onSuccess: () => toast.success("Préférence enregistrée"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  const saveMetrics = useMutation({
    mutationFn: () =>
      apiSend("/api/metrics", "POST", {
        ...(steps ? { steps: parseInt(steps, 10) } : {}),
        ...(sleep ? { sleep_hours: parseFloat(sleep.replace(",", ".")) } : {}),
        date: todayISO(),
      }),
    onSuccess: () => {
      toast.success("Pas / sommeil enregistrés");
      setSteps("");
      setSleep("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(fullIngestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible — sélectionne l'URL manuellement.");
    }
  }

  const numField = (k: keyof typeof targets) => ({
    type: "number" as const,
    inputMode: "numeric" as const,
    value: targets[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setTargets((t) => ({ ...t, [k]: Number(e.target.value) })),
  });

  return (
    <div className="space-y-4">
      {/* Cibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" /> Cibles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Objectif poids (kg)</Label>
              <Input {...numField("target_weight")} step="0.1" />
            </div>
            <div className="space-y-1">
              <Label>Calories</Label>
              <Input {...numField("target_calories")} />
            </div>
            <div className="space-y-1">
              <Label>Protéines (g)</Label>
              <Input {...numField("target_protein")} />
            </div>
            <div className="space-y-1">
              <Label>Glucides (g)</Label>
              <Input {...numField("target_carbs")} />
            </div>
            <div className="space-y-1">
              <Label>Lipides (g)</Label>
              <Input {...numField("target_fats")} />
            </div>
          </div>
          <Button onClick={() => saveTargets.mutate()} disabled={saveTargets.isPending} className="w-full">
            Enregistrer les cibles
          </Button>
        </CardContent>
      </Card>

      {/* Mémoire du coach */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" /> Mémoire du coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tout ce que le coach doit savoir sur toi (mode de vie, taff, sport, compléments,
            blessures, ce qui te motive…). C&apos;est injecté à chaque conversation. Colle ici le
            résumé généré par ton ancien coach.
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Tu es développeur, sédentaire en semaine. Tu te couches souvent après 1h…"
            className="min-h-[160px]"
          />
          <Button onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending} className="w-full">
            Enregistrer la mémoire
          </Button>
        </CardContent>
      </Card>

      {/* Rappels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> Rappels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">
              <span className="font-medium">Rappels par email</span>
              <span className="block text-xs text-muted-foreground">
                Un récap le soir si tu n&apos;as rien loggé.
              </span>
            </span>
            <input
              type="checkbox"
              checked={email}
              onChange={(e) => {
                setEmail(e.target.checked);
                saveEmail.mutate(e.target.checked);
              }}
              className="h-5 w-5 accent-[hsl(var(--primary))]"
              aria-label="Activer les rappels par email"
            />
          </label>
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Smartphone className="h-3.5 w-3.5" /> Notifications iPhone (push)
            </p>
            <PushToggle />
          </div>
        </CardContent>
      </Card>

      {/* Apple Santé via Raccourci */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" /> Apple Santé (pas / poids / sommeil)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Une web app ne lit pas Apple Santé directement. La solution : un <b>Raccourci iPhone</b>
            {" "}qui envoie tes données ici automatiquement. Ton URL secrète :
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md bg-muted px-2 py-2 text-xs">
              {fullIngestUrl}
            </code>
            <Button size="icon" variant="outline" onClick={copyUrl} aria-label="Copier l'URL">
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>App <b>Raccourcis</b> → <b>Automatisation</b> → « Heure de la journée » (ex: 8h).</li>
            <li>Action <b>Obtenir des échantillons de santé</b> : Pas (aujourd&apos;hui), Poids, Sommeil.</li>
            <li>
              Action <b>Obtenir le contenu de l&apos;URL</b> → colle l&apos;URL ci-dessus, méthode
              <b> POST</b>, corps <b>JSON</b> : {`{ "steps": …, "weight": …, "sleep_hours": … }`}.
            </li>
            <li>Garde le <b>token secret</b> — il donne accès à tes données.</li>
          </ol>

          <div className="rounded-lg border p-3">
            <p className="mb-2 font-medium">Saisie rapide (manuel)</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="steps">Pas aujourd&apos;hui</Label>
                <Input
                  id="steps"
                  type="number"
                  inputMode="numeric"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="8000"
                  className="w-28"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sleep">Sommeil (h)</Label>
                <Input
                  id="sleep"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={sleep}
                  onChange={(e) => setSleep(e.target.value)}
                  placeholder="6.5"
                  className="w-24"
                />
              </div>
              <Button
                onClick={() => saveMetrics.mutate()}
                disabled={saveMetrics.isPending || (!steps && !sleep)}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
