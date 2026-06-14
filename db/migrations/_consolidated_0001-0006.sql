-- ==========================================================================
-- Wicoach — migration 0001 : mémoire coach, sommeil, ingestion Apple Santé,
-- rappels email + push. À exécuter dans le SQL Editor Supabase APRÈS 0000.
-- ==========================================================================

-- ---- profiles : nouvelles colonnes --------------------------------------
alter table profiles add column if not exists coach_notes text;
alter table profiles add column if not exists ingest_token uuid not null default gen_random_uuid();
alter table profiles add column if not exists email_reminders boolean not null default true;
alter table profiles add column if not exists push_enabled boolean not null default false;

-- backfill un token pour les profils déjà existants
update profiles set ingest_token = gen_random_uuid() where ingest_token is null;

create unique index if not exists profiles_ingest_token_uq on profiles (ingest_token);

-- ---- sleep_logs : heures de sommeil par nuit ----------------------------
create table if not exists sleep_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  hours     real not null,
  logged_at date not null,
  constraint sleep_logs_range check (hours >= 0 and hours <= 24),
  constraint sleep_logs_not_future check (logged_at <= current_date),
  constraint sleep_logs_user_day_uq unique (user_id, logged_at)
);
create index if not exists sleep_logs_user_date_idx on sleep_logs (user_id, logged_at desc);

-- ---- push_subscriptions : abonnements Web Push (PWA iOS) -----------------
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

-- ---- RLS ----------------------------------------------------------------
alter table sleep_logs enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "sleep_logs_owner" on sleep_logs;
create policy "sleep_logs_owner" on sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_owner" on push_subscriptions;
create policy "push_subscriptions_owner" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ==========================================================================
-- Wicoach — migration 0002 : tâches (calendrier à cocher).
-- À exécuter dans le SQL Editor après 0001.
-- ==========================================================================

do $$ begin
  create type task_status as enum ('todo', 'doing', 'done');
exception when duplicate_object then null; end $$;

create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  status     task_status not null default 'todo',
  due_date   date not null,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_due_idx on tasks (user_id, due_date);

alter table tasks enable row level security;
drop policy if exists "tasks_owner" on tasks;
create policy "tasks_owner" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ==========================================================================
-- Wicoach — migration 0003 : alertes personnalisées (réveil, prière, etc.)
-- À exécuter dans le SQL Editor après 0002.
-- ==========================================================================

create table if not exists custom_alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text not null,
  at_time      text not null,                 -- "HH:MM" (24h, heure Europe/Paris)
  days         text,                          -- "0,1,..6" (0=Dim) ; null = tous les jours
  channel      text not null default 'push',  -- push | email | both
  enabled      boolean not null default true,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint custom_alerts_time_format check (at_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint custom_alerts_channel check (channel in ('push','email','both'))
);
create index if not exists custom_alerts_user_idx on custom_alerts (user_id);

alter table custom_alerts enable row level security;
drop policy if exists "custom_alerts_owner" on custom_alerts;
create policy "custom_alerts_owner" on custom_alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ==========================================================================
-- Wicoach — migration 0004 : routine quotidienne (checklist du jour).
-- routine_items = ton modèle de journée (réveil, repas, compléments, séance…)
-- routine_checks = ce que tu as coché, par jour. À exécuter après 0003.
-- ==========================================================================

create table if not exists routine_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  at_time    text,                         -- "HH:MM" optionnel (pour l'ordre/affichage)
  sort       integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint routine_items_time_format check (at_time is null or at_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
create index if not exists routine_items_user_idx on routine_items (user_id, sort);

create table if not exists routine_checks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    uuid not null references routine_items(id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  constraint routine_checks_uq unique (user_id, item_id, day)
);
create index if not exists routine_checks_user_day_idx on routine_checks (user_id, day);

alter table routine_items  enable row level security;
alter table routine_checks enable row level security;

drop policy if exists "routine_items_owner" on routine_items;
create policy "routine_items_owner" on routine_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "routine_checks_owner" on routine_checks;
create policy "routine_checks_owner" on routine_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ==========================================================================
-- Wicoach — migration 0005 : onboarding des nouveaux utilisateurs.
-- À exécuter dans le SQL Editor après 0004.
-- ==========================================================================

alter table profiles add column if not exists onboarded boolean not null default false;

-- Les utilisateurs déjà configurés ne repassent pas par l'onboarding.
update profiles set onboarded = true where onboarded = false;
-- ==========================================================================
-- Wicoach — migration 0006 : types d'entraînement ouverts (texte libre).
-- Le coach peut désormais utiliser n'importe quel type (course, vélo, yoga…).
-- À exécuter dans le SQL Editor après 0005.
-- ==========================================================================

-- training_plan.type : enum -> text
alter table training_plan alter column type drop default;
alter table training_plan alter column type type text using type::text;
alter table training_plan alter column type set default 'repos';

-- workout_logs.type : enum -> text
alter table workout_logs alter column type type text using type::text;

-- L'ancien type enum n'est plus utilisé (on le garde au cas où, sans risque).
