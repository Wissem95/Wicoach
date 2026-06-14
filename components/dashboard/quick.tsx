"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiSend } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { trainingLabel } from "@/types";
import type { TrainingType, FoodLine } from "@/types";

export function QuickWorkoutDone({ type, focus }: { type: TrainingType; focus: string | null }) {
  const router = useRouter();
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function mark() {
    setBusy(true);
    try {
      await apiSend("/api/training/log", "POST", {
        type,
        focus,
        duration_minutes: 30,
        completed: true,
      });
      setDone(true);
      toast.success("Séance validée 💪");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Button size="sm" variant="secondary" disabled>
        <Check className="h-4 w-4" /> Fait
      </Button>
    );
  }
  return (
    <Button size="sm" onClick={mark} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      {trainingLabel(type) === "Repos" ? "Marche faite" : "C'est fait"}
    </Button>
  );
}

export interface QuickFavorite {
  id: string;
  name: string;
  mealType: string;
  items: FoodLine[];
}

export function QuickMeals({ favorites }: { favorites: QuickFavorite[] }) {
  const router = useRouter();
  const [logged, setLogged] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState<string | null>(null);

  if (favorites.length === 0) return null;

  async function log(f: QuickFavorite) {
    setBusy(f.id);
    try {
      await apiSend("/api/meals", "POST", {
        name: f.name,
        meal_type: f.mealType,
        items: f.items,
      });
      setLogged((s) => new Set(s).add(f.id));
      toast.success(`${f.name} ajouté ✅`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {favorites.map((f) => {
        const isLogged = logged.has(f.id);
        return (
          <button
            key={f.id}
            type="button"
            disabled={isLogged || busy === f.id}
            onClick={() => log(f)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-60"
          >
            {isLogged ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : busy === f.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 text-primary" />
            )}
            {f.name}
          </button>
        );
      })}
    </div>
  );
}
