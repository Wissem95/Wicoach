import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MessageCircle,
  Camera,
  TrendingDown,
  Utensils,
  ShoppingBasket,
  Dumbbell,
  CalendarCheck,
  BellRing,
  ArrowRight,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: MessageCircle, title: "Coach IA agentique", desc: "Il connaît tes chiffres, ton garde-manger et ton plan — et peut modifier ton programme en direct." },
  { icon: Camera, title: "Analyse photo", desc: "Prends ton plat en photo, l'IA estime calories et macros. Tu corriges, tu enregistres." },
  { icon: Utensils, title: "Repas & Open Food Facts", desc: "Recherche par nom ou code-barres, macros fiables, repas favoris en un tap." },
  { icon: TrendingDown, title: "Suivi du poids", desc: "Courbe d'évolution avec ta ligne d'objectif. Vois la tendance, pas le bruit." },
  { icon: ShoppingBasket, title: "Garde-manger", desc: "Dis ce que tu as chez toi, le coach te propose des repas avec ça." },
  { icon: Dumbbell, title: "Entraînement libre", desc: "Salle, course, vélo, piscine, yoga… tout type. Plan hebdo + suivi des séances." },
  { icon: CalendarCheck, title: "Calendrier & routine", desc: "Ta journée en checklist : réveil, repas, séance, coucher. Coche, vois ta régularité." },
  { icon: BellRing, title: "Rappels & Apple Santé", desc: "Alertes email/iPhone (réveil, compléments…) et import auto pas/sommeil/poids." },
];

const STEPS = [
  { n: "1", title: "Crée ton compte", desc: "Email + mot de passe, 20 secondes." },
  { n: "2", title: "Parle à ton coach", desc: "Il t'interviewe et configure objectif, cibles, plan et routine." },
  { n: "3", title: "Suis ton plan", desc: "Logge, coche, demande conseil — chaque jour, sans prise de tête." },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 card-glass">
        <div className="container flex h-14 items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight">
            <span className="text-gradient">Wi</span>coach
          </span>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Créer un compte</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container max-w-3xl py-14 text-center md:py-20">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-3xl font-extrabold text-white shadow-soft">
          W
        </div>
        <h1 className="text-balance text-4xl font-extrabold tracking-tight md:text-5xl">
          Ton coach fitness & nutrition,{" "}
          <span className="text-gradient">dans ta poche</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground md:text-lg">
          Suivi du poids, des repas et de l'entraînement, plus un coach IA qui voit tes vraies
          données et adapte ton programme. Simple, perso, et gratuit.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">J'ai déjà un compte</Link>
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-primary" /> 100% gratuit</span>
          <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-primary" /> Sans carte bancaire</span>
          <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-primary" /> Coach IA inclus</span>
        </div>
      </section>

      {/* Features */}
      <section className="container max-w-5xl py-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container max-w-4xl py-12">
        <h2 className="text-center text-2xl font-bold">Comment ça marche</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border/70 bg-card p-5 text-center shadow-soft">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container max-w-3xl py-12">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 p-8 text-center text-white shadow-soft">
          <h2 className="text-2xl font-bold md:text-3xl">Prêt à t'y mettre pour de bon ?</h2>
          <p className="mx-auto mt-2 max-w-md text-white/90">
            Ton coach t'attend. Configure ton programme en 3 minutes, en discutant.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-5">
            <Link href="/signup">
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="container py-8 text-center text-sm text-muted-foreground">
        <span className="font-semibold"><span className="text-gradient">Wi</span>coach</span> — coaching perso, halal-friendly. Fait avec ❤️.
      </footer>
    </div>
  );
}
