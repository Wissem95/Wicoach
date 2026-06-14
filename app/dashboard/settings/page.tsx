import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customAlerts } from "@/db/schema";
import { getProfile } from "@/db/queries";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/settings-client";
import { AlertsManager } from "@/components/settings/alerts-manager";
import { AccountSettings } from "@/components/settings/account-settings";
import { ShareCard } from "@/components/settings/share-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;
  const [profile, alerts] = await Promise.all([
    getProfile(userId),
    db
      .select()
      .from(customAlerts)
      .where(eq(customAlerts.userId, userId))
      .orderBy(asc(customAlerts.atTime)),
  ]);

  // Build the public origin for the Apple Health ingest URL.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `${proto}://${host}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Réglages</h1>
      <SettingsClient
        profile={{
          currentWeight: profile.currentWeight,
          targetWeight: profile.targetWeight,
          targetCalories: profile.targetCalories,
          targetProtein: profile.targetProtein,
          targetCarbs: profile.targetCarbs,
          targetFats: profile.targetFats,
          coachNotes: profile.coachNotes,
          emailReminders: profile.emailReminders,
          ingestToken: profile.ingestToken,
        }}
        ingestUrl={`${origin}/api/ingest`}
      />
      <AlertsManager
        initial={alerts.map((a) => ({
          id: a.id,
          label: a.label,
          atTime: a.atTime,
          days: a.days,
          channel: a.channel as "push" | "email" | "both",
          enabled: a.enabled,
        }))}
      />
      <ShareCard />
      <AccountSettings email={user?.email ?? ""} />
    </div>
  );
}
