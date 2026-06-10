import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { foodItems } from "@/db/schema";
import { getTodayMeals, getFavorites } from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { MealsClient, type MealWithItems } from "@/components/meals/meals-client";
import type { MealType } from "@/types";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  const userId = await requireUserId();
  const [todays, favorites] = await Promise.all([
    getTodayMeals(userId),
    getFavorites(userId),
  ]);

  const items =
    todays.length > 0
      ? await db.select().from(foodItems).where(inArray(foodItems.mealId, todays.map((m) => m.id)))
      : [];

  const meals: MealWithItems[] = todays.map((m) => ({
    id: m.id,
    name: m.name,
    mealType: m.mealType as MealType,
    totalCalories: m.totalCalories,
    totalProtein: m.totalProtein,
    totalCarbs: m.totalCarbs,
    totalFats: m.totalFats,
    photoUrl: m.photoUrl,
    aiAnalyzed: m.aiAnalyzed,
    items: items
      .filter((i) => i.mealId === m.id)
      .map((i) => ({
        id: i.id,
        foodName: i.foodName,
        portion: i.portion,
        unit: i.unit,
        calories: i.calories,
      })),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Repas</h1>
      <MealsClient initialMeals={meals} initialFavorites={favorites} />
    </div>
  );
}
