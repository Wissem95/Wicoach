"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Camera, Trash2, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/lib/client-api";
import { MealDialog, type MealDraft } from "@/components/meals/meal-dialog";
import { PhotoAnalyzeDialog } from "@/components/meals/photo-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MEAL_TYPE_LABELS } from "@/types";
import type { FavoriteMeal } from "@/db/schema";
import type { FoodLine, MealType } from "@/types";

export interface MealWithItems {
  id: string;
  name: string;
  mealType: MealType;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  photoUrl: string | null;
  aiAnalyzed: boolean;
  items: { id?: string; foodName: string; portion: number; unit: string; calories: number }[];
}

export function MealsClient({
  initialMeals,
  initialFavorites,
}: {
  initialMeals: MealWithItems[];
  initialFavorites: FavoriteMeal[];
}) {
  const qc = useQueryClient();
  const [mealOpen, setMealOpen] = React.useState(false);
  const [photoOpen, setPhotoOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Partial<MealDraft> | undefined>();
  const [aiMeta, setAiMeta] = React.useState<{ confidence: number; notes: string } | null>(null);

  const { data: meals = [] } = useQuery({
    queryKey: ["meals"],
    queryFn: () => apiGet<MealWithItems[]>("/api/meals"),
    initialData: initialMeals,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => apiGet<FavoriteMeal[]>("/api/favorites"),
    initialData: initialFavorites,
  });

  const del = useMutation({
    mutationFn: (id: string) => apiSend(`/api/meals?id=${id}`, "DELETE"),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["meals"] });
      const prev = qc.getQueryData<MealWithItems[]>(["meals"]);
      qc.setQueryData<MealWithItems[]>(["meals"], (old) => old?.filter((m) => m.id !== id) ?? []);
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["meals"], ctx.prev);
      toast.error("Suppression impossible");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["today-totals"] });
    },
  });

  function openManual() {
    setDraft({ name: "", mealType: "dejeuner", items: [] });
    setAiMeta(null);
    setMealOpen(true);
  }

  function openFromFavorite(fav: FavoriteMeal) {
    setDraft({
      name: fav.name,
      mealType: fav.mealType as MealType,
      items: fav.items as FoodLine[],
    });
    setAiMeta(null);
    setMealOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={openManual}>
          <Plus className="h-4 w-4" /> Ajouter un repas
        </Button>
        <Button variant="secondary" onClick={() => setPhotoOpen(true)}>
          <Camera className="h-4 w-4" /> Photo
        </Button>
      </div>

      {favorites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-amber-500" /> Favoris
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {favorites.map((f) => (
              <Button key={f.id} variant="outline" size="sm" onClick={() => openFromFavorite(f)}>
                {f.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Repas d&apos;aujourd&apos;hui</h2>
        {meals.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun repas loggé aujourd&apos;hui.
            </CardContent>
          </Card>
        )}
        {meals.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{MEAL_TYPE_LABELS[m.mealType]}</Badge>
                    <span className="truncate font-medium">{m.name}</span>
                    {m.aiAnalyzed && (
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Estimé par IA" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {m.items.map((i) => i.foodName).join(", ") || "—"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    <Badge>{m.totalCalories} kcal</Badge>
                    <Badge variant="secondary">P {m.totalProtein}</Badge>
                    <Badge variant="secondary">G {m.totalCarbs}</Badge>
                    <Badge variant="secondary">L {m.totalFats}</Badge>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-destructive"
                  onClick={() => del.mutate(m.id)}
                  aria-label="Supprimer le repas"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <MealDialog
        open={mealOpen}
        onOpenChange={setMealOpen}
        initial={draft}
        aiMeta={aiMeta}
      />

      <PhotoAnalyzeDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        onAnalyzed={(d, meta) => {
          setDraft(d);
          setAiMeta(meta);
          setMealOpen(true);
        }}
      />
    </div>
  );
}
