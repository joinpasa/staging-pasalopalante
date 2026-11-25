-- Partners Hub welcome email (25 Nov 2026): every new member gets one email with their link, sent by
-- the hub (supabase/functions/_shared/partnerWelcome.ts), once. This records when.
alter table public.partners add column if not exists welcome_sent_at timestamptz;

-- hub_partners() also hands the team the welcome date (its result type changes, so it is recreated).
drop function if exists public.hub_partners();

-- Everything the team needs about each organisation in the hub, including its invite link.
create or replace function public.hub_partners()
returns table (
  id uuid, name text, org_type text, city text, country text, region text, contact_email text, contact_name text,
  logo_path text, entry_logo_url text, website text, pledge_goal integer, pledge_waiting bigint,
  staff integer, joined boolean, last_login timestamptz, acts bigint, posts integer, last_post timestamptz,
  invite_url text, profile_updated_at timestamptz, created_at timestamptz, welcome_sent_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_hub_member(auth.uid()) then raise exception 'hub members only' using errcode = '42501'; end if;
  return query
  select p.id, p.name, p.org_type, p.city, p.country, p.region, p.contact_email, p.contact_name,
         p.logo_path, e.logo_url, coalesce(p.website, e.website), p.pledge_goal,
         coalesce((select sum(a.amount) from public.partner_pledge_adds a where a.partner_id = p.id and a.counted_at is null), 0),
         (select count(*)::int from public.partner_staff s where s.partner_id = p.id and s.active),
         p.account_user_id is not null,
         (select max(s.last_login_at) from public.partner_staff s where s.partner_id = p.id),
         coalesce((select sum(s.people_count) from public.partner_submissions s where s.partner_id = p.id and s.status <> 'rejected'), 0),
         (select count(*)::int from public.partner_posts x where x.partner_id = p.id),
         (select max(x.created_at) from public.partner_posts x where x.partner_id = p.id),
         'https://partners.passkindnessforward.com/join/' || p.invite_token,
         p.profile_updated_at, p.created_at, p.welcome_sent_at
    from public.partners p
    left join public.partner_entries e on e.id = p.sheet_entry_id
   order by lower(p.name);
end;
$$;

revoke execute on function public.hub_partners() from public, anon;
grant execute on function public.hub_partners() to authenticated;
