import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workoutLogs } from "@/db/schema";
import { getRecentWorkoutLogs } from "@/db/queries";
import { withAuth, badRequest, ok } from "@/lib/api";
import { todayISO } from "@/lib/utils";

export const GET = withAuth(async (userId) => {
  return ok(await getRecentWorkoutLogs(userId));
});

const schema = z.object({
  type: z
    .string()
    .min(1)
    .max(40)
    .transform((s) => s.trim().toLowerCase().replace(/\s+/g, "_")),
  focus: z.string().max(80).nullish(),
  duration_minutes: z.number().int().min(0).max(1000).default(0),
  completed: z.boolean().default(true),
  notes: z.string().max(500).nullish(),
  performed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Séance invalide.");
  const d = parsed.data;
  const performedAt = d.performed_at ?? todayISO();
  if (performedAt > todayISO()) return badRequest("Date dans le futur.");

  const [row] = await db
    .insert(workoutLogs)
    .values({
      userId,
      type: d.type,
      focus: d.focus?.trim() || null,
      durationMinutes: d.duration_minutes,
      completed: d.completed,
      notes: d.notes?.trim() || null,
      performedAt,
    })
    .returning();
  return ok(row);
});

export const DELETE = withAuth(async (userId, req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("id requis.");
  await db
    .delete(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));
  return ok({ ok: true });
});
