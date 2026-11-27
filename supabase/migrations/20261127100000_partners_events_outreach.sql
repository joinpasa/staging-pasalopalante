-- =========================================================================================
-- Partners Hub: an outreach shelf in the kit, and events the team can add (27 Nov 2026)
--
-- 1. Kit items can sit in a new 'outreach' section: letter templates ambassadors download and
--    adapt to invite people in (recruitment) and to welcome them once they say yes (onboarding),
--    for the four pillars: education, media, kindness champions and organisations. The team
--    uploads them from the Kindness Hub (Partners Hub page, Kit tab) like any other kit file.
--
-- 2. partner_events: events the team adds for members to see on the hub's Events tab, next to
--    the season's own moments and the international days (those two live in the app's code).
--    Members read them; only the team adds, changes or hides them, the same rules as the kit.
-- =========================================================================================

-- ---------- 1. the outreach section ----------

alter table public.partner_kit_items drop constraint if exists partner_kit_items_section_check;
alter table public.partner_kit_items add constraint partner_kit_items_section_check
  check (section in ('start', 'social', 'profile', 'print', 'email', 'logos', 'video', 'other', 'outreach'));

-- ---------- 2. events from the team ----------

create table if not exists public.partner_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  title_es text check (title_es is null or length(title_es) <= 160),
  details text check (details is null or length(details) <= 600),
  details_es text check (details_es is null or length(details_es) <= 600),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  -- a time as people would write it ("6 PM Puerto Rico time"), kept as text on purpose
  time_text text check (time_text is null or length(time_text) <= 80),
  -- where: "Online", "San Juan, Puerto Rico"; a country (the site's English name) marks it near
  -- members in that country
  place text check (place is null or length(place) <= 160),
  country text check (country is null or length(country) <= 80),
  url text check (url is null or url ~* '^https?://'),
  audience text not null default 'all' check (audience in ('all', 'organisation', 'company', 'ambassador')),
  hidden boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.partner_events enable row level security;

drop policy if exists "Partners see events; the team sees all" on public.partner_events;
create policy "Partners see events; the team sees all"
on public.partner_events for select to authenticated
using (public.is_hub_member(auth.uid()) or (not hidden and public.is_partner_user(auth.uid())));

drop policy if exists "Team manages events" on public.partner_events;
create policy "Team manages events"
on public.partner_events for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

revoke all on public.partner_events from anon, authenticated;
grant select, insert, update, delete on public.partner_events to authenticated;

create index if not exists partner_events_starts_on on public.partner_events (starts_on);
