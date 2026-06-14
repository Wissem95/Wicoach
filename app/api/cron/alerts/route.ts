import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { customAlerts, pushSubscriptions } from "@/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, pushConfigured } from "@/lib/push";
import { sendEmail, emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MIN = 15; // pinger runs ~every 10 min; this covers the slot.

function parisParts(d: Date) {
  const hm = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d); // "HH:MM"
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d); // YYYY-MM-DD
  const [h, m] = hm.split(":").map(Number);
  const dow = new Date(ymd + "T12:00:00Z").getUTCDay(); // 0=Sun, tz-independent
  return { minutes: h * 60 + m, ymd, dow };
}

// Called frequently (e.g. every 10 min) by an external scheduler (cron-job.org)
// or Vercel Cron. Sends any alert that is due "now" and not yet sent today.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided = req.headers.get("authorization") === `Bearer ${secret}`
      || url.searchParams.get("token") === secret;
    if (!provided) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { minutes: nowMin, ymd, dow } = parisParts(now);

  // The query also keeps Supabase awake.
  const alerts = await db.select().from(customAlerts).where(eq(customAlerts.enabled, true));

  const pushOn = pushConfigured();
  const emailOn = emailConfigured();
  const admin = createAdminClient();
  let sent = 0;

  for (const a of alerts) {
    // Day filter
    if (a.days) {
      const set = a.days.split(",").map(Number);
      if (!set.includes(dow)) continue;
    }
    // Time window
    const [ah, am] = a.atTime.split(":").map(Number);
    const alertMin = ah * 60 + am;
    if (nowMin < alertMin || nowMin >= alertMin + WINDOW_MIN) continue;
    // Already sent today?
    if (a.lastSentAt) {
      const sentYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
        new Date(a.lastSentAt),
      );
      if (sentYmd === ymd) continue;
    }

    try {
      const wantsPush = a.channel === "push" || a.channel === "both";
      const wantsEmail = a.channel === "email" || a.channel === "both";

      if (wantsPush && pushOn) {
        const subs = await db
          .select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, a.userId));
        for (const s of subs) {
          await sendPush(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
            { title: "⏰ " + a.label, body: `Il est ${a.atTime}.`, url: "/dashboard" },
          );
        }
      }
      if (wantsEmail && emailOn) {
        const { data } = await admin.auth.admin.getUserById(a.userId);
        if (data.user?.email) {
          await sendEmail({
            to: data.user.email,
            subject: `⏰ ${a.label}`,
            html: `<div style="font-family:-apple-system,sans-serif"><h2>${a.label}</h2><p>Il est ${a.atTime}.</p></div>`,
          });
        }
      }

      await db.update(customAlerts).set({ lastSentAt: now }).where(eq(customAlerts.id, a.id));
      sent++;
    } catch (err) {
      console.error("[cron/alerts]", a.id, err);
    }
  }

  return NextResponse.json({ ok: true, checked: alerts.length, sent, at: `${ymd} ${a_time(nowMin)}` });
}

function a_time(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
