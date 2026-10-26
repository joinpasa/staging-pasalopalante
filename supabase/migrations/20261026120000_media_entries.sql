-- Press coverage shown on /media. Replaces the hardcoded lists in
-- apps/website/src/data/mediaCoverage.ts (which stays as the page's
-- fallback if this read fails): this table is mirrored wholesale from the
-- "PKF_Media" Google Sheet by a time-driven Apps Script trigger bound to
-- that sheet, via the sync-media edge function — same mirror pattern as
-- partner_entries / sync-partners.
--
-- One row per press item. `section` decides where it shows on the page
-- (Articles, Digital Press, Videos, Social, Broadcast, Other Outlets);
-- Broadcast / Other Outlets rows only use `outlet` (shown as plain chips).
--
-- Every sync sends a full snapshot of every data row: rows present are
-- upserted, rows no longer present are deleted. Visibility is status-gated,
-- not sync-gated — every row is stored regardless of status, and the
-- public-read policy below only exposes status = 'Approved'.
create table public.media_entries (
  id text primary key,
  section text not null,
  status text not null,
  featured boolean not null default false,
  outlet text not null,
  title text,
  url text,
  type text not null default 'article',
  image_url text,
  description_en text,
  description_es text,
  note text,
  sort_order numeric,
  synced_at timestamptz not null default now()
);

create index media_entries_section_idx on public.media_entries (section);

alter table public.media_entries enable row level security;

create policy "Public can view approved media entries"
on public.media_entries for select
using (status = 'Approved');

-- No insert/update/delete policy for anon/authenticated — only sync-media
-- (service role) writes.
revoke all on public.media_entries from anon, authenticated;
grant select on public.media_entries to anon, authenticated;

-- =========================================
-- Logo / thumbnail bucket for /media cards: public read, no public write.
-- The team uploads through the Supabase dashboard (Storage → media-images)
-- and pastes the file's public URL into the sheet's "Image URL" column.
-- =========================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-images', 'media-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "Public can view media images"
on storage.objects for select
using (bucket_id = 'media-images');
