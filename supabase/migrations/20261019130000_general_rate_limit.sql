-- Generalizes the per-endpoint rate-limit pattern (originally one-off per
-- function, as in check_and_log_photo_upload /
-- 20260914140000_photo_upload_rate_limit.sql) into one shared table + RPC
-- that any public edge function can call with its own bucket name, key,
-- max, and window — used by submit-act, submit-commitment and ppl-signup.
-- sign-photo-upload's own original implementation is intentionally left
-- as-is here, not migrated onto this.
create table public.rate_limit_log (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_log_bucket_key_created_idx
  on public.rate_limit_log (bucket, key, created_at desc);

alter table public.rate_limit_log enable row level security;

do $$ begin
  create policy "Service role can manage rate limit log"
    on public.rate_limit_log for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
exception when duplicate_object then null;
end $$;

create or replace function public.check_and_log_rate_limit(
  p_bucket text, p_key text, p_max int, p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
    from public.rate_limit_log
   where bucket = p_bucket
     and key = p_key
     and created_at > now() - make_interval(secs => p_window_seconds);

  if recent_count >= p_max then
    return false;
  end if;

  insert into public.rate_limit_log (bucket, key) values (p_bucket, p_key);
  return true;
end;
$$;

revoke execute on function public.check_and_log_rate_limit(text, text, int, int) from public;
grant execute on function public.check_and_log_rate_limit(text, text, int, int) to service_role;

-- Hourly cleanup instead of the opportunistic per-call DELETE the
-- photo-upload version uses — this table is shared across several buckets
-- with much higher call volume (every submit-act/submit-commitment/
-- ppl-signup request, not just photo uploads), so deleting on every single
-- call would mean a lot more DELETE churn than one job running on its own
-- schedule. pg_cron is already enabled in this project (see
-- 20260511014929_email_infra.sql).
select cron.schedule(
  'rate-limit-log-cleanup',
  '0 * * * *',
  $$ delete from public.rate_limit_log where created_at < now() - interval '24 hours' $$
);

-- submit-act now uses the generalized table/RPC above instead of its own
-- (act_submit_log / check_and_log_act_submit, added one commit ago in
-- 20261019120000_submit_act_rate_limit.sql) — that table is now unused,
-- so it's dropped here rather than left orphaned.
drop function if exists public.check_and_log_act_submit(text, int, int);
drop table if exists public.act_submit_log;
