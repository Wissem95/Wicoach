"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Scale, Utensils, ShoppingBasket, Dumbbell, MessageCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Aujourd'hui", icon: Home },
  { href: "/dashboard/weight", label: "Poids", icon: Scale },
  { href: "/dashboard/meals", label: "Repas", icon: Utensils },
  { href: "/dashboard/pantry", label: "Garde-manger", icon: ShoppingBasket },
  { href: "/dashboard/training", label: "Entraînement", icon: Dumbbell },
  { href: "/dashboard/coach", label: "Coach", icon: MessageCircle },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="text-primary">Wi</span>coach
        </Link>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Se déconnecter">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <nav className="container -mx-0 flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
