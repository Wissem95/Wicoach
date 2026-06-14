import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customAlerts } from "@/db/schema";
import { withAuth, badRequest, ok } from "@/lib/api";

const timeRe = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const GET = withAuth(async (userId) => {
  const rows = await db
    .select()
    .from(customAlerts)
    .where(eq(customAlerts.userId, userId))
    .orderBy(asc(customAlerts.atTime));
  return ok(rows);
});

const daysSchema = z.array(z.number().int().min(0).max(6)).optional();

const createSchema = z.object({
  label: z.string().min(1).max(80),
  at_time: z.string().regex(timeRe),
  days: daysSchema, // empty/undefined => every day
  channel: z.enum(["push", "email", "both"]).default("push"),
  enabled: z.boolean().default(true),
});

function daysToText(days?: number[]): string | null {
  if (!days || days.length === 0 || days.length === 7) return null;
  return [...new Set(days)].sort((a, b) => a - b).join(",");
}

export const POST = withAuth(async (userId, req) => {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Alerte invalide (label + heure HH:MM requis).");
  const d = parsed.data;
  const [row] = await db
    .insert(customAlerts)
    .values({
      userId,
      label: d.label.trim(),
      atTime: d.at_time,
      days: daysToText(d.days),
      channel: d.channel,
      enabled: d.enabled,
    })
    .returning();
  return ok(row);
});

const patchSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80).optional(),
  at_time: z.string().regex(timeRe).optional(),
  days: daysSchema,
  channel: z.enum(["push", "email", "both"]).optional(),
  enabled: z.boolean().optional(),
});

export const PATCH = withAuth(async (userId, req) => {
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return badRequest("Mise à jour invalide.");
  const d = parsed.data;
  const [row] = await db
    .update(customAlerts)
    .set({
      ...(d.label !== undefined && { label: d.label.trim() }),
      ...(d.at_time !== undefined && { atTime: d.at_time }),
      ...("days" in body && { days: daysToText(d.days) }),
      ...(d.channel !== undefined && { channel: d.channel }),
      ...(d.enabled !== undefined && { enabled: d.enabled }),
    })
    .where(and(eq(customAlerts.id, d.id), eq(customAlerts.userId, userId)))
    .returning();
  return ok(row);
});

export const DELETE = withAuth(async (userId, req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("id requis.");
  await db.delete(customAlerts).where(and(eq(customAlerts.id, id), eq(customAlerts.userId, userId)));
  return ok({ ok: true });
});
