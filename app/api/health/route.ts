import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

// Keep-alive endpoint. Hit daily by a Vercel Cron (see vercel.json) so the
// Supabase free project never reaches 7 days of inactivity (which would pause
// it). Runs a trivial query that counts as DB activity.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // If CRON_SECRET is set, only allow Vercel Cron (it sends this header).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "db error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
