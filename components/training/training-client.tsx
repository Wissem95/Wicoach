"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/lib/client-api";
import { todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DAY_LABELS, TRAINING_TYPE_OPTIONS, trainingLabel } from "@/types";
import type { TrainingType } from "@/types";

interface PlanRow {
  id: string;
  dayOfWeek: number;
  type: TrainingType;
  focus: string | null;
}
interface WorkoutLog {
  id: string;
  type: TrainingType;
  focus: string | null;
  durationMinutes: number;
  completed: boolean;
  notes: string | null;
  performedAt: string;
}

// Display order: Monday → Sunday (our day_of_week: 0=Sun..6=Sat).
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const TYPES = TRAINING_TYPE_OPTIONS;

export function TrainingClient({
  initialPlan,
  initialLogs,
}: {
  initialPlan: PlanRow[];
  initialLogs: WorkoutLog[];
}) {
  const qc = useQueryClient();

  const { data: plan = [] } = useQuery({
    queryKey: ["training-plan"],
    queryFn: () => apiGet<PlanRow[]>("/api/training/plan"),
    initialData: initialPlan,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["workout-logs"],
    queryFn: () => apiGet<WorkoutLog[]>("/api/training/log"),
    initialData: initialLogs,
  });

  const savePlan = useMutation({
    mutationFn: (vars: { day_of_week: number; type: TrainingType; focus: string | null }) =>
      apiSend("/api/training/plan", "PUT", vars),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["training-plan"] });
      const prev = qc.getQueryData<PlanRow[]>(["training-plan"]);
      qc.setQueryData<PlanRow[]>(["training-plan"], (old = []) =>
        old.map((d) =>
          d.dayOfWeek === vars.day_of_week ? { ...d, type: vars.type, focus: vars.focus } : d,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["training-plan"], ctx.prev);
      toast.error("Plan non sauvegardé");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["training-plan"] }),
  });

  const byDay = new Map(plan.map((d) => [d.dayOfWeek, d]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {WEEK_ORDER.map((dow) => {
            const row = byDay.get(dow) ?? {
              id: `d-${dow}`,
              dayOfWeek: dow,
              type: "repos" as TrainingType,
              focus: null,
            };
            return (
              <div key={dow} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                <span className="w-20 shrink-0 text-sm font-medium">{DAY_LABELS[dow]}</span>
                <Select
                  value={row.type}
                  onChange={(e) =>
                    savePlan.mutate({
                      day_of_week: dow,
                      type: e.target.value as TrainingType,
                      focus: e.target.value === "repos" ? null : row.focus,
                    })
                  }
                  className="h-9 w-32"
                  aria-label={`Type ${DAY_LABELS[dow]}`}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {trainingLabel(t)}
                    </option>
                  ))}
                </Select>
                <Input
                  defaultValue={row.focus ?? ""}
                  key={row.focus ?? "empty"}
                  placeholder="Focus (optionnel)"
                  disabled={row.type === "repos"}
                  className="h-9 flex-1"
                  aria-label={`Focus ${DAY_LABELS[dow]}`}
                  onBlur={(e) => {
                    const focus = e.target.value.trim() || null;
                    if (focus !== (row.focus ?? null)) {
                      savePlan.mutate({ day_of_week: dow, type: row.type, focus });
                    }
                  }}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <LogSection logs={logs} plan={plan} />
    </div>
  );
}

function LogSection({ logs, plan }: { logs: WorkoutLog[]; plan: PlanRow[] }) {
  const qc = useQueryClient();
  const todayPlan = plan.find((d) => d.dayOfWeek === new Date().getDay());
  const [type, setType] = React.useState<TrainingType>(todayPlan?.type ?? "salle");
  const [focus, setFocus] = React.useState(todayPlan?.focus ?? "");
  const [duration, setDuration] = React.useState("30");
  const [completed, setCompleted] = React.useState(true);
  const [notes, setNotes] = React.useState("");

  const add = useMutation({
    mutationFn: () =>
      apiSend("/api/training/log", "POST", {
        type,
        focus: focus.trim() || null,
        duration_minutes: parseInt(duration, 10) || 0,
        completed,
        notes: notes.trim() || null,
        performed_at: todayISO(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-logs"] });
      toast.success("Séance enregistrée");
      setNotes("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiSend(`/api/training/log?id=${id}`, "DELETE"),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["workout-logs"] });
      const prev = qc.getQueryData<WorkoutLog[]>(["workout-logs"]);
      qc.setQueryData<WorkoutLog[]>(["workout-logs"], (old) => old?.filter((l) => l.id !== id) ?? []);
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["workout-logs"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["workout-logs"] }),
  });

  const TYPES = TRAINING_TYPE_OPTIONS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logger une séance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="log-type">Type</Label>
            <Select id="log-type" value={type} onChange={(e) => setType(e.target.value as TrainingType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {trainingLabel(t)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="log-dur">Durée (min)</Label>
            <Input
              id="log-dur"
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-focus">Focus</Label>
          <Input
            id="log-focus"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="ex: longueurs, haut du corps"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={completed ? "default" : "outline"}
            size="sm"
            onClick={() => setCompleted(true)}
          >
            <Check className="h-4 w-4" /> Fait
          </Button>
          <Button
            type="button"
            variant={!completed ? "destructive" : "outline"}
            size="sm"
            onClick={() => setCompleted(false)}
          >
            <X className="h-4 w-4" /> Pas fait
          </Button>
        </div>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optionnel)"
        />
        <Button onClick={() => add.mutate()} disabled={add.isPending} className="w-full">
          Enregistrer la séance
        </Button>

        <div className="space-y-1 pt-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Séances récentes</h3>
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune séance loggée.</p>
          )}
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={l.completed ? "default" : "destructive"}>
                  {trainingLabel(l.type)}
                </Badge>
                <span className="text-muted-foreground">{l.performedAt}</span>
                <span>{l.durationMinutes} min</span>
                {l.focus && <span className="text-muted-foreground">· {l.focus}</span>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                onClick={() => del.mutate(l.id)}
                aria-label="Supprimer la séance"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
