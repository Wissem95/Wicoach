"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/lib/client-api";
import { cn, todayISO } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TRAINING_TYPE_LABELS } from "@/types";
import type { TrainingType } from "@/types";

type Status = "todo" | "doing" | "done";
interface Task {
  id: string;
  title: string;
  status: Status;
  dueDate: string;
}
interface PlanRow {
  dayOfWeek: number;
  type: TrainingType;
  focus: string | null;
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const NEXT: Record<Status, Status> = { todo: "doing", doing: "done", done: "todo" };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const typeColor: Record<TrainingType, string> = {
  salle: "bg-blue-500",
  piscine: "bg-cyan-500",
  maison: "bg-emerald-500",
  repos: "bg-slate-300",
};

export function CalendarClient({
  initialTasks,
  initialYear,
  initialMonth,
  plan,
}: {
  initialTasks: Task[];
  initialYear: number;
  initialMonth: number;
  plan: PlanRow[];
}) {
  const qc = useQueryClient();
  const [year, setYear] = React.useState(initialYear);
  const [month, setMonth] = React.useState(initialMonth);
  const [selected, setSelected] = React.useState(todayISO());
  const [newTitle, setNewTitle] = React.useState("");

  const from = iso(year, month, 1);
  const to = iso(year, month, new Date(year, month + 1, 0).getDate());
  const key = ["tasks", year, month] as const;

  const { data: tasks = [] } = useQuery({
    queryKey: key,
    queryFn: () => apiGet<Task[]>(`/api/tasks?from=${from}&to=${to}`),
    initialData:
      year === initialYear && month === initialMonth ? initialTasks : undefined,
  });

  const planByDow = new Map(plan.map((p) => [p.dayOfWeek, p]));
  const tasksByDay = React.useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      const arr = m.get(t.dueDate) ?? [];
      arr.push(t);
      m.set(t.dueDate, arr);
    }
    return m;
  }, [tasks]);

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: Status }) => apiSend("/api/tasks", "PATCH", v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (old) =>
        old?.map((t) => (t.id === v.id ? { ...t, status: v.status } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const add = useMutation({
    mutationFn: (title: string) =>
      apiSend<Task>("/api/tasks", "POST", { title, due_date: selected }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      setNewTitle("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiSend(`/api/tasks?id=${id}`, "DELETE"),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  // Build the month grid (weeks start Monday).
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const selectedTasks = tasksByDay.get(selected) ?? [];
  const selDow = new Date(selected + "T00:00:00").getDay();
  const selPlan = planByDow.get(selDow);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Mois précédent">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold capitalize">{monthLabel}</span>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Mois suivant">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const date = iso(year, month, day);
              const dayTasks = tasksByDay.get(date) ?? [];
              const doneCount = dayTasks.filter((t) => t.status === "done").length;
              const allDone = dayTasks.length > 0 && doneCount === dayTasks.length;
              const dow = new Date(date + "T00:00:00").getDay();
              const p = planByDow.get(dow);
              const isToday = date === todayISO();
              const isSel = date === selected;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                    isSel ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    isToday && !isSel && "ring-1 ring-primary",
                  )}
                >
                  <span className={cn(isToday && "font-bold")}>{day}</span>
                  <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                    {p && p.type !== "repos" && (
                      <span className={cn("h-1.5 w-1.5 rounded-full", typeColor[p.type])} />
                    )}
                    {dayTasks.length > 0 && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          allDone ? "bg-emerald-500" : isSel ? "bg-white" : "bg-amber-500",
                        )}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold capitalize">
              {new Date(selected + "T00:00:00").toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            {selPlan && (
              <Badge variant="secondary">
                {TRAINING_TYPE_LABELS[selPlan.type]}
                {selPlan.focus ? ` · ${selPlan.focus}` : ""}
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            {selectedTasks.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">Aucune tâche ce jour.</p>
            )}
            {selectedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ id: t.id, status: NEXT[t.status] })}
                  aria-label="Changer le statut"
                  className="shrink-0"
                >
                  {t.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : t.status === "doing" ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    t.status === "done" && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </span>
                {t.status === "doing" && <Badge variant="warning">en cours</Badge>}
                <button
                  type="button"
                  onClick={() => del.mutate(t.id)}
                  aria-label="Supprimer"
                  className="shrink-0 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newTitle.trim()) add.mutate(newTitle.trim());
            }}
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nouvelle tâche (ex: Cardio 35 min)"
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={add.isPending} aria-label="Ajouter">
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Touche le cercle : à faire → <span className="text-amber-500">en cours</span> →{" "}
            <span className="text-emerald-500">fait</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
