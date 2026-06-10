import { getTrainingPlan, getRecentWorkoutLogs } from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { TrainingClient } from "@/components/training/training-client";
import type { TrainingType } from "@/types";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const userId = await requireUserId();
  const [plan, logs] = await Promise.all([
    getTrainingPlan(userId),
    getRecentWorkoutLogs(userId),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Entraînement</h1>
      <TrainingClient
        initialPlan={plan.map((d) => ({
          id: d.id,
          dayOfWeek: d.dayOfWeek,
          type: d.type as TrainingType,
          focus: d.focus,
        }))}
        initialLogs={logs.map((l) => ({
          id: l.id,
          type: l.type as TrainingType,
          focus: l.focus,
          durationMinutes: l.durationMinutes,
          completed: l.completed,
          notes: l.notes,
          performedAt: l.performedAt,
        }))}
      />
    </div>
  );
}
