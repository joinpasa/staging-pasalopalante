-- Global Ambassadors directory. Synced from the "Ambassador Kit" Google Sheet
-- by the sync-ambassador edge function, called from the Apps Script form
-- (Code.gs) right after a submission is saved, and again once the badge PNG
-- is generated. Never stores the ambassador's email in a readable form — only
-- a one-way hash, used solely as the upsert key so a resubmission updates
-- the same row instead of creating a duplicate, matching the design note on
-- the directory page ("Never Email") and keeping that true even if a future
-- RLS policy mistake ever widened read access.
create table public.ambassadors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email_hash text not null unique,
  name text not null,
  country text not null,
  region text,
  role text not null,
  photo_url text,
  instagram text,
  facebook text,
  tiktok text,
  other_social text,
  website text,
  badge_url text,
  status text not null default 'published'
);

create trigger ambassadors_touch_updated_at
before update on public.ambassadors
for each row execute function public.touch_updated_at();

alter table public.ambassadors enable row level security;

create policy "Public can view published ambassadors"
on public.ambassadors for select
using (status = 'published');

-- No insert/update/delete policy for anon/authenticated — only sync-ambassador
-- (service role) writes.
revoke all on public.ambassadors from anon, authenticated;
grant select on public.ambassadors to anon, authenticated;

-- =========================================
-- Photo bucket: public read (shown on the directory page), no public write —
-- only sync-ambassador (service role) uploads.
-- =========================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ambassador-photos', 'ambassador-photos', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Public can view ambassador photos"
on storage.objects for select
using (bucket_id = 'ambassador-photos');
