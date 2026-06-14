"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Scale, Utensils, ShoppingBasket, Dumbbell, MessageCircle, LogOut, Settings, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Aujourd'hui", short: "Accueil", icon: Home },
  { href: "/dashboard/calendar", label: "Calendrier", short: "Agenda", icon: CalendarDays },
  { href: "/dashboard/weight", label: "Poids", short: "Poids", icon: Scale },
  { href: "/dashboard/meals", label: "Repas", short: "Repas", icon: Utensils },
  { href: "/dashboard/pantry", label: "Garde-manger", short: "Frigo", icon: ShoppingBasket },
  { href: "/dashboard/training", label: "Entraînement", short: "Training", icon: Dumbbell },
  { href: "/dashboard/coach", label: "Coach", short: "Coach", icon: MessageCircle },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 card-glass">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-1 text-lg font-extrabold tracking-tight">
            <span className="text-gradient">Wi</span>coach
          </Link>

          {/* Desktop inline nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5">
            <Button asChild variant="ghost" size="icon" aria-label="Réglages">
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Se déconnecter">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar — horizontally scrollable so icons stay comfortable */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 card-glass pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="no-scrollbar flex snap-x gap-1 overflow-x-auto px-2">
          {LINKS.map(({ href, short, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-w-[68px] shrink-0 snap-start flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-16 items-center justify-center rounded-2xl transition-colors",
                    active && "bg-accent",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                {short}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
