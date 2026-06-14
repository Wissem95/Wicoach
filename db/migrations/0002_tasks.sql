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
