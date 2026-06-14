"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scale, ShoppingBasket, Dumbbell, Settings, LogOut, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";

const ROWS = [
  { href: "/dashboard/weight", label: "Poids", desc: "Pesées & courbe", icon: Scale },
  { href: "/dashboard/pantry", label: "Garde-manger", desc: "Ce que tu as chez toi", icon: ShoppingBasket },
  { href: "/dashboard/training", label: "Entraînement", desc: "Plan & séances", icon: Dumbbell },
  { href: "/dashboard/settings", label: "Réglages", desc: "Cibles, alertes, compte, coach", icon: Settings },
];

export function PlusMenu() {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {ROWS.map(({ href, label, desc, icon: Icon }) => (
        <Link key={href} href={href}>
          <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{desc}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>
      ))}

      <button type="button" onClick={logout} className="w-full pt-2 text-left">
        <Card className="flex items-center gap-3 p-4 text-destructive transition-colors hover:bg-destructive/10">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10">
            <LogOut className="h-5 w-5" />
          </span>
          <span className="flex-1 font-semibold">Se déconnecter</span>
        </Card>
      </button>
    </div>
  );
}
