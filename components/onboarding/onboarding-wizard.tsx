"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiSend } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trainingLabel } from "@/types";
import type { TrainingType } from "@/types";

const STEPS = ["Bienvenue", "Poids", "Cibles", "Entraînement", "Profil"];
const DAYS = [
  { v: 1, l: "Lun" },
  { v: 2, l: "Mar" },
  { v: 3, l: "Mer" },
  { v: 4, l: "Jeu" },
  { v: 5, l: "Ven" },
  { v: 6, l: "Sam" },
  { v: 0, l: "Dim" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [current, setCurrent] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [cal, setCal] = React.useState("1800");
  const [prot, setProt] = React.useState("130");
  const [carb, setCarb] = React.useState("150");
  const [fat, setFat] = React.useState("60");
  const [days, setDays] = React.useState<Set<number>>(new Set([1, 3, 5]));
  const [ttype, setTtype] = React.useState<TrainingType>("maison");
  const [focus, setFocus] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [seedRoutine, setSeedRoutine] = React.useState(true);

  function autoSuggest() {
    const tw = parseFloat(target.replace(",", ".")) || 80;
    setProt(String(Math.round(tw * 1.8)));
    setCal("1800");
    setCarb("150");
    setFat("60");
    toast.success("Cibles suggérées — ajuste si besoin");
  }

  function next() {
    // light per-step validation
    if (step === 1) {
      const c = parseFloat(current.replace(",", "."));
      const t = parseFloat(target.replace(",", "."));
      if (!(c >= 40 && c <= 250) || !(t >= 40 && t <= 250)) {
        return toast.error("Indique des poids valides (40–250 kg).");
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function finish() {
    setLoading(true);
    try {
      const chosen = [...days];
      const training = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
        day_of_week: dow,
        type: chosen.includes(dow) ? ttype : ("repos" as TrainingType),
        focus: chosen.includes(dow) ? focus.trim() || null : null,
      }));
      await apiSend("/api/onboarding", "POST", {
        current_weight: parseFloat(current.replace(",", ".")),
        target_weight: parseFloat(target.replace(",", ".")),
        target_calories: parseInt(cal, 10),
        target_protein: parseInt(prot, 10),
        target_carbs: parseInt(carb, 10),
        target_fats: parseInt(fat, 10),
        notes: notes.trim() || undefined,
        training,
        seed_routine: seedRoutine,
      });
      toast.success("C'est prêt ! Bienvenue 🎉");
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la configuration");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardContent className="p-6">
          {/* progress */}
          <div className="mb-5 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl font-extrabold text-white">
                W
              </div>
              <h1 className="text-2xl font-bold">Bienvenue sur Wicoach</h1>
              <p className="text-sm text-muted-foreground">
                3 minutes pour configurer ton coach perso : poids, objectif, nutrition et
                entraînement. Tu pourras tout modifier ensuite (ou demander au coach).
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Ton poids</h2>
              <div className="space-y-1.5">
                <Label htmlFor="cur">Poids actuel (kg)</Label>
                <Input id="cur" type="number" inputMode="decimal" step="0.1" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="100" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tar">Objectif (kg)</Label>
                <Input id="tar" type="number" inputMode="decimal" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="90" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Tes cibles / jour</h2>
                <Button variant="outline" size="sm" onClick={autoSuggest}>
                  <Sparkles className="h-4 w-4" /> Suggérer
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Calories" value={cal} onChange={setCal} />
                <Field label="Protéines (g)" value={prot} onChange={setProt} />
                <Field label="Glucides (g)" value={carb} onChange={setCarb} />
                <Field label="Lipides (g)" value={fat} onChange={setFat} />
              </div>
              <p className="text-xs text-muted-foreground">
                Les glucides/lipides sont des plafonds indicatifs — le coach t&apos;aidera à ajuster.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Ton entraînement</h2>
              <div>
                <Label className="text-sm">Jours d&apos;entraînement</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const on = days.has(d.v);
                    return (
                      <button
                        key={d.v}
                        type="button"
                        onClick={() =>
                          setDays((s) => {
                            const n = new Set(s);
                            n.has(d.v) ? n.delete(d.v) : n.add(d.v);
                            return n;
                          })
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium",
                          on ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                        )}
                      >
                        {d.l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Type principal</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["maison", "salle", "piscine", "course", "velo", "yoga"] as TrainingType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTtype(t)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium",
                        ttype === t ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                      )}
                    >
                      {trainingLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="focus">Focus (optionnel)</Label>
                <Input id="focus" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="ex: cardio, full body" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Pour personnaliser ton coach</h2>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Ce que le coach doit savoir</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Halal strict, allergies, blessures, horaires, sommeil, ce qui te motive…" className="min-h-[110px]" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={seedRoutine} onChange={(e) => setSeedRoutine(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--primary))]" />
                Créer une routine quotidienne (réveil, repas, séance, coucher)
              </label>
            </div>
          )}

          {/* nav */}
          <div className="mt-6 flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={loading}>
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button className="flex-1" onClick={next}>
                {step === 0 ? "Commencer" : "Continuer"} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={finish} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Terminer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
