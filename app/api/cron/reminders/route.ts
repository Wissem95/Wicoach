import { eq, or, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, pushSubscriptions } from "@/db/schema";
import {
  getProfile,
  getTodayTotals,
  getTodayMeals,
  getLatestWeight,
  getTrainingPlan,
} from "@/db/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailConfigured } from "@/lib/email";
import { sendPush, pushConfigured } from "@/lib/push";
import { todayISO } from "@/lib/utils";
import { TRAINING_TYPE_LABELS } from "@/types";
import type { TrainingType } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily reminder cron (see vercel.json). Sends an evening nudge by email and/or
// iOS push. The DB read also keeps the Supabase free project awake.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const recipients = await db
    .select({ id: profiles.id, email: profiles.emailReminders, push: profiles.pushEnabled })
    .from(profiles)
    .where(or(eq(profiles.emailReminders, true), eq(profiles.pushEnabled, true)));

  const emailOn = emailConfigured();
  const pushOn = pushConfigured();
  if (!emailOn && !pushOn) {
    return NextResponse.json({ ok: true, keepAlive: true, reason: "aucun canal configuré" });
  }

  const admin = createAdminClient();
  const tomorrowDow = (new Date().getDay() + 1) % 7;
  const results: { id: string; email: boolean; push: number }[] = [];

  for (const r of recipients) {
    try {
      const [profile, totals, meals, latest, plan] = await Promise.all([
        getProfile(r.id),
        getTodayTotals(r.id),
        getTodayMeals(r.id),
        getLatestWeight(r.id),
        getTrainingPlan(r.id),
      ]);

      const weighedToday = latest?.loggedAt === todayISO();
      const tomorrow = plan.find((d) => d.dayOfWeek === tomorrowDow);
      const tomorrowLabel = tomorrow
        ? `${TRAINING_TYPE_LABELS[tomorrow.type as TrainingType]}${tomorrow.focus ? ` (${tomorrow.focus})` : ""}`
        : "repos";

      const nudge = {
        calories: totals.calories,
        targetCalories: profile.targetCalories,
        protein: totals.protein,
        targetProtein: profile.targetProtein,
        mealsCount: meals.length,
        weighedToday,
        tomorrowLabel,
      };

      let emailed = false;
      let pushed = 0;

      if (r.email && emailOn) {
        const { data } = await admin.auth.admin.getUserById(r.id);
        const to = data.user?.email;
        if (to) {
          const { error } = await sendEmail({
            to,
            subject: `Wicoach — ${nudge.calories}/${nudge.targetCalories} kcal aujourd'hui`,
            html: nudgeHtml(nudge),
          });
          emailed = !error;
        }
      }

      if (r.push && pushOn) {
        const subs = await db
          .select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, r.id));
        for (const s of subs) {
          const res = await sendPush(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
            { title: "Wicoach — récap du jour", body: pushBody(nudge), url: "/dashboard" },
          );
          if (res.ok) pushed++;
          if (res.gone) {
            await db
              .delete(pushSubscriptions)
              .where(and(eq(pushSubscriptions.userId, r.id), eq(pushSubscriptions.endpoint, s.endpoint)));
          }
        }
      }

      results.push({ id: r.id, email: emailed, push: pushed });
    } catch (err) {
      console.error("[cron/reminders]", r.id, err);
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}

interface Nudge {
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
  mealsCount: number;
  weighedToday: boolean;
  tomorrowLabel: string;
}

function todos(n: Nudge): string[] {
  const list: string[] = [];
  if (n.mealsCount === 0) list.push("Aucun repas loggé aujourd'hui");
  if (!n.weighedToday) list.push("Pas de pesée aujourd'hui");
  if (n.protein < n.targetProtein * 0.8) list.push(`Protéines basses (${n.protein}/${n.targetProtein}g)`);
  return list;
}

function pushBody(n: Nudge): string {
  const t = todos(n);
  const head = `${n.calories}/${n.targetCalories} kcal · ${n.mealsCount} repas`;
  return t.length ? `${head} — à faire: ${t.join(", ")}` : `${head} — tout est loggé 👏`;
}

function nudgeHtml(n: Nudge): string {
  const t = todos(n);
  const todoHtml = t.length
    ? `<ul style="margin:8px 0;padding-left:18px;color:#b45309">${t.map((x) => `<li>${x}</li>`).join("")}</ul>`
    : `<p style="color:#16a34a;margin:8px 0">Tout est loggé, beau boulot 👏</p>`;
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto;padding:8px">
    <h2 style="margin:0 0 4px">Récap du jour</h2>
    <p style="color:#475569;margin:0 0 12px">
      <b>${n.calories}</b>/${n.targetCalories} kcal · <b>${n.protein}</b>/${n.targetProtein}g protéines · ${n.mealsCount} repas
    </p>
    ${todoHtml}
    <p style="margin:12px 0;color:#0f172a">Demain : <b>${n.tomorrowLabel}</b>. Et le sommeil ? Vise 7h+ 😴</p>
    <p style="margin-top:16px"><a href="https://wicoach.vercel.app/dashboard" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Ouvrir Wicoach</a></p>
  </div>`;
}
