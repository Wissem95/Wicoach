import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions, profiles } from "@/db/schema";
import { withAuth, badRequest, ok } from "@/lib/api";

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = subSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Abonnement push invalide.");
  const { endpoint, keys } = parsed.data;

  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: keys.p256dh, auth: keys.auth },
    });

  await db.update(profiles).set({ pushEnabled: true }).where(eq(profiles.id, userId));
  return ok({ ok: true });
});

export const DELETE = withAuth(async (userId, req) => {
  const endpoint = new URL(req.url).searchParams.get("endpoint");
  if (endpoint) {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }
  // Disable the flag if no subscriptions remain.
  const remaining = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (remaining.length === 0) {
    await db.update(profiles).set({ pushEnabled: false }).where(eq(profiles.id, userId));
  }
  return ok({ ok: true });
});
