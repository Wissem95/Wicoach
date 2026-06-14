"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Scale, Utensils, Camera, Dumbbell, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiSend } from "@/lib/client-api";
import { todayISO, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MealDialog, type MealDraft } from "@/components/meals/meal-dialog";
import { PhotoAnalyzeDialog } from "@/components/meals/photo-dialog";
import { TRAINING_TYPE_OPTIONS, trainingLabel } from "@/types";
import type { TrainingType } from "@/types";

// Global custom events let any card trigger a quick action.
export const QA_EVENTS = {
  meal: "wicoach:add-meal",
  photo: "wicoach:add-photo",
  weight: "wicoach:add-weight",
  workout: "wicoach:add-workout",
} as const;

export function fireQuickAction(kind: keyof typeof QA_EVENTS) {
  window.dispatchEvent(new CustomEvent(QA_EVENTS[kind]));
}

export function QuickActions() {
  const router = useRouter();
  const [fab, setFab] = React.useState(false);
  const [mealOpen, setMealOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Partial<MealDraft> | undefined>();
  const [aiMeta, setAiMeta] = React.useState<{ confidence: number; notes: string } | null>(null);
  const [photoOpen, setPhotoOpen] = React.useState(false);
  const [weightOpen, setWeightOpen] = React.useState(false);
  const [workoutOpen, setWorkoutOpen] = React.useState(false);

  const openMeal = React.useCallback(() => {
    setDraft({ name: "", mealType: "dejeuner", items: [] });
    setAiMeta(null);
    setMealOpen(true);
  }, []);

  React.useEffect(() => {
    const onMeal = () => openMeal();
    const onPhoto = () => setPhotoOpen(true);
    const onWeight = () => setWeightOpen(true);
    const onWorkout = () => setWorkoutOpen(true);
    window.addEventListener(QA_EVENTS.meal, onMeal);
    window.addEventListener(QA_EVENTS.photo, onPhoto);
    window.addEventListener(QA_EVENTS.weight, onWeight);
    window.addEventListener(QA_EVENTS.workout, onWorkout);
    return () => {
      window.removeEventListener(QA_EVENTS.meal, onMeal);
      window.removeEventListener(QA_EVENTS.photo, onPhoto);
      window.removeEventListener(QA_EVENTS.weight, onWeight);
      window.removeEventListener(QA_EVENTS.workout, onWorkout);
    };
  }, [openMeal]);

  const actions = [
    { label: "Peser", icon: Scale, run: () => setWeightOpen(true) },
    { label: "Repas", icon: Utensils, run: openMeal },
    { label: "Photo", icon: Camera, run: () => setPhotoOpen(true) },
    { label: "Séance", icon: Dumbbell, run: () => setWorkoutOpen(true) },
  ];

  return (
    <>
      {/* Floating + button */}
      <button
        type="button"
        onClick={() => setFab(true)}
        aria-label="Ajouter"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:bottom-6"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Bottom action sheet */}
      {fab && (
        <div className="fixed inset-0 z-50" onClick={() => setFab(false)}>
          <div className="absolute inset-0 bg-black/40 animate-in fade-in" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-background p-4 pb-8 shadow-lg animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Ajouter</h3>
              <button type="button" onClick={() => setFab(false)} aria-label="Fermer">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {actions.map(({ label, icon: Icon, run }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setFab(false); run(); }}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card py-3 transition-colors hover:bg-accent active:scale-95"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <MealDialog open={mealOpen} onOpenChange={setMealOpen} initial={draft} aiMeta={aiMeta} onSaved={() => router.refresh()} />
      <PhotoAnalyzeDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        onAnalyzed={(d, meta) => { setDraft(d); setAiMeta(meta); setMealOpen(true); }}
      />
      <WeightQuickDialog open={weightOpen} onOpenChange={setWeightOpen} onSaved={() => router.refresh()} />
      <WorkoutQuickDialog open={workoutOpen} onOpenChange={setWorkoutOpen} onSaved={() => router.refresh()} />
    </>
  );
}

function WeightQuickDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [weight, setWeight] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function save() {
    const w = parseFloat(weight.replace(",", "."));
    if (!(w >= 40 && w <= 250)) return toast.error("Poids entre 40 et 250 kg.");
    setBusy(true);
    try {
      await apiSend("/api/weight", "POST", { weight: w, logged_at: todayISO() });
      toast.success("Pesée enregistrée ✅");
      setWeight("");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ma pesée du jour</DialogTitle></DialogHeader>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="flex-1 space-y-1">
            <Label htmlFor="qw">Poids (kg)</Label>
            <Input id="qw" type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80.5" autoFocus />
          </div>
          <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutQuickDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [type, setType] = React.useState<TrainingType>("maison");
  const [duration, setDuration] = React.useState("30");
  const [busy, setBusy] = React.useState(false);

  async function save(completed: boolean) {
    setBusy(true);
    try {
      await apiSend("/api/training/log", "POST", {
        type,
        duration_minutes: parseInt(duration, 10) || 0,
        completed,
        performed_at: todayISO(),
      });
      toast.success(completed ? "Séance validée 💪" : "Noté");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Logger une séance</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="qt">Type</Label>
            <Select id="qt" value={type} onChange={(e) => setType(e.target.value as TrainingType)}>
              {TRAINING_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{trainingLabel(t)}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="qd">Durée (min)</Label>
            <Input id="qd" type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => save(true)} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Séance faite ✅"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
