-- Dashboard queries: recent sessions per user, ordered by time.
create index if not exists idx_hold_sessions_user_started
  on public.hold_sessions(user_id, started_at desc);

-- Coaching plan lookups by (user, skill) already use the unique constraint;
-- daily progress is ordered by date within a user/skill.
create index if not exists idx_progress_user_skill_date
  on public.skill_progress_daily(user_id, skill_id, date);
