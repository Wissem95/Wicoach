"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, BellRing, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface Alert {
  id: string;
  label: string;
  atTime: string;
  days: string | null;
  channel: "push" | "email" | "both";
  enabled: boolean;
}

// Display order Monday→Sunday, value = our dow (0=Sun).
const DAYS: { v: number; l: string }[] = [
  { v: 1, l: "L" },
  { v: 2, l: "M" },
  { v: 3, l: "M" },
  { v: 4, l: "J" },
  { v: 5, l: "V" },
  { v: 6, l: "S" },
  { v: 0, l: "D" },
];

const CHANNEL_LABEL = { push: "Push", email: "Email", both: "Push + Email" } as const;

const DEFAULTS = [
  { label: "Réveil", at_time: "07:00" },
  { label: "Petit-déj + compléments (multivit, D3, oméga-3)", at_time: "07:30" },
  { label: "Déjeuner", at_time: "13:00" },
  { label: "Collation", at_time: "16:00" },
  { label: "Cardio", at_time: "17:30" },
  { label: "Stop manger pour ce soir", at_time: "20:00" },
  { label: "Stop travail + magnésium & collagène", at_time: "22:30" },
  { label: "Au lit (objectif 8h de sommeil)", at_time: "23:00" },
];

function daysSummary(days: string | null): string {
  if (!days) return "Tous les jours";
  const set = days.split(",").map(Number);
  return DAYS.filter((d) => set.includes(d.v)).map((d) => d.l).join(" ");
}

export function AlertsManager({ initial }: { initial: Alert[] }) {
  const qc = useQueryClient();
  const [label, setLabel] = React.useState("");
  const [time, setTime] = React.useState("07:00");
  const [channel, setChannel] = React.useState<"push" | "email" | "both">("both");
  const [days, setDays] = React.useState<Set<number>>(new Set());

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => apiGet<Alert[]>("/api/alerts"),
    initialData: initial,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["alerts"] });

  const create = useMutation({
    mutationFn: (body: object) => apiSend("/api/alerts", "POST", body),
    onSuccess: () => {
      invalidate();
      setLabel("");
      setDays(new Set());
      toast.success("Alerte ajoutée");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => apiSend("/api/alerts", "PATCH", v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["alerts"] });
      const prev = qc.getQueryData<Alert[]>(["alerts"]);
      qc.setQueryData<Alert[]>(["alerts"], (old) =>
        old?.map((a) => (a.id === v.id ? { ...a, enabled: v.enabled } : a)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["alerts"], ctx.prev),
    onSettled: invalidate,
  });

  const del = useMutation({
    mutationFn: (id: string) => apiSend(`/api/alerts?id=${id}`, "DELETE"),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["alerts"] });
      const prev = qc.getQueryData<Alert[]>(["alerts"]);
      qc.setQueryData<Alert[]>(["alerts"], (old) => old?.filter((a) => a.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(["alerts"], ctx.prev),
    onSettled: invalidate,
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      for (const d of DEFAULTS) await apiSend("/api/alerts", "POST", { ...d, channel: "both" });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Rappels par défaut ajoutés");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  function submit() {
    if (!label.trim()) return toast.error("Donne un nom à l'alerte.");
    create.mutate({ label: label.trim(), at_time: time, days: [...days], channel });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-primary" /> Alertes personnalisées
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Réveil, prière, compléments, hydratation… Crée tes propres rappels à l&apos;heure que tu
          veux.
        </p>

        {alerts.length === 0 ? (
          <Button variant="outline" className="w-full" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
            <Sparkles className="h-4 w-4" /> Ajouter mes rappels par défaut
          </Button>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-2">
                <span className="w-12 shrink-0 font-semibold tabular-nums">{a.atTime}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm", !a.enabled && "text-muted-foreground line-through")}>
                    {a.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {daysSummary(a.days)} · {CHANNEL_LABEL[a.channel]}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => toggle.mutate({ id: a.id, enabled: e.target.checked })}
                  className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
                  aria-label={`Activer ${a.label}`}
                />
                <button
                  type="button"
                  onClick={() => del.mutate(a.id)}
                  className="shrink-0 text-destructive"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-sm font-medium">Nouvelle alerte</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="a-label">Nom</Label>
              <Input
                id="a-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: Prière Dohr, Boire de l'eau…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="a-time">Heure</Label>
              <Input
                id="a-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-28"
              />
            </div>
          </div>

          <div className="mt-2">
            <Label className="text-xs">Jours (aucun = tous les jours)</Label>
            <div className="mt-1 flex gap-1">
              {DAYS.map((d, i) => {
                const on = days.has(d.v);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setDays((s) => {
                        const n = new Set(s);
                        n.has(d.v) ? n.delete(d.v) : n.add(d.v);
                        return n;
                      })
                    }
                    className={cn(
                      "h-8 w-8 rounded-full border text-xs font-medium",
                      on ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="a-channel">Canal</Label>
              <Select
                id="a-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as "push" | "email" | "both")}
              >
                <option value="both">Push + Email</option>
                <option value="push">Push iPhone</option>
                <option value="email">Email</option>
              </Select>
            </div>
            <Button onClick={submit} disabled={create.isPending}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
