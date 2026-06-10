import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pantryItems } from "@/db/schema";
import { getPantry } from "@/db/queries";
import { withAuth, badRequest, ok } from "@/lib/api";

export const GET = withAuth(async (userId) => {
  return ok(await getPantry(userId));
});

const addSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.string().max(60).nullish(),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Nom requis.");
  const [row] = await db
    .insert(pantryItems)
    .values({
      userId,
      name: parsed.data.name.trim(),
      quantity: parsed.data.quantity?.trim() || null,
    })
    .returning();
  return ok(row);
});

export const DELETE = withAuth(async (userId, req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("id requis.");
  await db
    .delete(pantryItems)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));
  return ok({ ok: true });
});
