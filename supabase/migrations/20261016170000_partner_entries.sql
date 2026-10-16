-- Partners directory shown on /partners. Replaces the old hardcoded data
-- in PartnersPage.tsx: this table is mirrored wholesale from the
-- "PKF_Partners" Google Sheet (one row per organization or PR municipality)
-- by a time-driven Apps Script trigger bound to that sheet, via the
-- sync-partners edge function — same mirror pattern as the ambassadors
-- directory's directory_entries / sync-directory.
--
-- Unlike the ambassadors sheet (one tab per category, category = tab name),
-- the partners sheet uses an explicit Category column instead, since the
-- team may keep everything on one tab or split it into per-category tabs
-- later — either way, a row's own Category column is what's read and
-- synced here, never its tab name.
--
-- This is an org directory, not a people directory, so there's no
-- Email/personal-data column to exclude the way the ambassadors sheet has
-- (Internal Notes still never syncs, simply because it's not a public
-- field, not because it's sensitive).
--
-- Every sync sends a full snapshot of every data row: rows present are
-- upserted, rows no longer present are deleted. Visibility is status-gated,
-- not sync-gated — every row is stored here regardless of status, and the
-- public-read policy below only exposes status = 'Approved', so flipping a
-- row's status in the sheet changes what's public on the next sync with no
-- code change.
create table public.partner_entries (
  id text primary key,
  category text not null,
  status text not null,
  name text not null,
  logo_url text,
  website text,
  facebook text,
  role text,
  dark boolean not null default false,
  sort_order numeric,
  synced_at timestamptz not null default now()
);

create index partner_entries_category_idx on public.partner_entries (category);

alter table public.partner_entries enable row level security;

create policy "Public can view approved partner entries"
on public.partner_entries for select
using (status = 'Approved');

-- No insert/update/delete policy for anon/authenticated — only sync-partners
-- (service role) writes.
revoke all on public.partner_entries from anon, authenticated;
grant select on public.partner_entries to anon, authenticated;
