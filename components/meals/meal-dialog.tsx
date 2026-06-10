"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiSend } from "@/lib/client-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OffSearch } from "@/components/meals/off-search";
import { MEAL_TYPE_LABELS } from "@/types";
import type { FoodLine, MealType } from "@/types";

export interface MealDraft {
  name: string;
  mealType: MealType;
  items: FoodLine[];
  photoUrl?: string | null;
  aiAnalyzed?: boolean;
}

export function MealDialog({
  open,
  onOpenChange,
  initial,
  aiMeta,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<MealDraft>;
  aiMeta?: { confidence: number; notes: string } | null;
  onSaved?: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [mealType, setMealType] = React.useState<MealType>("dejeuner");
  const [items, setItems] = React.useState<FoodLine[]>([]);
  const [photoUrl, setPhotoUrl] = React.useState<string | null | undefined>(null);
  const [aiAnalyzed, setAiAnalyzed] = React.useState(false);

  // Seed state each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMealType(initial?.mealType ?? "dejeuner");
      setItems(initial?.items ?? []);
      setPhotoUrl(initial?.photoUrl ?? null);
      setAiAnalyzed(initial?.aiAnalyzed ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totals = items.reduce(
    (a, i) => ({
      calories: a.calories + (i.calories || 0),
      protein: a.protein + (i.protein || 0),
      carbs: a.carbs + (i.carbs || 0),
      fats: a.fats + (i.fats || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  function updateItem(idx: number, patch: Partial<FoodLine>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addBlankItem() {
    setItems((prev) => [
      ...prev,
      { food_name: "", portion: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fats: 0 },
    ]);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Donne un nom au repas.");
      if (items.length === 0) throw new Error("Ajoute au moins un aliment.");
      return apiSend("/api/meals", "POST", {
        name: name.trim(),
        meal_type: mealType,
        photo_url: photoUrl || undefined,
        ai_analyzed: aiAnalyzed,
        items,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["today-totals"] });
      toast.success("Repas enregistré");
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement"),
  });

  const saveFavorite = useMutation({
    mutationFn: async () => {
      if (!name.trim() || items.length === 0) throw new Error("Nom + aliments requis.");
      return apiSend("/api/favorites", "POST", {
        name: name.trim(),
        meal_type: mealType,
        items,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Ajouté aux favoris");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repas</DialogTitle>
          <DialogDescription>
            Recherche un produit, corrige les valeurs, puis enregistre.
          </DialogDescription>
        </DialogHeader>

        {aiAnalyzed && aiMeta && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Estimation IA (±20-30%) — confiance {aiMeta.confidence}%
            </div>
            {aiMeta.notes && <p className="mt-1 text-amber-800">{aiMeta.notes}</p>}
            <p className="mt-1 text-xs">Vérifie et corrige avant d&apos;enregistrer.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="meal-name">Nom</Label>
            <Input
              id="meal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Saumon riz"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meal-type">Type</Label>
            <Select
              id="meal-type"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
            >
              {Object.entries(MEAL_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <OffSearch onPick={(line) => setItems((prev) => [...prev, line])} />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Aliments ({items.length})</Label>
            <Button type="button" size="sm" variant="outline" onClick={addBlankItem}>
              <Plus className="h-4 w-4" /> Ligne manuelle
            </Button>
          </div>

          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun aliment pour l&apos;instant.</p>
          )}

          {items.map((it, idx) => (
            <div key={idx} className="rounded-md border p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={it.food_name}
                  onChange={(e) => updateItem(idx, { food_name: e.target.value })}
                  placeholder="Aliment"
                  className="h-9 flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 text-destructive"
                  onClick={() => removeItem(idx)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {(
                  [
                    ["portion", "g"],
                    ["calories", "kcal"],
                    ["protein", "P"],
                    ["carbs", "G"],
                    ["fats", "L"],
                  ] as const
                ).map(([field, lbl]) => (
                  <div key={field}>
                    <span className="text-[10px] text-muted-foreground">{lbl}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={it[field]}
                      min={0}
                      onChange={(e) => updateItem(idx, { [field]: Number(e.target.value) })}
                      className="h-9 px-2"
                      aria-label={`${it.food_name || "aliment"} ${lbl}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted p-3 text-sm">
          <Badge>{totals.calories} kcal</Badge>
          <Badge variant="secondary">P {totals.protein}g</Badge>
          <Badge variant="secondary">G {totals.carbs}g</Badge>
          <Badge variant="secondary">L {totals.fats}g</Badge>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveFavorite.mutate()}
            disabled={saveFavorite.isPending}
          >
            <Star className="h-4 w-4" /> Favori
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? "Enregistrement…" : "Enregistrer le repas"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
