import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getProfile } from "@/db/queries";
import { withAuth, badRequest, ok } from "@/lib/api";

export const GET = withAuth(async (userId) => {
  return ok(await getProfile(userId));
});

const schema = z.object({
  current_weight: z.number().min(40).max(250).optional(),
  target_weight: z.number().min(40).max(250).optional(),
  target_calories: z.number().int().min(0).max(10000).optional(),
  target_protein: z.number().int().min(0).max(500).optional(),
  target_carbs: z.number().int().min(0).max(500).optional(),
  target_fats: z.number().int().min(0).max(500).optional(),
});

export const PUT = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Valeurs de profil invalides.");
  const d = parsed.data;

  const [row] = await db
    .update(profiles)
    .set({
      ...(d.current_weight !== undefined && { currentWeight: d.current_weight }),
      ...(d.target_weight !== undefined && { targetWeight: d.target_weight }),
      ...(d.target_calories !== undefined && { targetCalories: d.target_calories }),
      ...(d.target_protein !== undefined && { targetProtein: d.target_protein }),
      ...(d.target_carbs !== undefined && { targetCarbs: d.target_carbs }),
      ...(d.target_fats !== undefined && { targetFats: d.target_fats }),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning();
  return ok(row);
});
