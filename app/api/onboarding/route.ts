import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, trainingPlan, routineItems } from "@/db/schema";
import { withAuth, badRequest, ok } from "@/lib/api";

const trainingSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  type: z
    .string()
    .min(1)
    .max(40)
    .transform((s) => s.trim().toLowerCase().replace(/\s+/g, "_")),
  focus: z.string().max(80).nullish(),
});

const schema = z.object({
  current_weight: z.number().min(40).max(250),
  target_weight: z.number().min(40).max(250),
  target_calories: z.number().int().min(800).max(6000),
  target_protein: z.number().int().min(0).max(500),
  target_carbs: z.number().int().min(0).max(500),
  target_fats: z.number().int().min(0).max(500),
  notes: z.string().max(4000).optional(),
  training: z.array(trainingSchema).max(7),
  seed_routine: z.boolean().default(true),
});

const DEFAULT_ROUTINE = [
  { label: "Réveil", at_time: "07:00" },
  { label: "Petit-déjeuner", at_time: "07:30" },
  { label: "Déjeuner", at_time: "13:00" },
  { label: "Collation", at_time: "16:00" },
  { label: "Séance / activité du jour", at_time: "17:30" },
  { label: "Dîner", at_time: "19:30" },
  { label: "Au lit (objectif 8h)", at_time: "23:00" },
];

export const POST = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Données invalides.");
  const d = parsed.data;

  // 1) Profile + targets + onboarding done
  await db
    .update(profiles)
    .set({
      currentWeight: d.current_weight,
      targetWeight: d.target_weight,
      targetCalories: d.target_calories,
      targetProtein: d.target_protein,
      targetCarbs: d.target_carbs,
      targetFats: d.target_fats,
      ...(d.notes ? { coachNotes: d.notes.trim() } : {}),
      onboarded: true,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId));

  // 2) Weekly training plan (upsert each provided day)
  for (const t of d.training) {
    await db
      .insert(trainingPlan)
      .values({
        userId,
        dayOfWeek: t.day_of_week,
        type: t.type,
        focus: t.type === "repos" ? null : t.focus?.trim() || null,
      })
      .onConflictDoUpdate({
        target: [trainingPlan.userId, trainingPlan.dayOfWeek],
        set: { type: t.type, focus: t.type === "repos" ? null : t.focus?.trim() || null },
      });
  }

  // 3) Default routine (only if requested and none exists yet)
  if (d.seed_routine) {
    const existing = await db
      .select({ id: routineItems.id })
      .from(routineItems)
      .where(eq(routineItems.userId, userId));
    if (existing.length === 0) {
      await db.insert(routineItems).values(
        DEFAULT_ROUTINE.map((r, i) => ({ userId, label: r.label, atTime: r.at_time, sort: i })),
      );
    }
  }

  return ok({ ok: true });
});
