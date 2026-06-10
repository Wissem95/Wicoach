"use client";

import * as React from "react";
import { Search, Plus, Barcode, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/client-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FoodLine, OffProduct } from "@/types";

function scale(p: OffProduct, grams: number) {
  const f = Math.max(0, grams) / 100;
  return {
    calories: Math.round(p.caloriesPer100g * f),
    protein: Math.round(p.proteinPer100g * f),
    carbs: Math.round(p.carbsPer100g * f),
    fats: Math.round(p.fatsPer100g * f),
  };
}

export function OffSearch({ onPick }: { onPick: (line: FoodLine) => void }) {
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<OffProduct[]>([]);
  const [searched, setSearched] = React.useState(false);
  // per-result portion in grams
  const [portions, setPortions] = React.useState<Record<string, number>>({});

  const isBarcode = /^\d{6,}$/.test(query.trim());

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const param = isBarcode ? `barcode=${encodeURIComponent(q)}` : `q=${encodeURIComponent(q)}`;
      const data = await apiGet<{ products: OffProduct[]; notFound: boolean }>(
        `/api/food/search?${param}`,
      );
      setResults(data.products);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recherche impossible");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function add(p: OffProduct) {
    const grams = portions[p.code ?? p.name] || 100;
    const macros = scale(p, grams);
    onPick({
      food_name: p.brand ? `${p.name} (${p.brand})` : p.name,
      portion: grams,
      unit: "g",
      ...macros,
    });
    toast.success(`${p.name} ajouté`);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          {isBarcode ? (
            <Barcode className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
            placeholder="Nom ou code-barres (Open Food Facts)"
            inputMode="search"
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={runSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Chercher"}
        </Button>
      </div>

      {searched && !loading && results.length === 0 && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Produit non trouvé. Ajoute-le manuellement ci-dessous.
        </p>
      )}

      {results.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
          {results.map((p) => {
            const key = p.code ?? p.name;
            const grams = portions[key] || 100;
            const m = scale(p, grams);
            return (
              <div key={key} className="rounded-md border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.brand ?? "—"} · {p.caloriesPer100g} kcal/100g
                    </p>
                  </div>
                  {p.nutritionGrade && (
                    <Badge variant="secondary" className="shrink-0">
                      Nutri-{p.nutritionGrade}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={grams}
                    min={0}
                    onChange={(e) =>
                      setPortions((s) => ({ ...s, [key]: Number(e.target.value) }))
                    }
                    className="h-9 w-20"
                    aria-label="Portion en grammes"
                  />
                  <span className="text-xs text-muted-foreground">
                    g → {m.calories} kcal · P{m.protein} G{m.carbs} L{m.fats}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    onClick={() => add(p)}
                  >
                    <Plus className="h-4 w-4" /> Ajouter
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
