import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { meals, foodItems } from "@/db/schema";
import { getTodayMeals } from "@/db/queries";
import { withAuth, badRequest, ok } from "@/lib/api";

export const GET = withAuth(async (userId) => {
  const todays = await getTodayMeals(userId);
  if (todays.length === 0) return ok([]);
  const items = await db
    .select()
    .from(foodItems)
    .where(inArray(foodItems.mealId, todays.map((m) => m.id)));
  const byMeal = new Map<string, typeof items>();
  for (const it of items) {
    const arr = byMeal.get(it.mealId) ?? [];
    arr.push(it);
    byMeal.set(it.mealId, arr);
  }
  return ok(todays.map((m) => ({ ...m, items: byMeal.get(m.id) ?? [] })));
});

const itemSchema = z.object({
  food_name: z.string().min(1).max(120),
  portion: z.number().nonnegative().default(100),
  unit: z.string().max(16).default("g"),
  calories: z.number().int().nonnegative().max(10000).default(0),
  protein: z.number().int().nonnegative().default(0),
  carbs: z.number().int().nonnegative().default(0),
  fats: z.number().int().nonnegative().default(0),
});

const mealSchema = z.object({
  name: z.string().min(1).max(120),
  meal_type: z.enum(["petit_dej", "dejeuner", "diner", "snack"]),
  meal_time: z.string().datetime().optional(),
  photo_url: z.string().url().nullish(),
  ai_analyzed: z.boolean().default(false),
  items: z.array(itemSchema).min(1, "Au moins un aliment."),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = mealSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Données invalides.");
  }
  const d = parsed.data;

  const totals = d.items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fats: acc.fats + i.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  const [meal] = await db
    .insert(meals)
    .values({
      userId,
      name: d.name.trim(),
      mealType: d.meal_type,
      mealTime: d.meal_time ? new Date(d.meal_time) : new Date(),
      totalCalories: Math.min(10000, totals.calories),
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFats: totals.fats,
      photoUrl: d.photo_url ?? null,
      aiAnalyzed: d.ai_analyzed,
    })
    .returning();

  await db.insert(foodItems).values(
    d.items.map((i) => ({
      mealId: meal.id,
      foodName: i.food_name.trim(),
      portion: i.portion,
      unit: i.unit,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fats: i.fats,
    })),
  );

  return ok({ ...meal, items: d.items });
});

export const DELETE = withAuth(async (userId, req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("id requis.");
  // food_items cascade via FK.
  await db.delete(meals).where(and(eq(meals.id, id), eq(meals.userId, userId)));
  return ok({ ok: true });
});
