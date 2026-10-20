-- Fixes a real footgun in the first version of the reporting views: a
-- Looker Studio scorecard defaulted to SUM-aggregating
-- acts_published_running_total, and since that column is already a
-- cumulative value, summing it across N days of rows multiplied the true
-- total by roughly N (seen live: 4,994 shown instead of the real 253).
--
-- Fix is structural, not "remember to pick MAX next time": the per-day
-- views no longer carry a running-total column at all — a trend chart that
-- wants a cumulative line can use Looker Studio's own "Running" aggregation
-- on the plain daily number instead of a stored one. For "what's the
-- current total" style scorecards, use this new single-row view instead:
-- SUM/MAX/AVG of exactly one row are all the same value, so there's no
-- aggregation choice left to get wrong.
-- create or replace view can only append columns, not drop them — these two
-- need a real drop+recreate since acts_published_running_total /
-- acts_pledged_running_total are going away, not just changing.
drop view if exists reporting.acts_per_day;
create view reporting.acts_per_day as
select
  created_at::date as day,
  count(*) as acts_submitted,
  count(*) filter (where status = 'published') as acts_published
from public.acts_of_kindness
group by 1
order by 1;

grant select on reporting.acts_per_day to looker_studio_readonly;

drop view if exists reporting.pledges_per_day;
create view reporting.pledges_per_day as
select
  created_at::date as day,
  type,
  count(*) as pledges,
  sum(pledge_count) as acts_pledged
from public.commitments
where status = 'published'
group by 1, 2
order by 1, 2;

grant select on reporting.pledges_per_day to looker_studio_readonly;

create or replace view reporting.totals_summary as
select
  (select count(*) from public.acts_of_kindness) as acts_submitted_total,
  (select count(*) from public.acts_of_kindness where status = 'published') as acts_published_total,
  (select count(*) from public.commitments where status = 'published') as pledges_total,
  (select count(*) from public.commitments where status = 'published' and type = 'individual') as individual_pledges_total,
  (select count(*) from public.commitments where status = 'published' and type = 'organization') as organization_pledges_total,
  (select coalesce(sum(pledge_count), 0) from public.commitments where status = 'published') as acts_pledged_total,
  (select count(*) from auth.users) as signups_total;

grant select on reporting.totals_summary to looker_studio_readonly;
