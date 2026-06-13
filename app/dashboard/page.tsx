import Link from "next/link";
import { Plus, Camera, MessageCircle, Dumbbell, ArrowRight, Moon } from "lucide-react";
import {
  getProfile,
  getWeightLogs,
  getTodayTotals,
  getTodayMeals,
  getTodayPlannedWorkout,
  getWeekTrend,
  getRecentWorkoutLogs,
} from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { clamp, todayISO } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MEAL_TYPE_LABELS, TRAINING_TYPE_LABELS } from "@/types";
import type { MealType, TrainingType } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [profile, logs, totals, meals, todayWorkout, weekTrend, recentWorkouts] = await Promise.all([
    getProfile(userId),
    getWeightLogs(userId, 90),
    getTodayTotals(userId),
    getTodayMeals(userId),
    getTodayPlannedWorkout(userId),
    getWeekTrend(userId),
    getRecentWorkoutLogs(userId, 30),
  ]);

  const current = logs[0]?.weight ?? profile.currentWeight;
  const start = logs[logs.length - 1]?.weight ?? profile.currentWeight;
  const toGo = +(current - profile.targetWeight).toFixed(1);
  // Progress from starting weight towards the goal.
  const goalSpan = start - profile.targetWeight;
  const goalPct = goalSpan > 0 ? clamp(Math.round(((start - current) / goalSpan) * 100), 0, 100) : 0;

  // Weekly workout recap (last 7 days, completed sessions only).
  const weekAgo = todayISO(new Date(Date.now() - 6 * 86400000));
  const weekWorkouts = recentWorkouts.filter((w) => w.performedAt >= weekAgo && w.completed);
  const weekMinutes = weekWorkouts.reduce((a, w) => a + w.durationMinutes, 0);

  return (
    <div className="space-y-4">
      {/* Hero — weight goal */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-soft">
        <CardContent className="flex items-center gap-5 p-5">
          <ProgressRing
            value={start - current}
            max={goalSpan > 0 ? goalSpan : 1}
            size={104}
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
              {toGo > 0 ? `Encore ${toGo} kg → ${profile.targetWeight} kg` : `Objectif ${profile.targetWeight} kg atteint 🎉`}
            </p>
            <p className="mt-0.5 text-xs text-white/70">{weekTrend}</p>
          </div>
        </CardContent>
      </Card>

      {/* Macro rings */}
      <Card>
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
        </CardContent>
      </Card>

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
            <p className="py-3 text-center text-sm text-muted-foreground">
              Aucune séance loggée cette semaine. On s&apos;y met ? 💪
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {weekWorkouts.map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
                >
                  <Dumbbell className="h-3 w-3 text-primary" />
                  <span className="font-medium">{TRAINING_TYPE_LABELS[w.type as TrainingType]}</span>
                  {w.focus && <span className="text-muted-foreground">· {w.focus}</span>}
                  <span className="text-muted-foreground">· {w.durationMinutes}min</span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <QuickAction href="/dashboard/meals" icon={<Plus className="h-5 w-5" />} label="Repas" />
        <QuickAction href="/dashboard/meals" icon={<Camera className="h-5 w-5" />} label="Photo" />
        <QuickAction href="/dashboard/coach" icon={<MessageCircle className="h-5 w-5" />} label="Coach" />
      </div>

      {/* Today's workout */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Séance prévue</p>
              <p className="font-semibold">
                {todayWorkout ? TRAINING_TYPE_LABELS[todayWorkout.type as TrainingType] : "Repos"}
                {todayWorkout?.focus && (
                  <span className="font-normal text-muted-foreground"> · {todayWorkout.focus}</span>
                )}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/training">
              Logger <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Today's meals */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Repas ({meals.length})</h2>
            <Link href="/dashboard/meals" className="text-xs font-medium text-primary hover:underline">
              Voir tout
            </Link>
          </div>
          {meals.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Rien de loggé. Ajoute ton premier repas 👆
            </p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Sleep nudge — sommeil = levier de premier plan */}
      <Card className="border-amber-200 bg-amber-50/70">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900">
          <Moon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Mal dormi ? Dis-le au coach — un sommeil &lt; 7h freine la perte de poids, il
            l&apos;intègre dans ses conseils.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RingStat({
  label,
  value,
  target,
  color,
  warnOver,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  warnOver?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <ProgressRing
        value={value}
        max={target}
        size={70}
        stroke={7}
        color={color}
        warnOver={warnOver}
        label={String(value)}
      />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card py-3.5 text-card-foreground shadow-soft transition-all hover:bg-accent active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
