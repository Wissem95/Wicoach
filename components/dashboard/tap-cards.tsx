"use client";

import * as React from "react";
import { Plus, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { fireQuickAction } from "@/components/quick-actions";

export function WeightHeroCard({
  current,
  targetWeight,
  goalPct,
  toGo,
}: {
  current: number;
  targetWeight: number;
  goalPct: number;
  toGo: number;
}) {
  return (
    <button type="button" onClick={() => fireQuickAction("weight")} className="block w-full text-left">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-soft transition-transform active:scale-[0.99]">
        <CardContent className="flex items-center gap-5 p-5">
          <ProgressRing
            value={goalPct}
            max={100}
            size={96}
            stroke={10}
            color="white"
            trackColor="rgba(255,255,255,0.25)"
            label={`${goalPct}%`}
            sublabel="objectif"
          />
          <div className="min-w-0">
            <p className="text-sm/none text-white/80">Poids actuel</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight">
              {current}
              <span className="ml-1 text-lg font-semibold text-white/80">kg</span>
            </p>
            <p className="mt-1.5 text-sm text-white/90">
              {toGo > 0 ? `Encore ${toGo} kg → ${targetWeight} kg` : "Objectif atteint 🎉"}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/80">
              <Plus className="h-3 w-3" /> Toucher pour peser
            </p>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

interface Macro { calories: number; protein: number; carbs: number; fats: number }

export function NutritionCard({ totals, targets }: { totals: Macro; targets: Macro }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => fireQuickAction("meal")}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fireQuickAction("meal")}
      className="cursor-pointer transition-transform active:scale-[0.99]"
    >
      <CardContent className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Nutrition du jour</h2>
          <Badge variant="secondary">{totals.calories} / {targets.calories} kcal</Badge>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <RingStat label="kcal" value={totals.calories} target={targets.calories} color="hsl(var(--primary))" warnOver />
          <RingStat label="Prot." value={totals.protein} target={targets.protein} color="hsl(var(--protein))" />
          <RingStat label="Gluc." value={totals.carbs} target={targets.carbs} color="hsl(var(--carbs))" warnOver />
          <RingStat label="Lip." value={totals.fats} target={targets.fats} color="hsl(var(--fats))" />
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-medium text-primary">
          <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Ajouter un repas</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fireQuickAction("photo"); }}
            className="inline-flex items-center gap-1"
          >
            <Camera className="h-4 w-4" /> Photo
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function RingStat({ label, value, target, color, warnOver }: { label: string; value: number; target: number; color: string; warnOver?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <ProgressRing value={value} max={target} size={66} stroke={7} color={color} warnOver={warnOver} label={String(value)} />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
