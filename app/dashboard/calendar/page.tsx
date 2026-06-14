import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getTrainingPlan } from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { CalendarClient } from "@/components/calendar/calendar-client";
import type { TrainingType } from "@/types";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");

export default async function CalendarPage() {
  const userId = await requireUserId();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = `${year}-${pad(month + 1)}-01`;
  const to = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const [rows, plan] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gte(tasks.dueDate, from), lte(tasks.dueDate, to)))
      .orderBy(asc(tasks.dueDate), asc(tasks.createdAt)),
    getTrainingPlan(userId),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Calendrier</h1>
      <CalendarClient
        initialTasks={rows.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
        }))}
        initialYear={year}
        initialMonth={month}
        plan={plan.map((p) => ({
          dayOfWeek: p.dayOfWeek,
          type: p.type as TrainingType,
          focus: p.focus,
        }))}
      />
    </div>
  );
}
