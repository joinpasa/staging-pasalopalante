-- =========================================================================================
-- Partners Hub: one open link to join (26 Nov 2026)
--
-- partners.passkindnessforward.com/join is one link anyone can be sent. They choose whether
-- they're an organisation, a company or an ambassador, fill in every detail, and we email their
-- own join link (the partner-auth function, action "self_join"). Clicking it from their inbox is
-- what proves the email is theirs, so until then they aren't shown to other members.
-- =========================================================================================

alter table public.partners
  add column if not exists joined_via text check (joined_via is null or joined_via in ('open_link'));

grant select (joined_via) on public.partners to authenticated;

-- Same as before, plus each member's joinedVia, so Community can leave out open-link sign-ups
-- that haven't confirmed their email yet.
create or replace function public.partner_hub_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.partner_hub_reader(auth.uid()) then raise exception 'sign in first' using errcode = '42501'; end if;
  return jsonb_build_object(
    'pledgers', coalesce((
      select jsonb_agg(jsonb_build_object('country', c.country, 'people', c.people) order by c.people desc)
        from (select btrim(country) as country, count(*)::int as people
                from public.commitments
               where coalesce(btrim(country), '') <> '' and partner_sheet_id is null
                 and coalesce(type, '') <> 'organization'
                 and coalesce(status, 'published') not in ('rejected', 'removed', 'deleted')
               group by 1) c), '[]'::jsonb),
    'partners', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.name, 'orgType', p.org_type, 'country', p.country, 'region', p.region,
               'city', p.city, 'logoPath', p.logo_path, 'entryLogo', e.logo_url,
               'acts', coalesce((select sum(s.people_count) from public.partner_submissions s
                                  where s.partner_id = p.id and s.status <> 'rejected'), 0),
               'joined', p.account_user_id is not null,
               'joinedVia', p.joined_via) order by lower(p.name))
        from public.partners p left join public.partner_entries e on e.id = p.sheet_entry_id), '[]'::jsonb),
    'actsLogged', coalesce((select sum(people_count) from public.partner_submissions where status <> 'rejected'), 0),
    'posts', (select count(*) from public.partner_posts where audience = 'community' and hidden_at is null),
    'listedPartners', (select count(*) from public.partner_entries where status = 'Approved'),
    'pledgedActs', coalesce((select sum(pledge_count) from public.commitments where coalesce(status, 'published') = 'published'), 0)
  );
end;
$$;
