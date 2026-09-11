-- Aggregate per-contact totals (acts submitted + pledges committed) keyed by
-- email, for syncing into GoHighLevel's {{contact.total_acts_of_kindness_submitted}}
-- and {{contact.total_of_committed_pledge}} custom fields. Keyed by email rather
-- than user_id because a GHL contact is identified by email, and covers both
-- signed-in submissions (acts_of_kindness.email is back-filled from the
-- authenticated user at submit time — see submit-act/index.ts) and guest
-- submissions, which only ever have an email.
--
-- service_role only: this reads across all users' data, not something any
-- individual user or the anon key should ever be able to call.

create or replace function public.ghl_totals_for_email(_email text)
returns table (acts_count bigint, pledge_total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.acts_of_kindness
      where status = 'published' and lower(email) = lower(_email)) as acts_count,
    (select coalesce(sum(pledge_count), 0) from public.commitments
      where lower(email) = lower(_email)) as pledge_total;
$$;

revoke all on function public.ghl_totals_for_email(text) from public, anon, authenticated;
grant execute on function public.ghl_totals_for_email(text) to service_role;

create or replace function public.ghl_totals_by_email(_limit int default 200, _offset int default 0)
returns table (email text, acts_count bigint, pledge_total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with emails as (
    select lower(email) as email from public.acts_of_kindness where email is not null and email <> ''
    union
    select lower(email) as email from public.commitments where email is not null and email <> ''
  )
  select
    e.email,
    coalesce(a.acts_count, 0) as acts_count,
    coalesce(c.pledge_total, 0) as pledge_total
  from emails e
  left join (
    select lower(email) as email, count(*) as acts_count
    from public.acts_of_kindness
    where status = 'published' and email is not null and email <> ''
    group by lower(email)
  ) a on a.email = e.email
  left join (
    select lower(email) as email, sum(pledge_count) as pledge_total
    from public.commitments
    where email is not null and email <> ''
    group by lower(email)
  ) c on c.email = e.email
  order by e.email
  limit _limit offset _offset;
$$;

revoke all on function public.ghl_totals_by_email(int, int) from public, anon, authenticated;
grant execute on function public.ghl_totals_by_email(int, int) to service_role;
