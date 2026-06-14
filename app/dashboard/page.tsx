import Link from "next/link";
import { Dumbbell, ArrowRight, Moon, MessageCircle, Sparkles } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { QuickWorkoutDone, QuickMeals, type QuickFavorite } from "@/components/dashboard/quick";
import { WeightHeroCard, NutritionCard } from "@/components/dashboard/tap-cards";
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

  const remaining = Math.max(0, profile.targetCalories - totals.calories);
  const sessionLabel = todayWorkout && todayWorkout.type !== "repos"
    ? `${trainingLabel(todayWorkout.type)}${todayWorkout.focus ? ` (${todayWorkout.focus})` : ""}`
    : "repos / récup";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Bonjour 👋</h1>

      {/* Morning brief */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <h2 className="mb-1.5 text-sm font-semibold">Voici ta journée</h2>
          <ul className="space-y-1 text-sm">
            <li>🍽️ Cible {profile.targetCalories} kcal — il te reste <b>{remaining} kcal</b> ({totals.protein}/{profile.targetProtein}g protéines).</li>
            <li>🏋️ Séance du jour : <b>{sessionLabel}</b>.</li>
            <li>😴 Vise 7h+ de sommeil — c&apos;est ton meilleur levier.</li>
          </ul>
          <Link
            href={`/dashboard/coach?q=${encodeURIComponent("Fais-moi le brief de ma journée et un plan concret pour aujourd'hui")}`}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <MessageCircle className="h-4 w-4" /> Brief complet par le coach
          </Link>
        </CardContent>
      </Card>

      <WeightHeroCard current={current} targetWeight={profile.targetWeight} goalPct={goalPct} toGo={toGo} />

      <NutritionCard
        totals={totals}
        targets={{ calories: profile.targetCalories, protein: profile.targetProtein, carbs: profile.targetCarbs, fats: profile.targetFats }}
      />

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
