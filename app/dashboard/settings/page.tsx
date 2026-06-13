import { headers } from "next/headers";
import { getProfile } from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);

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
    </div>
  );
}
