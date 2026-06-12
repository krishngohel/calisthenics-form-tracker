-- Calisthenics Form Tracker — initial schema

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  experience_level text default 'intermediate',
  created_at timestamptz default now()
);

create table if not exists public.hold_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null,
  mode text not null check (mode in ('hold_only', 'perfect')),
  duration_ms integer not null,
  form_score integer not null default 0,
  peak_metrics jsonb default '[]'::jsonb,
  started_at timestamptz not null default now()
);

create table if not exists public.coaching_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null,
  weak_points jsonb default '[]'::jsonb,
  recommended_drills jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  unique (user_id, skill_id)
);

create table if not exists public.skill_progress_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null,
  date date not null,
  total_hold_ms bigint default 0,
  best_hold_ms integer default 0,
  avg_form_score numeric default 0,
  session_count integer default 0,
  unique (user_id, skill_id, date)
);

create index if not exists idx_hold_sessions_user on public.hold_sessions(user_id);
create index if not exists idx_hold_sessions_skill on public.hold_sessions(skill_id);
create index if not exists idx_progress_user_skill on public.skill_progress_daily(user_id, skill_id);

alter table public.profiles enable row level security;
alter table public.hold_sessions enable row level security;
alter table public.coaching_plans enable row level security;
alter table public.skill_progress_daily enable row level security;

create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users CRUD own sessions" on public.hold_sessions
  for all using (auth.uid() = user_id);

create policy "Users CRUD own plans" on public.coaching_plans
  for all using (auth.uid() = user_id);

create policy "Users read own progress" on public.skill_progress_daily
  for select using (auth.uid() = user_id);

create policy "Users insert own progress" on public.skill_progress_daily
  for insert with check (auth.uid() = user_id);

create policy "Users update own progress" on public.skill_progress_daily
  for update using (auth.uid() = user_id);

-- Roll up daily progress on session insert
create or replace function public.rollup_skill_progress()
returns trigger as $$
begin
  insert into public.skill_progress_daily (user_id, skill_id, date, total_hold_ms, best_hold_ms, avg_form_score, session_count)
  values (
    new.user_id,
    new.skill_id,
    (new.started_at at time zone 'utc')::date,
    new.duration_ms,
    new.duration_ms,
    new.form_score,
    1
  )
  on conflict (user_id, skill_id, date) do update set
    total_hold_ms = skill_progress_daily.total_hold_ms + excluded.total_hold_ms,
    best_hold_ms = greatest(skill_progress_daily.best_hold_ms, excluded.best_hold_ms),
    avg_form_score = (
      skill_progress_daily.avg_form_score * skill_progress_daily.session_count + excluded.avg_form_score
    ) / (skill_progress_daily.session_count + 1),
    session_count = skill_progress_daily.session_count + 1;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_rollup_progress on public.hold_sessions;
create trigger trg_rollup_progress
  after insert on public.hold_sessions
  for each row execute function public.rollup_skill_progress();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
