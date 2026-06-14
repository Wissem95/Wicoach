# Wicoach — coach perso fitness & nutrition

MVP web app perso (pas un SaaS). **Mobile-first (iPhone)**, **0 €/mois** (free tiers
partout). Suivi du poids, des repas (manuel + Open Food Facts + analyse photo IA),
garde-manger, plan d'entraînement, et un **coach IA** qui voit tes vraies données.

## Stack

- **Next.js 15** (App Router, TypeScript strict) — déployé sur **Vercel** (Hobby).
- **Supabase** (free) — Auth email/password, Postgres, Storage (photos).
- **Drizzle ORM** pour les requêtes typées (`db/`). Client Supabase JS pour Auth/Storage.
- **Tailwind + composants type shadcn/ui** (`components/ui/`).
- **TanStack Query** (optimistic UI), **Recharts** (courbe de poids).
- **LLM : Google Gemini 2.5 Flash** via `@google/genai`, derrière l'abstraction
  `lib/llm/` (`LLMProvider`) → swap Groq/DeepSeek/OpenRouter sans toucher au reste.
- **Open Food Facts** (`lib/food/`) — gratuit, sans clé, base FR forte.

## Démarrage local

```bash
npm install
cp .env.local.example .env.local   # puis remplis les valeurs (voir plus bas)
npm run dev                         # http://localhost:3000
```

## 1) Setup Supabase (gratuit)

1. Crée un projet sur https://supabase.com.
2. **SQL Editor** → colle et exécute `db/migrations/0000_init.sql` (tables, RLS,
   policies, trigger de création de profil + plan hebdo au signup).
3. **Storage** → crée un bucket **public** nommé `meal-photos`
   (= `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`).
4. **Authentication → Providers → Email** : laisse activé. Pour un usage perso,
   **désactive "Confirm email"** (Authentication → Sign In / Providers) pour être
   connecté direct après le signup.
5. Récupère les clés dans **Project Settings → API** et la chaîne Postgres dans
   **Project Settings → Database → Connection string → Transaction (port 6543)**.

## 2) Clé Google AI Studio (gratuite, sans CB)

1. Va sur https://aistudio.google.com/apikey.
2. Connecte-toi avec un compte Google → **Create API key**.
3. Copie la clé dans `GEMINI_API_KEY`. Le free tier suffit largement pour un usage perso.

## 3) Variables d'environnement

Identiques en local (`.env.local`) et sur Vercel (voir `.env.local.example`) :

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role, **serveur only**) |
| `DATABASE_URL` | Supabase → Settings → Database → pooler **6543** |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | `meal-photos` |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `NEXT_PUBLIC_SITE_URL` | URL de prod (ex: `https://wicoach.vercel.app`) |

## 4) Seed de ton profil

Le profil + le plan hebdo sont créés automatiquement au **signup** (trigger SQL).
Pour charger **tes cibles + des repas/garde-manger d'exemple** :

1. Lance l'app, **crée ton compte** (avec l'email du seed, par défaut
   `wissemkarboub@gmail.com`).
2. Puis, au choix :
   - **SQL Editor** Supabase → exécute `db/seed.sql`, **ou**
   - en local :
     ```bash
     npm run db:seed                    # email par défaut du fichier
     npm run db:seed -- toi@exemple.com # autre email
     ```

## 5) Déploiement Vercel

```bash
npm i -g vercel
vercel link          # lie le repo au projet Vercel
# Ajoute chaque variable (répète pour production / preview / development) :
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
vercel env add GEMINI_API_KEY
vercel env add GEMINI_MODEL
vercel env add NEXT_PUBLIC_SITE_URL
vercel --prod        # build + déploiement
```

(Ou : importe le repo GitHub dans le dashboard Vercel et colle les variables d'env.)

## Structure

```
app/
  (login, signup)/        Auth pages
  dashboard/              Today, weight, meals, pantry, training, coach
  api/                    Route handlers (REST + /api/chat en SSE streaming)
components/               UI (ui/) + features (meals/, weight/, ...)
db/                       Drizzle schema, queries, migration SQL, seed
lib/
  llm/                    LLMProvider abstraction + Gemini impl + prompts
  food/                   Open Food Facts client
  supabase/               server / client / middleware / admin helpers
types/                    Types partagés
```

## Garder Supabase actif (free tier)

Le projet Supabase free **se met en pause après 7 jours sans aucune requête**
(données **conservées**, restauration en 1 clic). Pour ne jamais y penser, un
**Vercel Cron** (`vercel.json`) appelle `/api/health` chaque jour → une mini
requête DB qui réinitialise le compteur d'inactivité. Aucune config requise
(le cron est actif dès le déploiement sur Vercel). Option : définis `CRON_SECRET`
pour que seul le cron Vercel puisse appeler la route.

## Migration 0001 — mémoire coach, sommeil, Apple Santé, rappels

Après `0000_init.sql`, exécute **`db/migrations/0001_features.sql`** dans le SQL Editor.
Ça ajoute : la mémoire permanente du coach, le sommeil, l'ingestion Apple Santé
(token), et les abonnements push.

### Rappels par email (gratuit)
1. Crée un compte sur https://resend.com → **API Keys** → copie la clé.
2. Variables Vercel : `RESEND_API_KEY` (et `REMINDER_FROM` optionnel).
   Sans domaine vérifié, Resend n'envoie que vers l'email de ton compte Resend.
3. Un **Vercel Cron** quotidien (`/api/cron/reminders`, 19:00 UTC) envoie le récap.

### Notifications iPhone (Web Push, gratuit)
1. Génère une paire VAPID : `npx web-push generate-vapid-keys`.
2. Variables Vercel : `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
3. Sur iPhone : ouvre l'app dans Safari → **Partager → « Sur l'écran d'accueil »**,
   rouvre depuis l'icône, puis **Réglages → Activer les notifications iPhone**.

### Apple Santé (pas / poids / sommeil) via Raccourci
Pas d'accès direct depuis le web. Va dans **Réglages**, copie ton **URL d'ingestion**
(avec ton token secret), et crée un **Raccourci iPhone** (automatisation quotidienne)
qui lit Santé et fait un POST JSON `{ "steps":…, "weight":…, "sleep_hours":… }`.
Saisie manuelle aussi possible depuis Réglages.

## Migrations 0002 & 0003 — calendrier + alertes

Exécute aussi **`db/migrations/0002_tasks.sql`** (calendrier à cocher) et
**`db/migrations/0003_alerts.sql`** (alertes perso).

### Alertes à heures précises (réveil, prière, compléments…)
Vercel Hobby ne lance les crons qu'une fois par jour. Pour des alertes à
l'heure exacte, fais pinguer `/api/cron/alerts?token=<CRON_SECRET>` **toutes les
~10 min** par un planificateur gratuit (ex: **cron-job.org**). L'endpoint envoie
les alertes dues (push + email) sans doublon. Configure tes alertes dans
**Réglages → Alertes personnalisées**.

## Notes

- L'analyse photo est une **estimation (±20-30 %)**, affichée et éditable avant save.
- Le coach reçoit à chaque message : poids, totaux du jour, tendance 7 j,
  **garde-manger** et **plan d'entraînement** — il ne propose que du **halal** et
  gère le **fallback séance maison** si tu rates la salle.
- Limite de 50 messages/jour au coach pour rester dans le free tier.
- Non-goals MVP (v1.1+) : catalogue d'exercices avec images, HealthKit, push, dark
  mode, multi-langue, PWA offline, export CSV.
