create table activity_type_icons (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_type text not null,
  icon text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_type),
  check (length(trim(activity_type)) > 0),
  check (length(icon) between 1 and 16)
);

alter table activity_type_icons enable row level security;

create policy activity_type_icons_owner on activity_type_icons for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
