import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { weightLogs, profiles } from "@/db/schema";
import { getWeightLogs } from "@/db/queries";
import { withAuth, badRequest, ok } from "@/lib/api";
import { todayISO } from "@/lib/utils";

export const GET = withAuth(async (userId) => {
  return ok(await getWeightLogs(userId));
});

const bodySchema = z.object({
  weight: z.number().min(40).max(250),
  logged_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Poids invalide (40–250 kg).");

  const loggedAt = parsed.data.logged_at ?? todayISO();
  if (loggedAt > todayISO()) return badRequest("Date dans le futur.");

  // One weigh-in per day: upsert on (user_id, logged_at).
  const [row] = await db
    .insert(weightLogs)
    .values({ userId, weight: parsed.data.weight, loggedAt })
    .onConflictDoUpdate({
      target: [weightLogs.userId, weightLogs.loggedAt],
      set: { weight: parsed.data.weight },
    })
    .returning();

  // Keep the profile's current weight in sync with the latest entry.
  if (loggedAt === todayISO()) {
    await db
      .update(profiles)
      .set({ currentWeight: parsed.data.weight, updatedAt: new Date() })
      .where(eq(profiles.id, userId));
  }

  return ok(row);
});

const deleteSchema = z.object({ id: z.string().uuid() });

export const DELETE = withAuth(async (userId, req) => {
  const { searchParams } = new URL(req.url);
  const parsed = deleteSchema.safeParse({ id: searchParams.get("id") });
  if (!parsed.success) return badRequest("id requis.");
  await db
    .delete(weightLogs)
    .where(and(eq(weightLogs.id, parsed.data.id), eq(weightLogs.userId, userId)));
  return ok({ ok: true });
});
