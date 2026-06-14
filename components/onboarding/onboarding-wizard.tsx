"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiSend } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import {
  computeTargets,
  bodyFatNavy,
  GOAL_LABELS,
  ACTIVITY_LABELS,
  MORPH_LABELS,
  type Sex,
  type Goal,
  type Activity,
  type Morph,
} from "@/lib/nutrition";
import { trainingLabel } from "@/types";
import type { TrainingType } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = ["Toi", "Mesures", "Objectif", "Activité", "Corps & santé", "Lieu & matériel", "Cibles", "Entraînement"];
const DAYS = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mer" }, { v: 4, l: "Jeu" },
  { v: 5, l: "Ven" }, { v: 6, l: "Sam" }, { v: 0, l: "Dim" },
];
const EQUIPMENT = [
  { v: "halteres", l: "Haltères" },
  { v: "elastiques", l: "Élastiques" },
  { v: "barre", l: "Barre & poids" },
  { v: "kettlebell", l: "Kettlebell" },
  { v: "banc", l: "Banc" },
  { v: "tractions", l: "Barre de traction" },
  { v: "tapis", l: "Tapis de course" },
  { v: "velo", l: "Vélo d'appart" },
  { v: "aucun", l: "Aucun (poids du corps)" },
];
const ACTIVITY_DESC: Record<Activity, string> = {
  sedentaire: "Bureau, peu de marche",
  leger: "1-2 séances/sem",
  modere: "3-4 séances/sem",
  actif: "5-6 séances/sem",
  tres_actif: "Athlète / travail physique",
};
const DIETS = [
  { v: "halal", l: "Halal" },
  { v: "vegetarien", l: "Végétarien" },
  { v: "vegan", l: "Végan" },
  { v: "sans_lactose", l: "Sans lactose" },
];

function OptionCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-all active:scale-[0.99]",
        active ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:bg-accent",
      )}
    >
      <span className="font-medium">{title}</span>
      {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
    </button>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [sex, setSex] = React.useState<Sex | null>(null);
  const [age, setAge] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [current, setCurrent] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [goal, setGoal] = React.useState<Goal>("perte");
  const [activity, setActivity] = React.useState<Activity>("modere");
  const [morph, setMorph] = React.useState<Morph>("meso");
  const [diabetic, setDiabetic] = React.useState(false);
  const [hypertension, setHypertension] = React.useState(false);
  const [cholesterol, setCholesterol] = React.useState(false);
  const [diet, setDiet] = React.useState<Set<string>>(new Set());
  const [allergies, setAllergies] = React.useState("");
  const [healthOther, setHealthOther] = React.useState("");

  const [targets, setTargets] = React.useState<{ calories: string; protein: string; carbs: string; fats: string } | null>(null);

  const [days, setDays] = React.useState<Set<number>>(new Set([1, 3, 5]));
  const [ttype, setTtype] = React.useState<TrainingType>("maison");

  const [gym, setGym] = React.useState(false);
  const [equipment, setEquipment] = React.useState<Set<string>>(new Set(["aucun"]));
  const [neck, setNeck] = React.useState("");
  const [waist, setWaist] = React.useState("");
  const [hip, setHip] = React.useState("");
  const [likes, setLikes] = React.useState("");
  const [dislikes, setDislikes] = React.useState("");

  const nums = {
    age: parseInt(age, 10),
    height: parseFloat(height.replace(",", ".")),
    current: parseFloat(current.replace(",", ".")),
    target: parseFloat(target.replace(",", ".")),
  };
  const measuresValid =
    nums.age >= 12 && nums.age <= 100 &&
    nums.height >= 120 && nums.height <= 230 &&
    nums.current >= 40 && nums.current <= 250 &&
    nums.target >= 40 && nums.target <= 250;

  const computed = React.useMemo(() => {
    if (!sex || !measuresValid) return null;
    return computeTargets({
      sex, age: nums.age, heightCm: nums.height, currentKg: nums.current,
      targetKg: nums.target, goal, activity, morph, diabetic,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sex, age, height, current, target, goal, activity, morph, diabetic]);

  const bodyFat = React.useMemo(() => {
    if (!sex || !measuresValid) return null;
    return bodyFatNavy(sex, nums.height, parseFloat(neck.replace(",", ".")), parseFloat(waist.replace(",", ".")), parseFloat(hip.replace(",", ".")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sex, height, neck, waist, hip, measuresValid]);

  // Seed editable targets when arriving on the calc step.
  React.useEffect(() => {
    if (step === 6 && computed && !targets) {
      setTargets({
        calories: String(computed.calories),
        protein: String(computed.protein),
        carbs: String(computed.carbs),
        fats: String(computed.fats),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, computed]);

  function next() {
    if (step === 0 && !sex) return toast.error("Choisis une option.");
    if (step === 1 && !measuresValid) return toast.error("Vérifie âge, taille et poids.");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function buildNotes(): string {
    const diets = [...diet].map((d) => DIETS.find((x) => x.v === d)?.l ?? d);
    const equip = [...equipment].map((e) => EQUIPMENT.find((x) => x.v === e)?.l ?? e);
    const conditions = [
      diabetic && "diabétique",
      hypertension && "hypertension",
      cholesterol && "cholestérol",
    ].filter(Boolean);
    const c = computed;
    const dayNames = [...days].map((d) => DAYS.find((x) => x.v === d)?.l ?? d);
    return [
      `Profil (onboarding) : ${sex}, ${nums.age} ans, ${nums.height} cm, ${nums.current} → ${nums.target} kg.`,
      bodyFat ? `Masse grasse estimée (US Navy) : ${bodyFat}%.` : "",
      `Objectif : ${GOAL_LABELS[goal]}. Activité : ${ACTIVITY_LABELS[activity]}. Morphologie : ${MORPH_LABELS[morph]}.`,
      conditions.length ? `Santé : ${conditions.join(", ")}.` : "",
      healthOther.trim() ? `Autres infos santé : ${healthOther.trim()}.` : "",
      diets.length ? `Alimentation : ${diets.join(", ")}.` : "",
      allergies.trim() ? `Allergies/intolérances (À ÉVITER ABSOLUMENT) : ${allergies.trim()}.` : "",
      likes.trim() ? `Aliments aimés : ${likes.trim()}.` : "",
      dislikes.trim() ? `Aliments détestés : ${dislikes.trim()}.` : "",
      gym ? "Accès SALLE de sport (abonnement)." : `Entraînement à la MAISON, matériel dispo : ${equip.join(", ") || "aucun (poids du corps)"}.`,
      `Jours d'entraînement : ${dayNames.join(", ") || "à définir"} (type principal : ${ttype}).`,
      c ? `Cibles : BMR ${c.bmr} kcal, TDEE ${c.tdee} kcal → ${targets?.calories} kcal/jour, ${targets?.protein}g protéines, ${targets?.carbs}g glucides, ${targets?.fats}g lipides.` : "",
      diabetic ? "IMPORTANT diabète : index glycémique bas, glucides maîtrisés et répartis ; adapter les menus en conséquence." : "",
    ].filter(Boolean).join(" ");
  }

  async function finish() {
    if (!sex || !measuresValid || !targets) return toast.error("Complète les étapes.");
    setLoading(true);
    const summary = buildNotes();
    try {
      const chosen = [...days];
      const training = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
        day_of_week: dow,
        type: chosen.includes(dow) ? ttype : ("repos" as TrainingType),
        focus: null as string | null,
      }));
      // 1) Deterministic config (targets + onboarded + plan skeleton + routine).
      await apiSend("/api/onboarding", "POST", {
        current_weight: nums.current,
        target_weight: nums.target,
        target_calories: parseInt(targets.calories, 10),
        target_protein: parseInt(targets.protein, 10),
        target_carbs: parseInt(targets.carbs, 10),
        target_fats: parseInt(targets.fats, 10),
        notes: summary,
        training,
        seed_routine: true,
      });
      // 2) Build the full program (menus + sessions) in the BACKGROUND so the
      // user isn't stuck waiting. keepalive lets it finish after navigation.
      fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
        keepalive: true,
      }).catch(() => {});
      toast.success("C'est prêt ! Ton programme se complète en arrière-plan 🎉");
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Tu es…</h2>
              <p className="text-sm text-muted-foreground">Indispensable pour calculer tes besoins réels (le métabolisme diffère).</p>
              <div className="grid grid-cols-2 gap-2">
                <OptionCard active={sex === "homme"} onClick={() => setSex("homme")} title="Homme" />
                <OptionCard active={sex === "femme"} onClick={() => setSex("femme")} title="Femme" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Tes mesures</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Âge" value={age} onChange={setAge} placeholder="23" />
                <Field label="Taille (cm)" value={height} onChange={setHeight} placeholder="175" />
                <Field label="Poids actuel (kg)" value={current} onChange={setCurrent} placeholder="80" />
                <Field label="Objectif (kg)" value={target} onChange={setTarget} placeholder="75" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Ton objectif</h2>
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <OptionCard key={g} active={goal === g} onClick={() => setGoal(g)} title={GOAL_LABELS[g]} />
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Niveau d&apos;activité</h2>
              {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
                <OptionCard key={a} active={activity === a} onClick={() => setActivity(a)} title={ACTIVITY_LABELS[a]} desc={ACTIVITY_DESC[a]} />
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Corps & santé</h2>
              <div className="space-y-1.5">
                <Label className="text-sm">Comment réagit ton corps ?</Label>
                {(Object.keys(MORPH_LABELS) as Morph[]).map((m) => (
                  <OptionCard key={m} active={morph === m} onClick={() => setMorph(m)} title={MORPH_LABELS[m]} />
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Conditions de santé</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Toggle active={diabetic} onClick={() => setDiabetic((v) => !v)} label="Diabète" />
                  <Toggle active={hypertension} onClick={() => setHypertension((v) => !v)} label="Hypertension" />
                  <Toggle active={cholesterol} onClick={() => setCholesterol((v) => !v)} label="Cholestérol" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Alimentation</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETS.map((d) => (
                    <Toggle
                      key={d.v}
                      active={diet.has(d.v)}
                      onClick={() => setDiet((s) => { const n = new Set(s); n.has(d.v) ? n.delete(d.v) : n.add(d.v); return n; })}
                      label={d.l}
                    />
                  ))}
                </div>
              </div>
              <Field label="Allergies / intolérances" value={allergies} onChange={setAllergies} placeholder="arachides, gluten…" text />
              <Field label="Aliments que tu adores" value={likes} onChange={setLikes} placeholder="saumon, avoine, poulet…" text />
              <Field label="Aliments que tu détestes" value={dislikes} onChange={setDislikes} placeholder="brocoli, foie…" text />
              <Field label="Autre info santé (blessure, traitement…)" value={healthOther} onChange={setHealthOther} placeholder="optionnel" text />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Lieu & matériel</h2>
              <div className="space-y-1.5">
                <Label className="text-sm">Où t&apos;entraînes-tu ?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <OptionCard active={gym} onClick={() => setGym(true)} title="Salle de sport" desc="Abonnement / machines" />
                  <OptionCard active={!gym} onClick={() => setGym(false)} title="À la maison" desc="Avec mon matériel" />
                </div>
              </div>
              {!gym && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Matériel disponible</Label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT.map((e) => (
                      <Toggle
                        key={e.v}
                        active={equipment.has(e.v)}
                        onClick={() => setEquipment((s) => { const n = new Set(s); n.has(e.v) ? n.delete(e.v) : n.add(e.v); return n; })}
                        label={e.l}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm">Mensurations (optionnel — estime ta masse grasse)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Cou (cm)" value={neck} onChange={setNeck} placeholder="38" />
                  <Field label="Taille (cm)" value={waist} onChange={setWaist} placeholder="90" />
                  {sex === "femme" && <Field label="Hanches (cm)" value={hip} onChange={setHip} placeholder="95" />}
                </div>
                {bodyFat && <p className="text-xs text-muted-foreground">Masse grasse estimée : <b>{bodyFat}%</b></p>}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Calculator className="h-5 w-5 text-primary" /> Tes cibles calculées
              </h2>
              {bodyFat && (
                <div className="rounded-xl bg-accent p-2.5 text-center text-sm">
                  Masse grasse estimée : <b>{bodyFat}%</b>
                </div>
              )}
              {!computed ? (
                <p className="text-sm text-muted-foreground">Complète tes mesures (étape 2) pour le calcul.</p>
              ) : (
                <>
                  <div className="rounded-xl bg-muted p-3 text-sm">
                    Métabolisme de base : <b>{computed.bmr} kcal</b> · Dépense estimée (TDEE) : <b>{computed.tdee} kcal</b>.
                    <span className="block text-xs text-muted-foreground">Calcul Mifflin-St Jeor selon ton sexe, âge, taille, poids et activité, ajusté à ton objectif{diabetic ? " et adapté au diabète" : ""}.</span>
                  </div>
                  {targets && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Calories" value={targets.calories} onChange={(v) => setTargets({ ...targets, calories: v })} />
                      <Field label="Protéines (g)" value={targets.protein} onChange={(v) => setTargets({ ...targets, protein: v })} />
                      <Field label="Glucides (g)" value={targets.carbs} onChange={(v) => setTargets({ ...targets, carbs: v })} />
                      <Field label="Lipides (g)" value={targets.fats} onChange={(v) => setTargets({ ...targets, fats: v })} />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => computed && setTargets({ calories: String(computed.calories), protein: String(computed.protein), carbs: String(computed.carbs), fats: String(computed.fats) })}
                  >
                    Recalculer
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Ton entraînement</h2>
              <div>
                <Label className="text-sm">Jours d&apos;entraînement</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {DAYS.map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => setDays((s) => { const n = new Set(s); n.has(d.v) ? n.delete(d.v) : n.add(d.v); return n; })}
                      className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", days.has(d.v) ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                    >
                      {d.l}
                    </button>
                  ))}
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
                      className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", ttype === t ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                    >
                      {trainingLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={loading}>
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button className="flex-1" onClick={next}>
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={finish} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Terminer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, text }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; text?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={text ? "text" : "number"}
        inputMode={text ? "text" : "decimal"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", active ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
    >
      {label}
    </button>
  );
}
