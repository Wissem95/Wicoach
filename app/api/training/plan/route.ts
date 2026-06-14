import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trainingPlan } from "@/db/schema";
import { getTrainingPlan } from "@/db/queries";
import { withAuth, badRequest, ok } from "@/lib/api";

export const GET = withAuth(async (userId) => {
  return ok(await getTrainingPlan(userId));
});

const schema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  type: z
    .string()
    .min(1)
    .max(40)
    .transform((s) => s.trim().toLowerCase().replace(/\s+/g, "_")),
  focus: z.string().max(80).nullish(),
});

// Upsert a single day of the weekly plan.
export const PUT = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Jour invalide.");
  const { day_of_week, type, focus } = parsed.data;
  const cleanFocus = type === "repos" ? null : focus?.trim() || null;

  const [row] = await db
    .insert(trainingPlan)
    .values({ userId, dayOfWeek: day_of_week, type, focus: cleanFocus })
    .onConflictDoUpdate({
      target: [trainingPlan.userId, trainingPlan.dayOfWeek],
      set: { type, focus: cleanFocus },
    })
    .returning();
  return ok(row);
});
