import {
  getProfile,
  getTodayMeals,
  getTodayTotals,
  getWeekTrend,
  getPantry,
  getTrainingPlan,
  getTodayPlannedWorkout,
  getLatestSleep,
  getTodaySteps,
} from "@/db/queries";
import { buildCoachSystemPrompt, type CoachContext } from "@/lib/llm/prompts";
import { DAY_LABELS, MEAL_TYPE_LABELS, TRAINING_TYPE_LABELS } from "@/types";
import type { MealType, TrainingType } from "@/types";

/** Gathers fresh user data and builds the coach system prompt. */
export async function buildCoachContextPrompt(userId: string): Promise<string> {
  const [profile, totals, meals, weekTrend, pantry, plan, todayPlan, sleep, steps] =
    await Promise.all([
      getProfile(userId),
      getTodayTotals(userId),
      getTodayMeals(userId),
      getWeekTrend(userId),
      getPantry(userId),
      getTrainingPlan(userId),
      getTodayPlannedWorkout(userId),
      getLatestSleep(userId),
      getTodaySteps(userId),
    ]);

  const todayMealsSummary =
    meals.length === 0
      ? "aucun repas loggé"
      : meals
          .map(
            (m) =>
              `${MEAL_TYPE_LABELS[m.mealType as MealType]}: ${m.name} (${m.totalCalories}kcal)`,
          )
          .join(", ");

  const pantryItems =
    pantry.length === 0
      ? "vide (rien de loggé)"
      : pantry.map((p) => (p.quantity ? `${p.name} (${p.quantity})` : p.name)).join(", ");

  const weeklyTrainingPlan =
    plan.length === 0
      ? "non défini"
      : plan
          .map((d) => {
            const label = TRAINING_TYPE_LABELS[d.type as TrainingType];
            const focus = d.focus ? ` - ${d.focus}` : "";
            return `${DAY_LABELS[d.dayOfWeek]}: ${label}${focus}`;
          })
          .join(" | ");

  const todayWorkout = todayPlan
    ? `${TRAINING_TYPE_LABELS[todayPlan.type as TrainingType]}${todayPlan.focus ? ` (${todayPlan.focus})` : ""}`
    : "repos / non défini";

  const sleepSummary = sleep
    ? `${sleep.hours}h la nuit du ${sleep.loggedAt}${sleep.hours < 7 ? " (insuffisant, < 7h)" : ""}`
    : "non renseigné";
  const stepsSummary = steps ? `${steps.steps} pas aujourd'hui` : "pas renseignés aujourd'hui";

  const ctx: CoachContext = {
    currentWeight: profile.currentWeight,
    targetWeight: profile.targetWeight,
    targetCalories: profile.targetCalories,
    targetProtein: profile.targetProtein,
    todayCalories: totals.calories,
    todayProtein: totals.protein,
    todayMealsSummary,
    weekTrend,
    pantryItems,
    weeklyTrainingPlan,
    todayWorkout,
    coachNotes: profile.coachNotes,
    sleepSummary,
    stepsSummary,
  };

  return buildCoachSystemPrompt(ctx);
}
