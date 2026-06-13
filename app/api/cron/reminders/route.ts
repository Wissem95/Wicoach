import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  getProfile,
  getTodayTotals,
  getTodayMeals,
  getLatestWeight,
  getTrainingPlan,
} from "@/db/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailConfigured } from "@/lib/email";
import { todayISO } from "@/lib/utils";
import { TRAINING_TYPE_LABELS } from "@/types";
import type { TrainingType } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily reminder cron (see vercel.json). Sends an evening nudge by email.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // This DB read doubles as the Supabase keep-alive (runs even without email).
  const recipients = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.emailReminders, true));

  if (!emailConfigured()) {
    return NextResponse.json({ ok: true, keepAlive: true, reason: "RESEND_API_KEY non configuré" });
  }

  const admin = createAdminClient();

  const results: { id: string; sent: boolean; error?: string }[] = [];
  const tomorrowDow = (new Date().getDay() + 1) % 7;

  for (const { id } of recipients) {
    try {
      const { data } = await admin.auth.admin.getUserById(id);
      const email = data.user?.email;
      if (!email) {
        results.push({ id, sent: false, error: "no email" });
        continue;
      }

      const [profile, totals, meals, latest, plan] = await Promise.all([
        getProfile(id),
        getTodayTotals(id),
        getTodayMeals(id),
        getLatestWeight(id),
        getTrainingPlan(id),
      ]);

      const weighedToday = latest?.loggedAt === todayISO();
      const tomorrow = plan.find((d) => d.dayOfWeek === tomorrowDow);
      const tomorrowLabel = tomorrow
        ? `${TRAINING_TYPE_LABELS[tomorrow.type as TrainingType]}${tomorrow.focus ? ` (${tomorrow.focus})` : ""}`
        : "repos";

      const { error } = await sendEmail({
        to: email,
        subject: `Wicoach — ${totals.calories}/${profile.targetCalories} kcal aujourd'hui`,
        html: nudgeHtml({
          calories: totals.calories,
          targetCalories: profile.targetCalories,
          protein: totals.protein,
          targetProtein: profile.targetProtein,
          mealsCount: meals.length,
          weighedToday,
          tomorrowLabel,
        }),
      });
      results.push({ id, sent: !error, error });
    } catch (err) {
      results.push({ id, sent: false, error: err instanceof Error ? err.message : "error" });
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}

function nudgeHtml(d: {
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
  mealsCount: number;
  weighedToday: boolean;
  tomorrowLabel: string;
}): string {
  const todos: string[] = [];
  if (d.mealsCount === 0) todos.push("Aucun repas loggé aujourd'hui");
  if (!d.weighedToday) todos.push("Pas de pesée aujourd'hui");
  if (d.protein < d.targetProtein * 0.8)
    todos.push(`Protéines un peu basses (${d.protein}/${d.targetProtein}g)`);

  const todoHtml = todos.length
    ? `<ul style="margin:8px 0;padding-left:18px;color:#b45309">${todos.map((t) => `<li>${t}</li>`).join("")}</ul>`
    : `<p style="color:#16a34a;margin:8px 0">Tout est loggé, beau boulot 👏</p>`;

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto;padding:8px">
    <h2 style="margin:0 0 4px">Récap du jour</h2>
    <p style="color:#475569;margin:0 0 12px">
      <b>${d.calories}</b>/${d.targetCalories} kcal · <b>${d.protein}</b>/${d.targetProtein}g protéines · ${d.mealsCount} repas
    </p>
    ${todoHtml}
    <p style="margin:12px 0;color:#0f172a">Demain : <b>${d.tomorrowLabel}</b>. Et le sommeil ? Vise 7h+ 😴</p>
    <p style="margin-top:16px"><a href="https://wicoach.vercel.app/dashboard" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Ouvrir Wicoach</a></p>
  </div>`;
}
