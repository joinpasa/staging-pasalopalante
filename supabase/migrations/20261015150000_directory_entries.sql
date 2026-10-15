-- Ambassadors/Champions directory shown on /ambassadors. Replaces the old
-- Ambassador Kit form as the page's data source: this table is instead
-- mirrored wholesale from the "PKF_Directory" Google Sheet (one tab per
-- category — Champions, Global Ambassadors, Regional Leads, Country
-- Ambassadors, PR Regional Ambassadors, Europe Sprint Ambassadors, Education
-- Leads) by a time-driven Apps Script trigger bound to that sheet, via the
-- sync-directory edge function.
--
-- Every sync sends a full snapshot of every directory tab (minus the sheet's
-- Email and Internal Notes columns, which never leave the sheet at all), and
-- sync-directory mirrors it exactly: rows present are upserted, rows no
-- longer present in the sheet are deleted. `id` is the sheet's own row ID
-- (e.g. "CH-001", "GA-021") — globally unique since every tab uses its own
-- prefix — so the same person appearing in two tabs (e.g. both Global
-- Ambassadors and Country Ambassadors) is simply two separate rows and shows
-- up under both categories, no special-casing needed.
--
-- Visibility is status-gated, not sync-gated: every row the sheet contains is
-- stored here regardless of status, and the public-read policy below only
-- exposes status = 'Approved'. Flipping a row between Approved/Pending/Hidden
-- in the sheet changes what the public sees on the very next sync, with no
-- code change — exactly the "dashboard" behavior the team asked for.
create table public.directory_entries (
  id text primary key,
  category text not null,
  status text not null,
  name text not null,
  handle text,
  designation text,
  subcategory text,
  country text,
  region text,
  image_url text,
  bio text,
  social_link text,
  sort_order numeric,
  synced_at timestamptz not null default now()
);

create index directory_entries_category_idx on public.directory_entries (category);

alter table public.directory_entries enable row level security;

create policy "Public can view approved directory entries"
on public.directory_entries for select
using (status = 'Approved');

-- No insert/update/delete policy for anon/authenticated — only sync-directory
-- (service role) writes.
revoke all on public.directory_entries from anon, authenticated;
grant select on public.directory_entries to anon, authenticated;
