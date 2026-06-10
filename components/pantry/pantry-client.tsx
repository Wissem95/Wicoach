"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface PantryItem {
  id: string;
  name: string;
  quantity: string | null;
}

export function PantryClient({ initial }: { initial: PantryItem[] }) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["pantry"],
    queryFn: () => apiGet<PantryItem[]>("/api/pantry"),
    initialData: initial,
  });

  const add = useMutation({
    mutationFn: (vars: { name: string; quantity: string | null }) =>
      apiSend<PantryItem>("/api/pantry", "POST", vars),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["pantry"] });
      const prev = qc.getQueryData<PantryItem[]>(["pantry"]);
      qc.setQueryData<PantryItem[]>(["pantry"], (old = []) => [
        { id: "temp-" + Date.now(), name: vars.name, quantity: vars.quantity },
        ...old,
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["pantry"], ctx.prev);
      toast.error("Ajout impossible");
    },
    onSuccess: () => {
      setName("");
      setQuantity("");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["pantry"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiSend(`/api/pantry?id=${id}`, "DELETE"),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["pantry"] });
      const prev = qc.getQueryData<PantryItem[]>(["pantry"]);
      qc.setQueryData<PantryItem[]>(["pantry"], (old) => old?.filter((i) => i.id !== id) ?? []);
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["pantry"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["pantry"] }),
  });

  function submit() {
    if (!name.trim()) return;
    add.mutate({ name: name.trim(), quantity: quantity.trim() || null });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingrédient (ex: Thon)"
              className="flex-1"
              aria-label="Nom de l'ingrédient"
            />
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qté"
              className="w-24"
              aria-label="Quantité"
            />
            <Button type="submit" size="icon" aria-label="Ajouter">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Garde-manger vide. Ajoute ce que tu as à la maison — le coach s&apos;en sert pour te
            proposer des repas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{i.name}</p>
                {i.quantity && <p className="text-xs text-muted-foreground">{i.quantity}</p>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-destructive"
                onClick={() => del.mutate(i.id)}
                aria-label={`Supprimer ${i.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
