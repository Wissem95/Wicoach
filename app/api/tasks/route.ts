import { z } from "zod";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { withAuth, badRequest, ok } from "@/lib/api";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export const GET = withAuth(async (userId, req) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const conds = [eq(tasks.userId, userId)];
  if (from && dateRe.test(from)) conds.push(gte(tasks.dueDate, from));
  if (to && dateRe.test(to)) conds.push(lte(tasks.dueDate, to));
  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conds))
    .orderBy(asc(tasks.dueDate), asc(tasks.createdAt));
  return ok(rows);
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  due_date: z.string().regex(dateRe),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Tâche invalide (titre + date requis).");
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      title: parsed.data.title.trim(),
      dueDate: parsed.data.due_date,
      status: parsed.data.status,
    })
    .returning();
  return ok(row);
});

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  title: z.string().min(1).max(200).optional(),
  due_date: z.string().regex(dateRe).optional(),
});

export const PATCH = withAuth(async (userId, req) => {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Mise à jour invalide.");
  const d = parsed.data;
  const [row] = await db
    .update(tasks)
    .set({
      ...(d.status && { status: d.status }),
      ...(d.title && { title: d.title.trim() }),
      ...(d.due_date && { dueDate: d.due_date }),
    })
    .where(and(eq(tasks.id, d.id), eq(tasks.userId, userId)))
    .returning();
  return ok(row);
});

export const DELETE = withAuth(async (userId, req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("id requis.");
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return ok({ ok: true });
});
