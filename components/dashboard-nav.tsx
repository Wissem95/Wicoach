"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Utensils, MessageCircle, CalendarDays, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/dashboard/meals", label: "Repas", icon: Utensils },
  { href: "/dashboard/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/dashboard/plus", label: "Plus", icon: LayoutGrid },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();
  const coachActive = pathname.startsWith("/dashboard/coach");

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
            {[LINKS[0], LINKS[1], { href: "/dashboard/coach", label: "Coach", icon: MessageCircle }, LINKS[2], LINKS[3]].map(
              ({ href, label, icon: Icon }) => {
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
              },
            )}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile bottom bar with a raised central Coach button */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 card-glass pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          <NavItem {...LINKS[0]} active={isActive(pathname, LINKS[0].href)} />
          <NavItem {...LINKS[1]} active={isActive(pathname, LINKS[1].href)} />

          {/* Center Coach FAB */}
          <Link href="/dashboard/coach" className="flex flex-col items-center">
            <span
              className={cn(
                "-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95",
                coachActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              <MessageCircle className="h-6 w-6" />
            </span>
            <span className={cn("mt-0.5 text-[11px] font-medium", coachActive ? "text-primary" : "text-muted-foreground")}>
              Coach
            </span>
          </Link>

          <NavItem {...LINKS[2]} active={isActive(pathname, LINKS[2].href)} />
          <NavItem {...LINKS[3]} active={isActive(pathname, LINKS[3].href)} />
        </div>
      </nav>
    </>
  );
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 py-2.5">
      <Icon className={cn("h-6 w-6", active ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>{label}</span>
    </Link>
  );
}
