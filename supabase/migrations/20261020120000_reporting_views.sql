-- Internal reporting surface for a Looker Studio dashboard (acts logged,
-- pledges, signups, directory growth), to sit alongside the GA4 traffic
-- data Looker Studio already pulls in natively. Everything here is
-- read-only, pre-aggregated, and has no PII (no emails, no names, no raw
-- rows) — a dedicated low-privilege Postgres role reads only this schema,
-- never the public/auth schemas directly, so a leaked Looker Studio
-- credential exposes nothing beyond these counts.
create schema if not exists reporting;

-- =========================================
-- Acts of kindness, per day
-- =========================================
create or replace view reporting.acts_per_day as
with daily as (
  select
    created_at::date as day,
    count(*) as acts_submitted,
    count(*) filter (where status = 'published') as acts_published
  from public.acts_of_kindness
  group by 1
)
select
  day,
  acts_submitted,
  acts_published,
  sum(acts_published) over (order by day) as acts_published_running_total
from daily
order by day;

-- =========================================
-- Pledges/commitments, per day, split individual vs. organization
-- =========================================
create or replace view reporting.pledges_per_day as
with daily as (
  select
    created_at::date as day,
    type,
    count(*) as pledges,
    sum(pledge_count) as acts_pledged
  from public.commitments
  where status = 'published'
  group by 1, 2
)
select
  day,
  type,
  pledges,
  acts_pledged,
  sum(acts_pledged) over (partition by type order by day) as acts_pledged_running_total
from daily
order by day, type;

-- =========================================
-- Account signups, per day. NOTE: there's currently no stored signal for
-- which surface (website vs. app) an account was created on — both share
-- the same Supabase auth and sign-in is magic-link based, so this is a
-- combined total, not split by surface. Get-involved/ambassador form
-- submissions aren't here either: ppl-signup forwards those straight to
-- Airtable/GHL and never writes to this database (see
-- supabase/functions/ppl-signup/index.ts) — Looker Studio would need its
-- own Airtable connector for that, as a separate data source.
-- =========================================
create or replace view reporting.signups_per_day as
select
  created_at::date as day,
  count(*) as signups
from auth.users
group by 1
order by 1;

-- =========================================
-- Directory growth (ambassadors + partners), per day. directory_entries
-- and partner_entries only ever hold *current* state (sync-directory /
-- sync-partners mirror the sheet exactly, deleting rows that disappear
-- from it) — there's no history to query. This snapshots today's
-- category/status breakdown once a day via pg_cron so a trend builds up
-- going forward; there's nothing to show for days before this shipped.
-- =========================================
create table reporting.directory_snapshot_log (
  day date not null,
  source text not null check (source in ('ambassadors', 'partners')),
  category text not null,
  status text not null,
  entry_count int not null,
  primary key (day, source, category, status)
);

create or replace function reporting.snapshot_directory_counts()
returns void
language plpgsql
security definer
set search_path = public, reporting
as $$
begin
  insert into reporting.directory_snapshot_log (day, source, category, status, entry_count)
  select current_date, 'ambassadors', category, status, count(*)
  from public.directory_entries
  group by category, status
  union all
  select current_date, 'partners', category, status, count(*)
  from public.partner_entries
  group by category, status
  on conflict (day, source, category, status)
  do update set entry_count = excluded.entry_count;
end;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default — revoke
-- that so looker_studio_readonly (or anon/authenticated) can't invoke this
-- security-definer function directly, even though all it does is redo an
-- idempotent count.
revoke execute on function reporting.snapshot_directory_counts() from public;

select cron.schedule(
  'directory-snapshot-daily',
  '5 0 * * *',
  $$ select reporting.snapshot_directory_counts() $$
);

-- Run once now so the dashboard isn't empty on day one, before waiting for
-- tomorrow's cron run.
select reporting.snapshot_directory_counts();

create or replace view reporting.directory_growth as
select day, source, category, status, entry_count
from reporting.directory_snapshot_log
order by day, source, category, status;

-- =========================================
-- Read-only role for Looker Studio's PostgreSQL connector. No password is
-- set here on purpose — a plaintext password in a committed migration
-- would leak into git history. After this deploys, set one from the
-- Supabase SQL editor (never from a session that could echo it anywhere
-- persistent):
--   alter role looker_studio_readonly with password '<a long random string>';
-- =========================================
do $$ begin
  create role looker_studio_readonly with login nosuperuser nocreatedb nocreaterole noinherit connection limit 5;
exception when duplicate_object then null;
end $$;

alter role looker_studio_readonly set statement_timeout = '30s';

grant usage on schema reporting to looker_studio_readonly;
grant select on all tables in schema reporting to looker_studio_readonly;
alter default privileges in schema reporting grant select on tables to looker_studio_readonly;
