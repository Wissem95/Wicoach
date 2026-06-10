-- ==========================================================================
-- Wicoach — initial schema + Row Level Security
-- Run this in the Supabase SQL Editor (or `psql $DATABASE_URL -f`).
-- Idempotent-ish: uses IF NOT EXISTS / DROP POLICY IF EXISTS where possible.
-- ==========================================================================

-- ---- Enums ---------------------------------------------------------------
do $$ begin
  create type meal_type as enum ('petit_dej', 'dejeuner', 'diner', 'snack');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_role as enum ('user', 'assistant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type training_type as enum ('salle', 'piscine', 'maison', 'repos');
exception when duplicate_object then null; end $$;

-- ---- profiles ------------------------------------------------------------
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  current_weight  real    not null default 100,
  target_weight   real    not null default 90,
  target_calories integer not null default 1500,
  target_protein  integer not null default 110,
  target_carbs    integer not null default 80,
  target_fats     integer not null default 50,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint profiles_weight_range check (current_weight between 40 and 250 and target_weight between 40 and 250)
);

-- ---- weight_logs ---------------------------------------------------------
create table if not exists weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  weight     real not null,
  logged_at  date not null,
  created_at timestamptz not null default now(),
  constraint weight_logs_weight_range check (weight between 40 and 250),
  constraint weight_logs_not_future check (logged_at <= current_date),
  constraint weight_logs_user_day_uq unique (user_id, logged_at)
);
create index if not exists weight_logs_user_date_idx on weight_logs (user_id, logged_at desc);

-- ---- meals ---------------------------------------------------------------
create table if not exists meals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  meal_type      meal_type not null,
  meal_time      timestamptz not null default now(),
  total_calories integer not null default 0,
  total_protein  integer not null default 0,
  total_carbs    integer not null default 0,
  total_fats     integer not null default 0,
  photo_url      text,
  ai_analyzed    boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint meals_calories_range check (total_calories between 0 and 10000),
  constraint meals_macros_nonneg check (total_protein >= 0 and total_carbs >= 0 and total_fats >= 0),
  constraint meals_time_not_future check (meal_time <= now())
);
create index if not exists meals_user_time_idx on meals (user_id, meal_time desc);

-- ---- food_items ----------------------------------------------------------
create table if not exists food_items (
  id        uuid primary key default gen_random_uuid(),
  meal_id   uuid not null references meals(id) on delete cascade,
  food_name text not null,
  portion   real not null default 100,
  unit      text not null default 'g',
  calories  integer not null default 0,
  protein   integer not null default 0,
  carbs     integer not null default 0,
  fats      integer not null default 0,
  constraint food_items_macros_nonneg check (calories >= 0 and protein >= 0 and carbs >= 0 and fats >= 0)
);
create index if not exists food_items_meal_idx on food_items (meal_id);

-- ---- favorite_meals ------------------------------------------------------
create table if not exists favorite_meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  meal_type  meal_type not null default 'dejeuner',
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists favorite_meals_user_idx on favorite_meals (user_id);

-- ---- chat_messages -------------------------------------------------------
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       chat_role not null,
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_created_idx on chat_messages (user_id, created_at desc);

-- ---- pantry_items --------------------------------------------------------
create table if not exists pantry_items (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  quantity text,
  added_at timestamptz not null default now()
);
create index if not exists pantry_items_user_idx on pantry_items (user_id, added_at desc);

-- ---- training_plan -------------------------------------------------------
create table if not exists training_plan (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null,
  type        training_type not null default 'repos',
  focus       text,
  constraint training_plan_day_range check (day_of_week between 0 and 6),
  constraint training_plan_user_day_uq unique (user_id, day_of_week)
);

-- ---- workout_logs --------------------------------------------------------
create table if not exists workout_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  type             training_type not null,
  focus            text,
  duration_minutes integer not null default 0,
  completed        boolean not null default true,
  notes            text,
  performed_at     date not null,
  created_at       timestamptz not null default now(),
  constraint workout_logs_duration_nonneg check (duration_minutes between 0 and 1000),
  constraint workout_logs_not_future check (performed_at <= current_date)
);
create index if not exists workout_logs_user_date_idx on workout_logs (user_id, performed_at desc);

-- ---- steps_logs ----------------------------------------------------------
create table if not exists steps_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  steps     integer not null,
  logged_at date not null,
  constraint steps_logs_nonneg check (steps between 0 and 200000),
  constraint steps_logs_not_future check (logged_at <= current_date),
  constraint steps_logs_user_day_uq unique (user_id, logged_at)
);

-- ==========================================================================
-- Row Level Security — every user only ever sees their own rows.
-- ==========================================================================
alter table profiles       enable row level security;
alter table weight_logs    enable row level security;
alter table meals          enable row level security;
alter table food_items     enable row level security;
alter table favorite_meals enable row level security;
alter table chat_messages  enable row level security;
alter table pantry_items   enable row level security;
alter table training_plan  enable row level security;
alter table workout_logs   enable row level security;
alter table steps_logs     enable row level security;

-- profiles: id IS the user id
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Generic "owner" policy for tables with a user_id column.
do $$
declare t text;
begin
  foreach t in array array[
    'weight_logs','meals','favorite_meals','chat_messages',
    'pantry_items','training_plan','workout_logs','steps_logs'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format(
      'create policy %I on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_owner', t
    );
  end loop;
end $$;

-- food_items has no user_id: scope through the parent meal.
drop policy if exists "food_items_via_meal" on food_items;
create policy "food_items_via_meal" on food_items
  for all
  using (exists (select 1 from meals m where m.id = food_items.meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from meals m where m.id = food_items.meal_id and m.user_id = auth.uid()));

-- ==========================================================================
-- Trigger: auto-create a profile row + a default weekly training plan
-- whenever a new auth user signs up.
-- ==========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;

  insert into public.training_plan (user_id, day_of_week, type, focus)
  values
    (new.id, 1, 'salle',   'Haut du corps'),
    (new.id, 2, 'maison',  'Cardio / gainage'),
    (new.id, 3, 'piscine', 'Natation'),
    (new.id, 4, 'salle',   'Bas du corps'),
    (new.id, 5, 'maison',  'Full body'),
    (new.id, 6, 'repos',   null),
    (new.id, 0, 'repos',   null)
  on conflict (user_id, day_of_week) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
