import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./index";
import {
  profiles,
  weightLogs,
  meals,
  foodItems,
  favoriteMeals,
  chatMessages,
  pantryItems,
  trainingPlan,
  workoutLogs,
} from "./schema";
import { todayISO } from "@/lib/utils";
import type { MacroTotals } from "@/types";

// ---- Profile -------------------------------------------------------------
export async function getProfile(userId: string) {
  const [p] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (p) return p;
  // Defensive: create a default profile if the signup trigger didn't run.
  const [created] = await db
    .insert(profiles)
    .values({ id: userId })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1))[0];
}

// ---- Weight --------------------------------------------------------------
export async function getWeightLogs(userId: string, limit = 90) {
  return db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt))
    .limit(limit);
}

export async function getLatestWeight(userId: string) {
  const [row] = await getWeightLogs(userId, 1);
  return row ?? null;
}

/** Short human summary of the last 7 days of weigh-ins. */
export async function getWeekTrend(userId: string): Promise<string> {
  const rows = await db
    .select()
    .from(weightLogs)
    .where(and(eq(weightLogs.userId, userId), gte(weightLogs.loggedAt, daysAgoISO(7))))
    .orderBy(weightLogs.loggedAt);
  if (rows.length < 2) return "pas assez de données (logguez votre poids quelques jours)";
  const first = rows[0].weight;
  const last = rows[rows.length - 1].weight;
  const diff = +(last - first).toFixed(1);
  const dir = diff < 0 ? "baisse" : diff > 0 ? "hausse" : "stable";
  return `${dir} de ${Math.abs(diff)}kg sur 7 jours (${first}kg → ${last}kg)`;
}

// ---- Meals ---------------------------------------------------------------
export async function getTodayMeals(userId: string) {
  const rows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, userId), gte(meals.mealTime, startOfTodayUTC())))
    .orderBy(meals.mealTime);
  return rows;
}

export async function getMealWithItems(userId: string, mealId: string) {
  const [meal] = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .limit(1);
  if (!meal) return null;
  const items = await db.select().from(foodItems).where(eq(foodItems.mealId, mealId));
  return { meal, items };
}

export async function getTodayTotals(userId: string): Promise<MacroTotals> {
  const rows = await getTodayMeals(userId);
  return rows.reduce<MacroTotals>(
    (acc, m) => ({
      calories: acc.calories + m.totalCalories,
      protein: acc.protein + m.totalProtein,
      carbs: acc.carbs + m.totalCarbs,
      fats: acc.fats + m.totalFats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

export async function getFavorites(userId: string) {
  return db
    .select()
    .from(favoriteMeals)
    .where(eq(favoriteMeals.userId, userId))
    .orderBy(desc(favoriteMeals.createdAt));
}

// ---- Pantry --------------------------------------------------------------
export async function getPantry(userId: string) {
  return db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, userId))
    .orderBy(desc(pantryItems.addedAt));
}

// ---- Training ------------------------------------------------------------
export async function getTrainingPlan(userId: string) {
  return db
    .select()
    .from(trainingPlan)
    .where(eq(trainingPlan.userId, userId))
    .orderBy(trainingPlan.dayOfWeek);
}

export async function getTodayPlannedWorkout(userId: string) {
  const dow = new Date().getDay(); // 0..6, matches our day_of_week
  const [row] = await db
    .select()
    .from(trainingPlan)
    .where(and(eq(trainingPlan.userId, userId), eq(trainingPlan.dayOfWeek, dow)))
    .limit(1);
  return row ?? null;
}

export async function getRecentWorkoutLogs(userId: string, limit = 14) {
  return db
    .select()
    .from(workoutLogs)
    .where(eq(workoutLogs.userId, userId))
    .orderBy(desc(workoutLogs.performedAt))
    .limit(limit);
}

// ---- Chat ----------------------------------------------------------------
export async function getChatHistory(userId: string, limit = 50) {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function countTodayUserMessages(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, "user"),
        gte(chatMessages.createdAt, startOfTodayUTC()),
      ),
    );
  return row?.count ?? 0;
}

// ---- date helpers --------------------------------------------------------
function startOfTodayUTC(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayISO(d);
}
