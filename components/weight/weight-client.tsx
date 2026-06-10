"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/lib/client-api";
import { todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeightLog {
  id: string;
  weight: number;
  loggedAt: string;
}

export function WeightClient({
  initial,
  targetWeight,
}: {
  initial: WeightLog[];
  targetWeight: number;
}) {
  const qc = useQueryClient();
  const [weight, setWeight] = React.useState("");
  const [date, setDate] = React.useState(todayISO());

  const { data: logs = [] } = useQuery({
    queryKey: ["weight"],
    queryFn: () => apiGet<WeightLog[]>("/api/weight"),
    initialData: initial,
  });

  const add = useMutation({
    mutationFn: (vars: { weight: number; logged_at: string }) =>
      apiSend<WeightLog>("/api/weight", "POST", vars),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["weight"] });
      const prev = qc.getQueryData<WeightLog[]>(["weight"]);
      qc.setQueryData<WeightLog[]>(["weight"], (old = []) => {
        const others = old.filter((l) => l.loggedAt !== vars.logged_at);
        return [{ id: "temp", weight: vars.weight, loggedAt: vars.logged_at }, ...others].sort(
          (a, b) => (a.loggedAt < b.loggedAt ? 1 : -1),
        );
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["weight"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Échec");
    },
    onSuccess: () => {
      toast.success("Poids enregistré");
      setWeight("");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["weight"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiSend(`/api/weight?id=${id}`, "DELETE"),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["weight"] });
      const prev = qc.getQueryData<WeightLog[]>(["weight"]);
      qc.setQueryData<WeightLog[]>(["weight"], (old) => old?.filter((l) => l.id !== id) ?? []);
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["weight"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["weight"] }),
  });

  function submit() {
    const w = parseFloat(weight.replace(",", "."));
    if (!Number.isFinite(w) || w < 40 || w > 250) {
      toast.error("Poids entre 40 et 250 kg.");
      return;
    }
    add.mutate({ weight: w, logged_at: date });
  }

  const chartData = [...logs]
    .sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : 1))
    .map((l) => ({ date: l.loggedAt.slice(5), weight: l.weight }));

  const latest = logs[0]?.weight;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une pesée</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="w">Poids (kg)</Label>
              <Input
                id="w"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="99.6"
                className="w-28"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d">Date</Label>
              <Input
                id="d"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button type="submit" disabled={add.isPending}>
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Évolution</span>
            {latest && (
              <span className="text-sm font-normal text-muted-foreground">
                {latest} kg → objectif {targetWeight} kg
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ajoute au moins 2 pesées pour voir la courbe.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" fontSize={11} tickMargin={6} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} fontSize={11} width={40} />
                  <Tooltip />
                  <ReferenceLine
                    y={targetWeight}
                    stroke="#16a34a"
                    strokeDasharray="4 4"
                    label={{ value: `Objectif ${targetWeight}`, fontSize: 11, fill: "#16a34a" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune pesée enregistrée.</p>
          )}
          {logs.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <span className="text-muted-foreground">{l.loggedAt}</span>
              <span className="font-medium">{l.weight} kg</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                onClick={() => del.mutate(l.id)}
                disabled={l.id === "temp"}
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
