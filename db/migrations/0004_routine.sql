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
