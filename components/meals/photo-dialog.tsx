"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FoodLine, MealType, PhotoAnalysis } from "@/types";
import type { MealDraft } from "@/components/meals/meal-dialog";

function portionGrams(portion: string): number {
  const m = portion.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Math.round(parseFloat(m[1].replace(",", "."))) : 100;
}

export function PhotoAnalyzeDialog({
  open,
  onOpenChange,
  onAnalyzed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAnalyzed: (draft: Partial<MealDraft>, meta: { confidence: number; notes: string }) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setPreview(null);
      setLoading(false);
    }
  }, [open]);

  function pick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/analyze-photo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyse impossible");

      const analysis = data.analysis as PhotoAnalysis;
      const items: FoodLine[] = analysis.items.map((i) => ({
        food_name: i.food,
        portion: portionGrams(i.portion),
        unit: "g",
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fats: i.fats,
      }));

      onAnalyzed(
        {
          name: analysis.meal_name,
          mealType: "dejeuner" as MealType,
          items,
          photoUrl: data.photo_url ?? null,
          aiAnalyzed: true,
        },
        { confidence: analysis.confidence, notes: analysis.notes },
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analyse impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Analyser une photo</DialogTitle>
          <DialogDescription>
            L&apos;IA estime les calories et macros. C&apos;est une estimation (±20-30%), pas une
            mesure — tu pourras corriger.
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-accent">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Aperçu du plat" className="max-h-56 rounded-md object-contain" />
          ) : (
            <>
              <Camera className="h-8 w-8" />
              <span>Prendre / choisir une photo</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </label>

        <Button onClick={analyze} disabled={!file || loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…
            </>
          ) : (
            "Analyser"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
