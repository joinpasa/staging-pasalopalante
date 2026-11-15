-- Where pledges come from, for the Kindness Hub's results.
--
-- The pledge form now sends the campaign tags of the link a visitor arrived by (utm_source and
-- friends) or the site that sent them, and submit-commitment keeps them on the pledge. Nothing
-- personal: only the tags in a link and a site's name. Older pledges simply have none.
--
-- The hub reads pledges only as daily and per-source totals, through the two functions below,
-- and only for hub members. No name, email or message ever leaves this table through them.

alter table public.commitments
  add column if not exists utm_source text check (utm_source is null or char_length(utm_source) <= 100),
  add column if not exists utm_medium text check (utm_medium is null or char_length(utm_medium) <= 100),
  add column if not exists utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 100),
  add column if not exists utm_content text check (utm_content is null or char_length(utm_content) <= 100),
  add column if not exists referrer_host text check (referrer_host is null or char_length(referrer_host) <= 200);

-- Pledges per day, in Puerto Rico time: people who pledged, the acts they pledged, organisations,
-- and how many pledged in Spanish.
create or replace function public.hub_pledges(_days integer default 60)
returns table (day date, people integer, acts bigint, orgs integer, spanish integer)
language sql stable security definer set search_path = public as $$
  select (c.created_at at time zone 'America/Puerto_Rico')::date as day,
         (count(*) filter (where c.type = 'individual'))::integer as people,
         coalesce(sum(c.pledge_count) filter (where c.type = 'individual'), 0)::bigint as acts,
         (count(*) filter (where c.type = 'organization'))::integer as orgs,
         (count(*) filter (where c.language = 'es'))::integer as spanish
  from public.commitments c
  where public.is_hub_member(auth.uid())
    and c.status = 'published'
    and c.created_at >= now() - make_interval(days => least(greatest(coalesce(_days, 60), 1), 400))
  group by 1
  order by 1
$$;

-- Pledges by where they came from, for the last _days days.
create or replace function public.hub_pledge_sources(_days integer default 30)
returns table (source text, medium text, campaign text, content text, people integer, acts bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(c.utm_source, c.referrer_host, 'not tracked') as source,
         coalesce(c.utm_medium, case when c.referrer_host is not null then 'referral' end, '') as medium,
         coalesce(c.utm_campaign, '') as campaign,
         coalesce(c.utm_content, '') as content,
         count(*)::integer as people,
         coalesce(sum(c.pledge_count), 0)::bigint as acts
  from public.commitments c
  where public.is_hub_member(auth.uid())
    and c.status = 'published'
    and c.type = 'individual'
    and c.created_at >= now() - make_interval(days => least(greatest(coalesce(_days, 30), 1), 400))
  group by 1, 2, 3, 4
  order by people desc
$$;

revoke all on function public.hub_pledges(integer) from public, anon;
revoke all on function public.hub_pledge_sources(integer) from public, anon;
grant execute on function public.hub_pledges(integer) to authenticated;
grant execute on function public.hub_pledge_sources(integer) to authenticated;
