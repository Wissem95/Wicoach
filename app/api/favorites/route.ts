import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favoriteMeals } from "@/db/schema";
import { getFavorites } from "@/db/queries";
import { withAuth, badRequest, ok } from "@/lib/api";

export const GET = withAuth(async (userId) => {
  return ok(await getFavorites(userId));
});

const itemSchema = z.object({
  food_name: z.string().min(1),
  portion: z.number().nonnegative().default(100),
  unit: z.string().default("g"),
  calories: z.number().int().nonnegative().default(0),
  protein: z.number().int().nonnegative().default(0),
  carbs: z.number().int().nonnegative().default(0),
  fats: z.number().int().nonnegative().default(0),
});

const schema = z.object({
  name: z.string().min(1).max(120),
  meal_type: z.enum(["petit_dej", "dejeuner", "diner", "snack"]).default("dejeuner"),
  items: z.array(itemSchema).min(1),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Favori invalide (nom + aliments requis).");
  const [row] = await db
    .insert(favoriteMeals)
    .values({
      userId,
      name: parsed.data.name.trim(),
      mealType: parsed.data.meal_type,
      items: parsed.data.items,
    })
    .returning();
  return ok(row);
});

export const DELETE = withAuth(async (userId, req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("id requis.");
  await db
    .delete(favoriteMeals)
    .where(and(eq(favoriteMeals.id, id), eq(favoriteMeals.userId, userId)));
  return ok({ ok: true });
});
