-- 1) Fix partner photo/video uploads being refused for every file.
--
-- The partner-media storage policies checked ownership with a subquery on
-- public.partners.account_user_id — but clients only have column-level
-- SELECT on a few partners columns (not account_user_id), so the subquery
-- itself raised "permission denied" and every upload failed. Ownership is
-- now checked by a SECURITY DEFINER helper that never exposes the column.
create or replace function public.partner_owns_media_path(_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partners p
     where p.account_user_id = auth.uid()
       and p.id::text = split_part(_name, '/', 1)
  )
$$;

revoke execute on function public.partner_owns_media_path(text) from public, anon;
grant execute on function public.partner_owns_media_path(text) to authenticated;

drop policy if exists "Partner account can upload its own media" on storage.objects;
drop policy if exists "Partner account can read its own media" on storage.objects;
drop policy if exists "Partner account can remove its own media" on storage.objects;

create policy "Partner account can upload its own media"
on storage.objects for insert to authenticated
with check (bucket_id = 'partner-media' and public.partner_owns_media_path(name));

create policy "Partner account can read its own media"
on storage.objects for select to authenticated
using (bucket_id = 'partner-media' and public.partner_owns_media_path(name));

create policy "Partner account can remove its own media"
on storage.objects for delete to authenticated
using (bucket_id = 'partner-media' and public.partner_owns_media_path(name));

-- 2) A social post link per act (YouTube/Instagram/Facebook/TikTok/X/…),
--    shown on the Wall when approved, and a marker for acts an organization
--    edited after "Needs Changes" so the review sheet can flag them.
alter table public.partner_submissions
  add column if not exists link_url text
    check (link_url is null or (length(link_url) <= 500 and link_url ~* '^https?://')),
  add column if not exists resubmitted_at timestamptz;
