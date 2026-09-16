alter table planned_sessions
  drop constraint if exists planned_sessions_activity_type_check;

alter table planned_sessions
  add constraint planned_sessions_activity_type_not_empty
  check (length(trim(activity_type)) > 0);

create table activity_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  value text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, value),
  check (length(trim(value)) > 0),
  check (length(trim(label)) > 0)
);

alter table activity_types enable row level security;

create policy activity_types_owner on activity_types for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
