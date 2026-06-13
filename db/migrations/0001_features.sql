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
