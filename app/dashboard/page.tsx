import Link from "next/link";
import { Plus, Camera, MessageCircle, TrendingDown, Dumbbell } from "lucide-react";
import {
  getProfile,
  getLatestWeight,
  getTodayTotals,
  getTodayMeals,
  getTodayPlannedWorkout,
  getWeekTrend,
} from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { pct } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MEAL_TYPE_LABELS, TRAINING_TYPE_LABELS } from "@/types";
import type { MealType, TrainingType } from "@/types";

export const dynamic = "force-dynamic";

function MacroBar({
  label,
  value,
  target,
  unit,
  over,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  over?: boolean; // true when going over the target is bad (carbs/calories)
}) {
  const percent = pct(value, target);
  const exceeded = value > target;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value} / {target} {unit}
        </span>
      </div>
      <Progress
        value={percent}
        indicatorClassName={over && exceeded ? "bg-destructive" : undefined}
      />
    </div>
  );
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [profile, latest, totals, meals, todayWorkout, weekTrend] = await Promise.all([
    getProfile(userId),
    getLatestWeight(userId),
    getTodayTotals(userId),
    getTodayMeals(userId),
    getTodayPlannedWorkout(userId),
    getWeekTrend(userId),
  ]);

  const currentWeight = latest?.weight ?? profile.currentWeight;
  const toGo = +(currentWeight - profile.targetWeight).toFixed(1);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Aujourd&apos;hui</h1>

      {/* Weight */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-primary" /> Poids
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{currentWeight}</span>
            <span className="text-muted-foreground">kg</span>
            <Badge variant="secondary" className="ml-auto">
              objectif {profile.targetWeight} kg
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {toGo > 0 ? `Encore ${toGo} kg à perdre · ` : "Objectif atteint · "}
            {weekTrend}
          </p>
        </CardContent>
      </Card>

      {/* Macros vs targets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nutrition du jour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MacroBar label="Calories" value={totals.calories} target={profile.targetCalories} unit="kcal" over />
          <MacroBar label="Protéines" value={totals.protein} target={profile.targetProtein} unit="g" />
          <MacroBar label="Glucides" value={totals.carbs} target={profile.targetCarbs} unit="g" over />
          <MacroBar label="Lipides" value={totals.fats} target={profile.targetFats} unit="g" />
        </CardContent>
      </Card>

      {/* Today's workout */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4 text-primary" /> Séance prévue
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <Badge>
              {todayWorkout ? TRAINING_TYPE_LABELS[todayWorkout.type as TrainingType] : "Repos"}
            </Badge>
            {todayWorkout?.focus && (
              <span className="ml-2 text-sm text-muted-foreground">{todayWorkout.focus}</span>
            )}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/training">Logger</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Today's meals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Repas ({meals.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun repas loggé.</p>
          ) : (
            meals.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{MEAL_TYPE_LABELS[m.mealType as MealType]}</Badge>
                  {m.name}
                </span>
                <span className="text-muted-foreground">{m.totalCalories} kcal</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button asChild variant="secondary" className="h-auto flex-col gap-1 py-3">
          <Link href="/dashboard/meals">
            <Plus className="h-5 w-5" />
            <span className="text-xs">Repas</span>
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto flex-col gap-1 py-3">
          <Link href="/dashboard/meals">
            <Camera className="h-5 w-5" />
            <span className="text-xs">Photo</span>
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto flex-col gap-1 py-3">
          <Link href="/dashboard/coach">
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs">Coach</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
