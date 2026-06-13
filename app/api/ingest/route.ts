import { z } from "zod";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, weightLogs, stepsLogs, sleepLogs } from "@/db/schema";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Ingestion endpoint for the Apple Health Shortcut. Auth = per-user
// `ingest_token` (no cookie). Body/query may carry any subset of fields.
const schema = z.object({
  token: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weight: z.coerce.number().min(40).max(250).optional(),
  steps: z.coerce.number().int().min(0).max(200000).optional(),
  sleep_hours: z.coerce.number().min(0).max(24).optional(),
});

async function handle(input: Record<string, unknown>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides (token requis)." }, { status: 400 });
  }
  const { token, weight, steps, sleep_hours } = parsed.data;
  const date = parsed.data.date && parsed.data.date <= todayISO() ? parsed.data.date : todayISO();

  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.ingestToken, token))
    .limit(1);
  if (!profile) {
    return NextResponse.json({ error: "Token inconnu." }, { status: 401 });
  }
  const userId = profile.id;
  const wrote: string[] = [];

  if (weight !== undefined) {
    await db
      .insert(weightLogs)
      .values({ userId, weight, loggedAt: date })
      .onConflictDoUpdate({ target: [weightLogs.userId, weightLogs.loggedAt], set: { weight } });
    await db.update(profiles).set({ currentWeight: weight, updatedAt: new Date() }).where(eq(profiles.id, userId));
    wrote.push("weight");
  }
  if (steps !== undefined) {
    await db
      .insert(stepsLogs)
      .values({ userId, steps, loggedAt: date })
      .onConflictDoUpdate({ target: [stepsLogs.userId, stepsLogs.loggedAt], set: { steps } });
    wrote.push("steps");
  }
  if (sleep_hours !== undefined) {
    await db
      .insert(sleepLogs)
      .values({ userId, hours: sleep_hours, loggedAt: date })
      .onConflictDoUpdate({ target: [sleepLogs.userId, sleepLogs.loggedAt], set: { hours: sleep_hours } });
    wrote.push("sleep");
  }

  return NextResponse.json({ ok: true, date, wrote });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handle(body as Record<string, unknown>);
}

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return handle(params);
}
