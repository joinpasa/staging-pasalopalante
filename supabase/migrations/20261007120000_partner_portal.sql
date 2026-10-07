-- Partner portal (apps/partners, partners.pasalopalante.com).
--
-- One auth account per partner (school/org), many Staff IDs. Each partner
-- has a single Supabase auth user (partners.account_user_id) that nobody
-- ever signs into with an email or password — the partner-auth edge
-- function creates it on first use. Staff join through the partner's
-- invite link (enter their name, get a generated Staff ID) and log in by
-- picking their school + typing that Staff ID; partner-auth checks the pair
-- and hands back a one-time token for the school's account. Removing
-- someone = setting their partner_staff.active to false.
--
-- Partners are deliberately NOT the existing organizations/org_members
-- tables: those are self-serve (anyone can create or join a group from the
-- commit form), so membership there proves nothing.
--
-- Adding a partner (PPL team, Supabase SQL editor):
--   insert into public.partners (name, city, pledge_goal)
--   values ('Escuela Esperanza', 'San Juan, Puerto Rico', 1000)
--   returning invite_token;
-- then send them https://partners.pasalopalante.com/join/<invite_token>.
--
-- Submissions: partner-submit saves rows here (status pending) and appends
-- them to the review Google Sheet. Changing the Status column in the sheet
-- calls partner-review, which updates the row and — on Approved — publishes
-- it to the Wall as a normal acts_of_kindness row.

-- Short human-typeable codes. No 0/O/1/I/L so they survive being read out
-- loud or copied off a sticky note.
create or replace function public.gen_partner_code(_len int)
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  rand bytea := gen_random_bytes(_len);
  code text := '';
begin
  for i in 0.._len - 1 loop
    code := code || substr(alphabet, (get_byte(rand, i) % length(alphabet)) + 1, 1);
  end loop;
  return code;
end;
$$;

revoke execute on function public.gen_partner_code(int) from public, anon, authenticated;

create or replace function public.normalize_partner_code(_code text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- =========================================
-- partners + partner_staff
-- =========================================
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  city text,
  pledge_goal integer not null default 0 check (pledge_goal >= 0),
  invite_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  account_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.partner_staff (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  -- bcrypt hash of the Staff ID; the plain ID is only ever shown once.
  code_hash text not null,
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create index partner_staff_partner_id_idx on public.partner_staff (partner_id);

-- "Is this auth user the given partner's school account?"
create or replace function public.is_partner_account(_user_id uuid, _partner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partners where id = _partner_id and account_user_id = _user_id)
$$;

alter table public.partners enable row level security;
alter table public.partner_staff enable row level security;

create policy "Partner account and admins can view the partner"
on public.partners for select to authenticated
using (account_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Partner account and admins can view staff"
on public.partner_staff for select to authenticated
using (public.is_partner_account(auth.uid(), partner_id) or public.has_role(auth.uid(), 'admin'::public.app_role));

-- All writes go through edge functions (service role). invite_token and
-- code_hash are never readable from a client.
revoke all on public.partners from anon, authenticated;
grant select (id, name, city, pledge_goal, created_at) on public.partners to authenticated;
revoke all on public.partner_staff from anon, authenticated;
grant select (id, partner_id, name, active, last_login_at, created_at) on public.partner_staff to authenticated;

-- Login screen's school search. Public on purpose (the login screen needs
-- it before anyone is signed in) — returns names and cities only.
create or replace function public.search_partners(_q text)
returns table (id uuid, name text, city text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.city
    from public.partners p
   where length(trim(coalesce(_q, ''))) >= 2
     and (p.name ilike '%' || trim(_q) || '%' or coalesce(p.city, '') ilike '%' || trim(_q) || '%')
   order by p.name
   limit 8
$$;

-- Join screen: which school does this invite link belong to?
create or replace function public.partner_invite_info(_token text)
returns table (id uuid, name text, city text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.city from public.partners p where p.invite_token = trim(_token)
$$;

revoke execute on function public.search_partners(text) from public;
grant execute on function public.search_partners(text) to anon, authenticated;
revoke execute on function public.partner_invite_info(text) from public;
grant execute on function public.partner_invite_info(text) to anon, authenticated;

-- =========================================
-- Staff ID helpers (service role only — called from partner-auth)
-- =========================================
create or replace function public.partner_staff_create(_partner_id uuid, _name text)
returns table (staff_id uuid, staff_code text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  plain text := public.gen_partner_code(8);
  new_id uuid;
begin
  insert into public.partner_staff (partner_id, name, code_hash)
  values (_partner_id, trim(_name), crypt(plain, gen_salt('bf')))
  returning id into new_id;
  return query select new_id, plain;
end;
$$;

create or replace function public.partner_verify_staff(_partner_id uuid, _staff_code text)
returns table (staff_id uuid, staff_name text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  code text := public.normalize_partner_code(_staff_code);
begin
  return query
    select s.id, s.name
      from public.partner_staff s
     where s.partner_id = _partner_id
       and s.active
       and s.code_hash = crypt(code, s.code_hash)
     limit 1;
end;
$$;

revoke execute on function public.partner_staff_create(uuid, text) from public, anon, authenticated;
revoke execute on function public.partner_verify_staff(uuid, text) from public, anon, authenticated;
grant execute on function public.partner_staff_create(uuid, text) to service_role;
grant execute on function public.partner_verify_staff(uuid, text) to service_role;

-- Failed Staff ID attempts, for rate limiting partner-auth. Service role only.
create table public.partner_login_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  attempted_at timestamptz not null default now()
);
create index partner_login_attempts_key_time_idx on public.partner_login_attempts (key, attempted_at);
alter table public.partner_login_attempts enable row level security;
revoke all on public.partner_login_attempts from anon, authenticated;

-- =========================================
-- Submissions (Log 1 Act / Bulk Log)
-- =========================================
create table public.partner_submissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  staff_id uuid references public.partner_staff(id) on delete set null,
  -- Rows submitted together from one Bulk Log share a batch_id.
  batch_id uuid not null default gen_random_uuid(),
  description text not null check (length(trim(description)) between 1 and 1000),
  people_count integer not null default 1 check (people_count between 1 and 100000),
  act_date date not null,
  -- [{ "path": "<partner_id>/...", "type": "image" | "video", "name": "cards.jpg" }]
  media jsonb not null default '[]'::jsonb,
  media_consent boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  review_note text,
  reviewed_at timestamptz,
  -- The Wall row created on approval (unpublished again if un-approved).
  act_id uuid references public.acts_of_kindness(id) on delete set null,
  sheet_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index partner_submissions_partner_created_idx on public.partner_submissions (partner_id, created_at desc);
create index partner_submissions_unsynced_idx on public.partner_submissions (created_at) where sheet_synced_at is null;

alter table public.partner_submissions enable row level security;

create policy "Partner account and admins can view submissions"
on public.partner_submissions for select to authenticated
using (public.is_partner_account(auth.uid(), partner_id) or public.has_role(auth.uid(), 'admin'::public.app_role));

-- Inserts go through partner-submit (validates, then appends to the sheet);
-- status changes only through partner-review.
revoke all on public.partner_submissions from anon, authenticated;
grant select on public.partner_submissions to authenticated;

-- =========================================
-- Media bucket: private, one folder per partner
-- =========================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partner-media', 'partner-media', false, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;

create policy "Partner account can upload its own media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'partner-media'
  and exists (
    select 1 from public.partners p
     where p.account_user_id = auth.uid()
       and p.id::text = (storage.foldername(name))[1]
  )
);

create policy "Partner account can read its own media"
on storage.objects for select to authenticated
using (
  bucket_id = 'partner-media'
  and exists (
    select 1 from public.partners p
     where p.account_user_id = auth.uid()
       and p.id::text = (storage.foldername(name))[1]
  )
);

create policy "Partner account can remove its own media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'partner-media'
  and exists (
    select 1 from public.partners p
     where p.account_user_id = auth.uid()
       and p.id::text = (storage.foldername(name))[1]
  )
);

revoke execute on function public.is_partner_account(uuid, uuid) from public, anon;
grant execute on function public.is_partner_account(uuid, uuid) to authenticated;
