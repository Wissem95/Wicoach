import { z } from "zod";
import { db } from "@/db";
import { stepsLogs, sleepLogs } from "@/db/schema";
import { withAuth, badRequest, ok } from "@/lib/api";
import { todayISO } from "@/lib/utils";

const schema = z.object({
  steps: z.number().int().min(0).max(200000).optional(),
  sleep_hours: z.number().min(0).max(24).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Manual entry of steps / sleep from the Settings page.
export const POST = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Valeurs invalides.");
  const { steps, sleep_hours } = parsed.data;
  const date = parsed.data.date && parsed.data.date <= todayISO() ? parsed.data.date : todayISO();

  if (steps !== undefined) {
    await db
      .insert(stepsLogs)
      .values({ userId, steps, loggedAt: date })
      .onConflictDoUpdate({ target: [stepsLogs.userId, stepsLogs.loggedAt], set: { steps } });
  }
  if (sleep_hours !== undefined) {
    await db
      .insert(sleepLogs)
      .values({ userId, hours: sleep_hours, loggedAt: date })
      .onConflictDoUpdate({ target: [sleepLogs.userId, sleepLogs.loggedAt], set: { hours: sleep_hours } });
  }
  return ok({ ok: true, date });
});
