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
  Sparkles,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/lib/client-api";
import { cn, todayISO } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trainingLabel, trainingColor } from "@/types";
import type { TrainingType } from "@/types";

type Status = "todo" | "doing" | "done";
interface Task { id: string; title: string; status: Status; dueDate: string }
interface RoutineItem { id: string; label: string; atTime: string | null }
interface Check { itemId: string; day: string }
interface PlanRow { dayOfWeek: number; type: TrainingType; focus: string | null }

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const NEXT: Record<Status, Status> = { todo: "doing", doing: "done", done: "todo" };
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const DEFAULT_ROUTINE = [
  { label: "Réveil", at_time: "07:00" },
  { label: "Compléments matin (multivit, D3, oméga-3)", at_time: "07:30" },
  { label: "Petit-déjeuner", at_time: "07:30" },
  { label: "Déjeuner", at_time: "13:00" },
  { label: "Collation", at_time: "16:00" },
  { label: "Séance / cardio du jour", at_time: "17:30" },
  { label: "Dîner", at_time: "19:30" },
  { label: "Stop manger pour ce soir", at_time: "20:00" },
  { label: "Magnésium + collagène", at_time: "22:30" },
  { label: "Au lit (objectif 8h)", at_time: "23:00" },
];

export function CalendarClient({
  initialTasks,
  routine: routineProp,
  initialChecks,
  initialYear,
  initialMonth,
  plan,
}: {
  initialTasks: Task[];
  routine: RoutineItem[];
  initialChecks: Check[];
  initialYear: number;
  initialMonth: number;
  plan: PlanRow[];
}) {
  const qc = useQueryClient();
  const [year, setYear] = React.useState(initialYear);
  const [month, setMonth] = React.useState(initialMonth);
  const [selected, setSelected] = React.useState(todayISO());
  const [newTitle, setNewTitle] = React.useState("");
  const [editRoutine, setEditRoutine] = React.useState(false);
  const [newItem, setNewItem] = React.useState("");
  const [newItemTime, setNewItemTime] = React.useState("");

  const isInitialMonth = year === initialYear && month === initialMonth;
  const from = iso(year, month, 1);
  const to = iso(year, month, new Date(year, month + 1, 0).getDate());
  const tKey = ["tasks", year, month] as const;
  const cKey = ["routine-checks", year, month] as const;

  const { data: routine = [] } = useQuery({
    queryKey: ["routine"],
    queryFn: () => apiGet<RoutineItem[]>("/api/routine"),
    initialData: routineProp,
  });
  const { data: monthTasks = [] } = useQuery({
    queryKey: tKey,
    queryFn: () => apiGet<Task[]>(`/api/tasks?from=${from}&to=${to}`),
    initialData: isInitialMonth ? initialTasks : undefined,
  });
  const { data: checks = [] } = useQuery({
    queryKey: cKey,
    queryFn: () => apiGet<Check[]>(`/api/routine/check?from=${from}&to=${to}`),
    initialData: isInitialMonth ? initialChecks : undefined,
  });

  const planByDow = new Map(plan.map((p) => [p.dayOfWeek, p]));
  const tasksByDay = React.useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of monthTasks) (m.get(t.dueDate) ?? m.set(t.dueDate, []).get(t.dueDate)!).push(t);
    return m;
  }, [monthTasks]);
  const checksByDay = React.useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of checks) {
      if (!m.has(c.day)) m.set(c.day, new Set());
      m.get(c.day)!.add(c.itemId);
    }
    return m;
  }, [checks]);

  function dayStats(date: string) {
    const dayTasks = tasksByDay.get(date) ?? [];
    const checked = checksByDay.get(date)?.size ?? 0;
    const tasksDone = dayTasks.filter((t) => t.status === "done").length;
    const total = routine.length + dayTasks.length;
    const done = checked + tasksDone;
    return { total, done };
  }

  // --- mutations ---
  const toggleCheck = useMutation({
    mutationFn: (v: { item_id: string; day: string }) => apiSend("/api/routine/check", "POST", v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: cKey });
      const prev = qc.getQueryData<Check[]>(cKey) ?? [];
      const exists = prev.some((c) => c.itemId === v.item_id && c.day === v.day);
      qc.setQueryData<Check[]>(cKey, exists
        ? prev.filter((c) => !(c.itemId === v.item_id && c.day === v.day))
        : [...prev, { itemId: v.item_id, day: v.day }]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(cKey, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: cKey }),
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: Status }) => apiSend("/api/tasks", "PATCH", v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: tKey });
      const prev = qc.getQueryData<Task[]>(tKey);
      qc.setQueryData<Task[]>(tKey, (old) => old?.map((t) => (t.id === v.id ? { ...t, status: v.status } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(tKey, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: tKey }),
  });

  const addTask = useMutation({
    mutationFn: (title: string) => apiSend("/api/tasks", "POST", { title, due_date: selected }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: tKey }); setNewTitle(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });
  const delTask = useMutation({
    mutationFn: (id: string) => apiSend(`/api/tasks?id=${id}`, "DELETE"),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: tKey });
      const prev = qc.getQueryData<Task[]>(tKey);
      qc.setQueryData<Task[]>(tKey, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(tKey, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: tKey }),
  });

  const seedRoutine = useMutation({
    mutationFn: async () => {
      let i = 0;
      for (const it of DEFAULT_ROUTINE) await apiSend("/api/routine", "POST", { ...it, sort: i++ });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["routine"] }); toast.success("Routine créée"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });
  const addItem = useMutation({
    mutationFn: () => apiSend("/api/routine", "POST", { label: newItem.trim(), at_time: newItemTime || null, sort: routine.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["routine"] }); setNewItem(""); setNewItemTime(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });
  const delItem = useMutation({
    mutationFn: (id: string) => apiSend(`/api/routine?id=${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine"] }),
  });

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const selectedTasks = tasksByDay.get(selected) ?? [];
  const selChecks = checksByDay.get(selected) ?? new Set<string>();
  const selDow = new Date(selected + "T00:00:00").getDay();
  const selPlan = planByDow.get(selDow);
  const sel = dayStats(selected);

  return (
    <div className="space-y-4">
      {/* Month grid */}
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
            {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const date = iso(year, month, day);
              const { total, done } = dayStats(date);
              const ratio = total > 0 ? done / total : 0;
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
                    "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors",
                    isSel ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    isToday && !isSel && "ring-1 ring-primary",
                  )}
                >
                  <span className={cn(isToday && "font-bold")}>{day}</span>
                  {total > 0 ? (
                    <span className={cn("h-1 w-7 overflow-hidden rounded-full", isSel ? "bg-white/30" : "bg-muted")}>
                      <span
                        className={cn("block h-full rounded-full", ratio >= 1 ? "bg-emerald-500" : isSel ? "bg-white" : "bg-amber-500")}
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </span>
                  ) : (
                    p && p.type !== "repos" && <span className={cn("h-1.5 w-1.5 rounded-full", trainingColor(p.type))} />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold capitalize">
              {new Date(selected + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            {selPlan && selPlan.type !== "repos" && (
              <Badge variant="secondary">{trainingLabel(selPlan.type)}{selPlan.focus ? ` · ${selPlan.focus}` : ""}</Badge>
            )}
          </div>
          {sel.total > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", sel.done >= sel.total ? "bg-emerald-500" : "bg-primary")}
                  style={{ width: `${Math.round((sel.done / sel.total) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{sel.done}/{sel.total}</span>
            </div>
          )}

          {/* Routine checklist */}
          {routine.length === 0 ? (
            <Button variant="outline" className="w-full" onClick={() => seedRoutine.mutate()} disabled={seedRoutine.isPending}>
              <Sparkles className="h-4 w-4" /> Créer ma routine type
            </Button>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Programme du jour</p>
              {routine.map((it) => {
                const done = selChecks.has(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => toggleCheck.mutate({ item_id: it.id, day: selected })}
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-accent"
                  >
                    {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
                    {it.atTime && <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">{it.atTime}</span>}
                    <span className={cn("text-sm", done && "text-muted-foreground line-through")}>{it.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Manual tasks */}
          <div className="mt-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mes tâches</p>
            {selectedTasks.length === 0 && <p className="py-1 text-sm text-muted-foreground">Aucune tâche libre.</p>}
            {selectedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                <button type="button" onClick={() => setStatus.mutate({ id: t.id, status: NEXT[t.status] })} aria-label="Statut" className="shrink-0">
                  {t.status === "done" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : t.status === "doing" ? <Clock className="h-5 w-5 text-amber-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                </button>
                <span className={cn("flex-1 text-sm", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</span>
                {t.status === "doing" && <Badge variant="warning">en cours</Badge>}
                <button type="button" onClick={() => delTask.mutate(t.id)} aria-label="Supprimer" className="shrink-0 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <form className="mt-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) addTask.mutate(newTitle.trim()); }}>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nouvelle tâche libre…" className="flex-1" />
              <Button type="submit" size="icon" disabled={addTask.isPending} aria-label="Ajouter"><Plus className="h-4 w-4" /></Button>
            </form>
          </div>

          {/* Routine editor */}
          {routine.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <button type="button" onClick={() => setEditRoutine((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5" /> Modifier ma routine type
              </button>
              {editRoutine && (
                <div className="mt-2 space-y-1">
                  {routine.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 text-sm">
                      <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">{it.atTime ?? "—"}</span>
                      <span className="flex-1 truncate">{it.label}</span>
                      <button type="button" onClick={() => delItem.mutate(it.id)} className="text-destructive" aria-label="Retirer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1.5 pt-1">
                    <Input type="time" value={newItemTime} onChange={(e) => setNewItemTime(e.target.value)} className="h-9 w-24" aria-label="Heure" />
                    <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Nouvel élément de routine" className="h-9 flex-1" />
                    <Button size="icon" className="h-9 w-9" onClick={() => newItem.trim() && addItem.mutate()} disabled={addItem.isPending} aria-label="Ajouter">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
