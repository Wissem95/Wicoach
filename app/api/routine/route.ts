import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { routineItems } from "@/db/schema";
import { withAuth, badRequest, ok } from "@/lib/api";

const timeRe = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const GET = withAuth(async (userId) => {
  const rows = await db
    .select()
    .from(routineItems)
    .where(and(eq(routineItems.userId, userId), eq(routineItems.active, true)))
    .orderBy(asc(routineItems.sort), asc(routineItems.atTime));
  return ok(rows);
});

const createSchema = z.object({
  label: z.string().min(1).max(100),
  at_time: z.string().regex(timeRe).nullish(),
  sort: z.number().int().min(0).max(1000).default(0),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Élément invalide.");
  const [row] = await db
    .insert(routineItems)
    .values({
      userId,
      label: parsed.data.label.trim(),
      atTime: parsed.data.at_time ?? null,
      sort: parsed.data.sort,
    })
    .returning();
  return ok(row);
});

const patchSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(100).optional(),
  at_time: z.string().regex(timeRe).nullish(),
  active: z.boolean().optional(),
  sort: z.number().int().min(0).max(1000).optional(),
});

export const PATCH = withAuth(async (userId, req) => {
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return badRequest("Mise à jour invalide.");
  const d = parsed.data;
  const [row] = await db
    .update(routineItems)
    .set({
      ...(d.label !== undefined && { label: d.label.trim() }),
      ...("at_time" in body && { atTime: d.at_time ?? null }),
      ...(d.active !== undefined && { active: d.active }),
      ...(d.sort !== undefined && { sort: d.sort }),
    })
    .where(and(eq(routineItems.id, d.id), eq(routineItems.userId, userId)))
    .returning();
  return ok(row);
});

export const DELETE = withAuth(async (userId, req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("id requis.");
  await db.delete(routineItems).where(and(eq(routineItems.id, id), eq(routineItems.userId, userId)));
  return ok({ ok: true });
});
