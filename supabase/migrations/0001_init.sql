create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  status text not null default 'active' check (status in ('active','archived')),
  race_name text,
  race_date date,
  race_distance_km numeric,
  race_elevation_m numeric,
  current_benchmark text,
  notes text,
  created_at timestamptz not null default now()
);

create table plan_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  plan_id uuid not null references plans(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  priority_description text,
  target_long_run_min_km numeric,
  target_long_run_max_km numeric,
  target_weekly_dplus_min_m numeric,
  target_weekly_dplus_max_m numeric,
  sort_order int not null default 0
);

create table planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  plan_id uuid references plans(id) on delete set null,
  date date not null,
  activity_type text not null check (activity_type in ('running','flag_football','other')),
  session_name text not null,
  priority text not null check (priority in ('fixed','essential','optional')),
  target_duration_min numeric,
  target_distance_km numeric,
  target_dplus_m numeric,
  intensity text,
  instructions text,
  status text not null default 'todo' check (status in ('todo','done','skipped')),
  linked_activity_id uuid,
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  source text not null check (source in ('strava','manual')),
  strava_activity_id bigint unique,
  date date not null,
  sport_type text not null,
  duration_min numeric,
  distance_km numeric,
  dplus_m numeric,
  avg_hr numeric,
  pace text,
  rpe int check (rpe between 1 and 10),
  notes text,
  strava_link text,
  planned_session_id uuid references planned_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table planned_sessions
  add constraint planned_sessions_linked_activity_fkey
  foreign key (linked_activity_id) references activities(id) on delete set null;

create table strava_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id),
  athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  last_synced_at timestamptz
);

create index planned_sessions_date_idx on planned_sessions (user_id, date);
create index activities_date_idx on activities (user_id, date);

alter table plans enable row level security;
alter table plan_phases enable row level security;
alter table planned_sessions enable row level security;
alter table activities enable row level security;
alter table strava_tokens enable row level security;

create policy plans_owner on plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy plan_phases_owner on plan_phases for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy planned_sessions_owner on planned_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy activities_owner on activities for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy strava_tokens_owner on strava_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
