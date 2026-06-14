import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { tasks, routineItems, routineChecks } from "@/db/schema";
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

  const [taskRows, routine, checks, plan] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gte(tasks.dueDate, from), lte(tasks.dueDate, to)))
      .orderBy(asc(tasks.dueDate), asc(tasks.createdAt)),
    db
      .select()
      .from(routineItems)
      .where(and(eq(routineItems.userId, userId), eq(routineItems.active, true)))
      .orderBy(asc(routineItems.sort), asc(routineItems.atTime)),
    db
      .select({ itemId: routineChecks.itemId, day: routineChecks.day })
      .from(routineChecks)
      .where(and(eq(routineChecks.userId, userId), gte(routineChecks.day, from), lte(routineChecks.day, to))),
    getTrainingPlan(userId),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Calendrier</h1>
      <CalendarClient
        initialTasks={taskRows.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
        }))}
        routine={routine.map((r) => ({ id: r.id, label: r.label, atTime: r.atTime }))}
        initialChecks={checks}
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
