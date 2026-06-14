import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { routineChecks } from "@/db/schema";
import { withAuth, badRequest, ok } from "@/lib/api";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

// Returns checks in a date range: [{ itemId, day }]
export const GET = withAuth(async (userId, req) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const conds = [eq(routineChecks.userId, userId)];
  if (from && dateRe.test(from)) conds.push(gte(routineChecks.day, from));
  if (to && dateRe.test(to)) conds.push(lte(routineChecks.day, to));
  const rows = await db
    .select({ itemId: routineChecks.itemId, day: routineChecks.day })
    .from(routineChecks)
    .where(and(...conds));
  return ok(rows);
});

const toggleSchema = z.object({
  item_id: z.string().uuid(),
  day: z.string().regex(dateRe),
});

// Toggles a check for (item, day). Returns { done }.
export const POST = withAuth(async (userId, req) => {
  const parsed = toggleSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Paramètres invalides.");
  const { item_id, day } = parsed.data;

  const existing = await db
    .select({ id: routineChecks.id })
    .from(routineChecks)
    .where(
      and(
        eq(routineChecks.userId, userId),
        eq(routineChecks.itemId, item_id),
        eq(routineChecks.day, day),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db.delete(routineChecks).where(eq(routineChecks.id, existing[0].id));
    return ok({ done: false });
  }
  await db.insert(routineChecks).values({ userId, itemId: item_id, day }).onConflictDoNothing();
  return ok({ done: true });
});
