import Link from "next/link";
import { Dumbbell, ArrowRight, Moon, Plus, Camera, MessageCircle, Sparkles } from "lucide-react";
import {
  getProfile,
  getWeightLogs,
  getTodayTotals,
  getTodayMeals,
  getTodayPlannedWorkout,
  getWeekTrend,
  getRecentWorkoutLogs,
  getFavorites,
} from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { clamp, todayISO } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Badge } from "@/components/ui/badge";
import { QuickWorkoutDone, QuickMeals, type QuickFavorite } from "@/components/dashboard/quick";
import { MEAL_TYPE_LABELS, trainingLabel } from "@/types";
import type { MealType, TrainingType, FoodLine } from "@/types";

export const dynamic = "force-dynamic";

const COACH_CHIPS = [
  "Qu'est-ce que je mange ce soir avec ce que j'ai ?",
  "Propose-moi une séance maison de 20 min",
  "J'ai mal dormi, comment gérer ma journée ?",
];

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [profile, logs, totals, meals, todayWorkout, weekTrend, recentWorkouts, favorites] =
    await Promise.all([
      getProfile(userId),
      getWeightLogs(userId, 90),
      getTodayTotals(userId),
      getTodayMeals(userId),
      getTodayPlannedWorkout(userId),
      getWeekTrend(userId),
      getRecentWorkoutLogs(userId, 30),
      getFavorites(userId),
    ]);

  const current = logs[0]?.weight ?? profile.currentWeight;
  const start = logs[logs.length - 1]?.weight ?? profile.currentWeight;
  const toGo = +(current - profile.targetWeight).toFixed(1);
  const goalSpan = start - profile.targetWeight;
  const goalPct = goalSpan > 0 ? clamp(Math.round(((start - current) / goalSpan) * 100), 0, 100) : 0;

  const weekAgo = todayISO(new Date(Date.now() - 6 * 86400000));
  const weekWorkouts = recentWorkouts.filter((w) => w.performedAt >= weekAgo && w.completed);
  const weekMinutes = weekWorkouts.reduce((a, w) => a + w.durationMinutes, 0);

  const quickFavs: QuickFavorite[] = favorites.slice(0, 6).map((f) => ({
    id: f.id,
    name: f.name,
    mealType: f.mealType as MealType,
    items: (f.items as FoodLine[]) ?? [],
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Bonjour 👋</h1>

      {/* Weight hero — tap to log a weigh-in */}
      <Link href="/dashboard/weight" className="block">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-soft transition-transform active:scale-[0.99]">
          <CardContent className="flex items-center gap-5 p-5">
            <ProgressRing
              value={start - current}
              max={goalSpan > 0 ? goalSpan : 1}
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
                {toGo > 0 ? `Encore ${toGo} kg → ${profile.targetWeight} kg` : `Objectif atteint 🎉`}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/80">
                <Plus className="h-3 w-3" /> Toucher pour peser
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Nutrition — tap to add a meal */}
      <Link href="/dashboard/meals" className="block">
        <Card className="transition-transform active:scale-[0.99]">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Nutrition du jour</h2>
              <Badge variant="secondary">{totals.calories} / {profile.targetCalories} kcal</Badge>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <RingStat label="kcal" value={totals.calories} target={profile.targetCalories} color="hsl(var(--primary))" warnOver />
              <RingStat label="Prot." value={totals.protein} target={profile.targetProtein} color="hsl(var(--protein))" />
              <RingStat label="Gluc." value={totals.carbs} target={profile.targetCarbs} color="hsl(var(--carbs))" warnOver />
              <RingStat label="Lip." value={totals.fats} target={profile.targetFats} color="hsl(var(--fats))" />
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs font-medium text-primary">
              <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Ajouter un repas</span>
              <span className="inline-flex items-center gap-1"><Camera className="h-4 w-4" /> Photo</span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* One-tap meals from the program */}
      {quickFavs.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-amber-500" /> Logge ton repas en 1 tap
            </h2>
            <QuickMeals favorites={quickFavs} />
          </CardContent>
        </Card>
      )}

      {/* Today's workout */}
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Séance prévue</p>
              <p className="truncate font-semibold">
                {todayWorkout ? trainingLabel(todayWorkout.type) : "Repos"}
                {todayWorkout?.focus && (
                  <span className="font-normal text-muted-foreground"> · {todayWorkout.focus}</span>
                )}
              </p>
            </div>
          </div>
          <QuickWorkoutDone
            type={(todayWorkout?.type ?? "repos") as TrainingType}
            focus={todayWorkout?.focus ?? null}
          />
        </CardContent>
      </Card>

      {/* Ask the coach */}
      <Card>
        <CardContent className="p-4">
          <Link href="/dashboard/coach" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="flex-1 font-semibold">Demande à ton coach</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="mt-3 flex flex-col gap-1.5">
            {COACH_CHIPS.map((q) => (
              <Link
                key={q}
                href={`/dashboard/coach?q=${encodeURIComponent(q)}`}
                className="rounded-xl bg-muted px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                {q}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's meals list */}
      {meals.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Repas d&apos;aujourd&apos;hui</h2>
            <div className="space-y-2">
              {meals.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{MEAL_TYPE_LABELS[m.mealType as MealType]}</Badge>
                    <span className="font-medium">{m.name}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-muted-foreground">{m.totalCalories} kcal</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly recap */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Cette semaine</h2>
            <Badge variant="secondary">
              {weekWorkouts.length} séance{weekWorkouts.length > 1 ? "s" : ""} · {weekMinutes} min
            </Badge>
          </div>
          {weekWorkouts.length === 0 ? (
            <p className="py-1 text-center text-sm text-muted-foreground">Aucune séance encore. On s&apos;y met ? 💪</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {weekWorkouts.map((w) => (
                <span key={w.id} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                  <Dumbbell className="h-3 w-3 text-primary" />
                  <span className="font-medium">{trainingLabel(w.type)}</span>
                  <span className="text-muted-foreground">· {w.durationMinutes}min</span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sleep nudge */}
      <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900 dark:text-amber-200">
          <Moon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Mal dormi ? Dis-le au coach — un sommeil &lt; 7h freine la perte de poids.</p>
        </CardContent>
      </Card>
    </div>
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
