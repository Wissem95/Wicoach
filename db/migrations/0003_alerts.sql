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
