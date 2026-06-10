import { getWeightLogs, getProfile } from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { WeightClient } from "@/components/weight/weight-client";

export const dynamic = "force-dynamic";

export default async function WeightPage() {
  const userId = await requireUserId();
  const [logs, profile] = await Promise.all([getWeightLogs(userId), getProfile(userId)]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Poids</h1>
      <WeightClient
        initial={logs.map((l) => ({ id: l.id, weight: l.weight, loggedAt: l.loggedAt }))}
        targetWeight={profile.targetWeight}
      />
    </div>
  );
}
