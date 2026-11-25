-- =========================================================================================
-- Partners Hub (25 Nov 2026)
--
-- The partner portal at partners.passkindnessforward.com grows into the Partners Hub:
--   * a profile per organisation (logo, country, region, links, about, contact person)
--   * pledge additions made from the hub (the sheet stays the source of pledge_goal)
--   * a community feed (posts, hearts, comments) and "Share with us" for the team only,
--     both carrying the consent partners give when they send something
--   * weekly updates from the team, and the partner kit to download
--   * sign-in links by email for an organisation's contact person
--
-- Partner screens sign in as their organisation's one account (see partner-auth). Each person is
-- a partner_staff row the browser remembers; functions below check that row belongs to the
-- organisation of the account calling them. The team works from the Kindness Hub as hub members.
-- =========================================================================================

-- ---------- helpers ----------

-- The partner (organisation) whose account is signed in, or null.
create or replace function public.partner_of(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.id from public.partners p where _user_id is not null and p.account_user_id = _user_id
$$;

create or replace function public.is_partner_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.partner_of(_user_id) is not null
$$;

-- Is this person (staff row) an active member of this organisation?
create or replace function public.partner_staff_ok(_partner_id uuid, _staff_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partner_staff s where s.id = _staff_id and s.partner_id = _partner_id and s.active)
$$;

-- Who may see hub-wide partner data: partner accounts and the team.
create or replace function public.partner_hub_reader(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_partner_user(_user_id) or public.is_hub_member(_user_id)
$$;

-- ---------- 1. profile and the three kinds of member ----------

-- Members come in three kinds, each with its own kit and wording:
--   organisations (school, ngo, faith, government, community, other), companies (company), and
--   ambassadors (ambassador): one person, joining the same way, as a "team" of one.
alter table public.partners drop constraint if exists partners_org_type_check;
alter table public.partners add constraint partners_org_type_check
  check (org_type is null or org_type in ('school', 'ngo', 'company', 'faith', 'government', 'community', 'other', 'ambassador'));

-- 'organisation' | 'company' | 'ambassador'
create or replace function public.member_kind(_org_type text)
returns text language sql immutable as $$
  select case _org_type when 'company' then 'company' when 'ambassador' then 'ambassador' else 'organisation' end
$$;

alter table public.partners
  add column if not exists logo_path text check (logo_path is null or length(logo_path) <= 300),
  add column if not exists country text check (country is null or length(country) <= 80),
  add column if not exists region text check (region is null or length(region) <= 120),
  add column if not exists website text check (website is null or website ~* '^https?://'),
  add column if not exists instagram text check (instagram is null or length(instagram) <= 200),
  add column if not exists facebook text check (facebook is null or length(facebook) <= 300),
  add column if not exists linkedin text check (linkedin is null or length(linkedin) <= 300),
  add column if not exists about text check (about is null or length(about) <= 600),
  add column if not exists contact_name text check (contact_name is null or length(contact_name) <= 120),
  add column if not exists profile_updated_at timestamptz;

grant select (org_type, logo_path, country, region, website, instagram, facebook, linkedin, about, contact_name, profile_updated_at)
  on public.partners to authenticated;

create policy "Hub members can view partners"
on public.partners for select to authenticated
using (public.is_hub_member(auth.uid()));

-- A sign-in link's email lives with the person it belongs to. Never readable from a client.
alter table public.partner_staff add column if not exists email text
  check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- ---------- 2. pledge additions ----------

create table public.partner_pledge_adds (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  staff_id uuid references public.partner_staff (id) on delete set null,
  amount integer not null check (amount between 1 and 10000000),
  note text check (note is null or length(note) <= 300),
  -- set by the team once the new total is in the PKF_Partners sheet (the sheet sets pledge_goal)
  counted_at timestamptz,
  created_at timestamptz not null default now()
);
create index partner_pledge_adds_partner_idx on public.partner_pledge_adds (partner_id, created_at desc);
alter table public.partner_pledge_adds enable row level security;

create policy "Partner and team can see pledge additions"
on public.partner_pledge_adds for select to authenticated
using (public.is_partner_account(auth.uid(), partner_id) or public.is_hub_member(auth.uid()));

create policy "Team can mark pledge additions as counted"
on public.partner_pledge_adds for update to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

revoke all on public.partner_pledge_adds from anon, authenticated;
grant select on public.partner_pledge_adds to authenticated;
grant update (counted_at) on public.partner_pledge_adds to authenticated;

-- What the signed-in organisation sees about itself.
create or replace function public.partner_me()
returns table (
  id uuid, name text, city text, org_type text, country text, region text, website text,
  instagram text, facebook text, linkedin text, about text, contact_name text,
  logo_path text, entry_logo_url text, pledge_goal integer, pledge_added bigint, pledge_total bigint,
  profile_updated_at timestamptz, joined_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.city, p.org_type, p.country, p.region, coalesce(p.website, e.website), p.instagram,
         coalesce(p.facebook, e.facebook), p.linkedin, p.about, p.contact_name,
         p.logo_path, e.logo_url, p.pledge_goal,
         coalesce(a.added, 0), p.pledge_goal + coalesce(a.added, 0),
         p.profile_updated_at, p.created_at
    from public.partners p
    left join public.partner_entries e on e.id = p.sheet_entry_id
    left join lateral (
      select sum(x.amount) as added from public.partner_pledge_adds x where x.partner_id = p.id and x.counted_at is null
    ) a on true
   where p.id = public.partner_of(auth.uid())
$$;

create or replace function public.partner_update_profile(
  _city text, _country text, _region text, _org_type text, _website text, _instagram text,
  _facebook text, _linkedin text, _about text, _contact_name text, _logo_path text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  _pid uuid := public.partner_of(auth.uid());
  clean text;
begin
  if _pid is null then raise exception 'not a partner account' using errcode = '42501'; end if;
  if _logo_path is not null and _logo_path <> '' and _logo_path not like _pid::text || '/profile/%' then
    raise exception 'the logo must be uploaded to this organisation''s folder' using errcode = '22023';
  end if;
  clean := nullif(btrim(coalesce(_website, '')), '');
  if clean is not null and clean !~* '^https?://' then clean := 'https://' || clean; end if;
  update public.partners set
    city = nullif(btrim(coalesce(_city, '')), ''),
    country = nullif(btrim(coalesce(_country, '')), ''),
    region = nullif(btrim(coalesce(_region, '')), ''),
    org_type = coalesce(nullif(btrim(coalesce(_org_type, '')), ''), org_type),
    website = clean,
    instagram = nullif(btrim(coalesce(_instagram, '')), ''),
    facebook = nullif(btrim(coalesce(_facebook, '')), ''),
    linkedin = nullif(btrim(coalesce(_linkedin, '')), ''),
    about = nullif(btrim(coalesce(_about, '')), ''),
    contact_name = nullif(btrim(coalesce(_contact_name, '')), ''),
    logo_path = case when _logo_path is null then logo_path else nullif(_logo_path, '') end,
    profile_updated_at = now()
  where id = _pid;
end;
$$;

create or replace function public.partner_add_pledge(_staff_id uuid, _amount integer, _note text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  _pid uuid := public.partner_of(auth.uid());
  total bigint;
begin
  if _pid is null then raise exception 'not a partner account' using errcode = '42501'; end if;
  if not public.partner_staff_ok(_pid, _staff_id) then raise exception 'unknown person' using errcode = '42501'; end if;
  if _amount is null or _amount < 1 or _amount > 10000000 then
    raise exception 'the amount must be between 1 and 10,000,000' using errcode = '22023';
  end if;
  if (select count(*) from public.partner_pledge_adds where partner_id = _pid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many pledge changes today' using errcode = '54000';
  end if;
  insert into public.partner_pledge_adds (partner_id, staff_id, amount, note)
  values (_pid, _staff_id, _amount, nullif(btrim(coalesce(_note, '')), ''));
  select p.pledge_goal + coalesce((select sum(amount) from public.partner_pledge_adds where partner_id = _pid and counted_at is null), 0)
    into total from public.partners p where p.id = _pid;
  return total;
end;
$$;

-- ---------- 3. community posts and "Share with us" ----------

create table public.partner_posts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  staff_id uuid references public.partner_staff (id) on delete set null,
  -- community: every partner sees it; team: only Kindness Forward sees it ("Share with us")
  audience text not null default 'community' check (audience in ('community', 'team')),
  kind text not null default 'post' check (kind in ('post', 'testimonial', 'video')),
  body text not null default '' check (length(body) <= 2000),
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 10),
  link_url text check (link_url is null or link_url ~* '^https?://'),
  -- consent, as ticked by the person who sent it
  consent_share boolean not null default false,
  consent_people boolean not null default false,
  shows_minors boolean not null default false,
  consent_text text,
  consent_at timestamptz,
  -- the team's side
  hidden_at timestamptz,
  hidden_by uuid references public.hub_members (id) on delete set null,
  hidden_note text,
  used_at timestamptz,
  used_url text check (used_url is null or used_url ~* '^https?://'),
  story_id uuid references public.hub_stories (id) on delete set null,
  created_at timestamptz not null default now(),
  check (btrim(body) <> '' or jsonb_array_length(media) > 0 or link_url is not null),
  check (consent_share),
  check (jsonb_array_length(media) = 0 or consent_people)
);
create index partner_posts_feed_idx on public.partner_posts (created_at desc) where hidden_at is null;
create index partner_posts_partner_idx on public.partner_posts (partner_id, created_at desc);
alter table public.partner_posts enable row level security;

create policy "Partners see community posts and their own; the team sees all"
on public.partner_posts for select to authenticated
using (
  public.is_hub_member(auth.uid())
  or public.is_partner_account(auth.uid(), partner_id)
  or (audience = 'community' and hidden_at is null and public.is_partner_user(auth.uid()))
);

create policy "Team can hide, unhide and mark posts as used"
on public.partner_posts for update to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

revoke all on public.partner_posts from anon, authenticated;
grant select on public.partner_posts to authenticated;
grant update (hidden_at, hidden_by, hidden_note, used_at, used_url, story_id) on public.partner_posts to authenticated;

create table public.partner_post_hearts (
  post_id uuid not null references public.partner_posts (id) on delete cascade,
  staff_id uuid not null references public.partner_staff (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, staff_id)
);
alter table public.partner_post_hearts enable row level security;
revoke all on public.partner_post_hearts from anon, authenticated;

create table public.partner_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.partner_posts (id) on delete cascade,
  partner_id uuid references public.partners (id) on delete cascade,
  staff_id uuid references public.partner_staff (id) on delete set null,
  team_member_id uuid references public.hub_members (id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 800),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  check (partner_id is not null or team_member_id is not null)
);
create index partner_post_comments_post_idx on public.partner_post_comments (post_id, created_at);
alter table public.partner_post_comments enable row level security;

create policy "Team can see comments"
on public.partner_post_comments for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Team can reply as Kindness Forward"
on public.partner_post_comments for insert to authenticated
with check (public.is_hub_member(auth.uid()) and team_member_id = public.hub_me() and partner_id is null and staff_id is null);

create policy "Team can hide comments"
on public.partner_post_comments for update to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

revoke all on public.partner_post_comments from anon, authenticated;
grant select on public.partner_post_comments to authenticated;
grant insert (post_id, team_member_id, body) on public.partner_post_comments to authenticated;
grant update (hidden_at) on public.partner_post_comments to authenticated;

-- Is this post visible to this person?
create or replace function public.partner_post_visible(_post_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partner_posts p
     where p.id = _post_id
       and (
         public.is_hub_member(_user_id)
         or p.partner_id = public.partner_of(_user_id)
         or (p.audience = 'community' and p.hidden_at is null and public.is_partner_user(_user_id))
       )
  )
$$;

create or replace function public.partner_post_create(
  _staff_id uuid, _audience text, _kind text, _body text, _media jsonb, _link_url text,
  _consent_share boolean, _consent_people boolean, _shows_minors boolean, _consent_text text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _pid uuid := public.partner_of(auth.uid());
  m jsonb;
  new_id uuid;
begin
  if _pid is null then raise exception 'not a partner account' using errcode = '42501'; end if;
  if not public.partner_staff_ok(_pid, _staff_id) then raise exception 'unknown person' using errcode = '42501'; end if;
  if coalesce(_consent_share, false) is not true then
    raise exception 'please tick the box that lets us share it' using errcode = '22023';
  end if;
  _media := coalesce(_media, '[]'::jsonb);
  if jsonb_typeof(_media) <> 'array' then raise exception 'media must be a list' using errcode = '22023'; end if;
  for m in select * from jsonb_array_elements(_media) loop
    if coalesce(m->>'path', '') not like _pid::text || '/%' or coalesce(m->>'type', '') not in ('image', 'video') then
      raise exception 'a file is not from this organisation' using errcode = '22023';
    end if;
  end loop;
  if jsonb_array_length(_media) > 0 and coalesce(_consent_people, false) is not true then
    raise exception 'please confirm everyone shown agreed to be shared' using errcode = '22023';
  end if;
  if (select count(*) from public.partner_posts where partner_id = _pid and created_at > now() - interval '1 day') >= 40 then
    raise exception 'too many posts today' using errcode = '54000';
  end if;
  insert into public.partner_posts (partner_id, staff_id, audience, kind, body, media, link_url,
                                    consent_share, consent_people, shows_minors, consent_text, consent_at)
  values (_pid, _staff_id, coalesce(_audience, 'community'), coalesce(_kind, 'post'), btrim(coalesce(_body, '')), _media,
          nullif(btrim(coalesce(_link_url, '')), ''), true, coalesce(_consent_people, false), coalesce(_shows_minors, false),
          left(coalesce(_consent_text, ''), 1000), now())
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.partner_post_delete(_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _pid uuid := public.partner_of(auth.uid());
begin
  if _pid is null then raise exception 'not a partner account' using errcode = '42501'; end if;
  delete from public.partner_posts where id = _post_id and partner_id = _pid;
  if not found then raise exception 'that post is not yours' using errcode = '42501'; end if;
end;
$$;

create or replace function public.partner_post_heart(_post_id uuid, _staff_id uuid)
returns table (hearted boolean, hearts integer)
language plpgsql security definer set search_path = public as $$
declare
  _pid uuid := public.partner_of(auth.uid());
begin
  if _pid is null then raise exception 'not a partner account' using errcode = '42501'; end if;
  if not public.partner_staff_ok(_pid, _staff_id) then raise exception 'unknown person' using errcode = '42501'; end if;
  if not public.partner_post_visible(_post_id, auth.uid()) then raise exception 'no such post' using errcode = '42501'; end if;
  delete from public.partner_post_hearts h where h.post_id = _post_id and h.staff_id = _staff_id;
  if not found then
    insert into public.partner_post_hearts (post_id, staff_id, partner_id) values (_post_id, _staff_id, _pid);
    hearted := true;
  else
    hearted := false;
  end if;
  select count(*)::int into hearts from public.partner_post_hearts h where h.post_id = _post_id;
  return next;
end;
$$;

create or replace function public.partner_comment_create(_post_id uuid, _staff_id uuid, _body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _pid uuid := public.partner_of(auth.uid());
  new_id uuid;
begin
  if _pid is null then raise exception 'not a partner account' using errcode = '42501'; end if;
  if not public.partner_staff_ok(_pid, _staff_id) then raise exception 'unknown person' using errcode = '42501'; end if;
  if not public.partner_post_visible(_post_id, auth.uid()) then raise exception 'no such post' using errcode = '42501'; end if;
  if (select count(*) from public.partner_post_comments where partner_id = _pid and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too many comments this hour' using errcode = '54000';
  end if;
  insert into public.partner_post_comments (post_id, partner_id, staff_id, body)
  values (_post_id, _pid, _staff_id, btrim(_body))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.partner_comment_delete(_comment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.partner_post_comments c
   where c.id = _comment_id
     and (c.partner_id = public.partner_of(auth.uid())
          or (c.team_member_id is not null and c.team_member_id = public.hub_me()));
  if not found then raise exception 'that comment is not yours' using errcode = '42501'; end if;
end;
$$;

-- The feed. Partners get community posts plus their own; the team gets everything when it asks.
create or replace function public.partner_feed(
  _staff_id uuid default null, _limit integer default 20, _before timestamptz default null,
  _country text default null, _org_type text default null, _partner_id uuid default null,
  _audience text default null, _include_hidden boolean default false
)
returns table (
  id uuid, partner_id uuid, partner_name text, partner_org_type text, partner_country text, partner_region text,
  partner_city text, partner_logo_path text, partner_entry_logo text, staff_name text, audience text, kind text,
  body text, media jsonb, link_url text, created_at timestamptz, used_at timestamptz, used_url text,
  hidden_at timestamptz, hidden_note text, story_id uuid, shows_minors boolean, consent_share boolean,
  consent_people boolean, consent_text text, hearts integer, hearted boolean, comments integer, mine boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _me uuid := public.partner_of(_uid);
  _team boolean := public.is_hub_member(_uid);
begin
  if _me is null and not _team then raise exception 'sign in first' using errcode = '42501'; end if;
  return query
  select p.id, p.partner_id, o.name, o.org_type, o.country, o.region, o.city, o.logo_path, e.logo_url,
         s.name, p.audience, p.kind, p.body, p.media, p.link_url, p.created_at, p.used_at, p.used_url,
         p.hidden_at, p.hidden_note, p.story_id, p.shows_minors, p.consent_share, p.consent_people, p.consent_text,
         (select count(*)::int from public.partner_post_hearts h where h.post_id = p.id),
         (_staff_id is not null and exists (select 1 from public.partner_post_hearts h where h.post_id = p.id and h.staff_id = _staff_id)),
         (select count(*)::int from public.partner_post_comments c where c.post_id = p.id and c.hidden_at is null),
         (_me is not null and p.partner_id = _me)
    from public.partner_posts p
    join public.partners o on o.id = p.partner_id
    left join public.partner_entries e on e.id = o.sheet_entry_id
    left join public.partner_staff s on s.id = p.staff_id
   where (_before is null or p.created_at < _before)
     and (_country is null or o.country = _country)
     and (_org_type is null or o.org_type = _org_type)
     and (_partner_id is null or p.partner_id = _partner_id)
     and (_audience is null or p.audience = _audience)
     and (
       (_team and (_include_hidden or p.hidden_at is null))
       or (not _team and p.partner_id = _me and p.hidden_at is null)
       or (not _team and p.audience = 'community' and p.hidden_at is null)
     )
   order by p.created_at desc
   limit least(greatest(coalesce(_limit, 20), 1), 100);
end;
$$;

create or replace function public.partner_comments(_post_id uuid)
returns table (id uuid, body text, created_at timestamptz, author text, partner_name text, team boolean, mine boolean, hidden_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _me uuid := public.partner_of(_uid);
  _team boolean := public.is_hub_member(_uid);
begin
  if not public.partner_post_visible(_post_id, _uid) then raise exception 'no such post' using errcode = '42501'; end if;
  return query
  select c.id, c.body, c.created_at,
         coalesce(s.name, nullif(m.name, ''), 'Kindness Forward'),
         case when c.team_member_id is not null then 'Kindness Forward' else o.name end,
         c.team_member_id is not null,
         coalesce((c.partner_id is not null and c.partner_id = _me), false)
           or coalesce((c.team_member_id is not null and c.team_member_id = public.hub_me()), false),
         c.hidden_at
    from public.partner_post_comments c
    left join public.partner_staff s on s.id = c.staff_id
    left join public.partners o on o.id = c.partner_id
    left join public.hub_members m on m.id = c.team_member_id
   where c.post_id = _post_id and (_team or c.hidden_at is null)
   order by c.created_at;
end;
$$;

-- ---------- 4. weekly updates ----------

create table public.partner_updates (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  title text not null default '' check (length(title) <= 160),
  title_es text not null default '' check (length(title_es) <= 160),
  intro text not null default '' check (length(intro) <= 1200),
  intro_es text not null default '' check (length(intro_es) <= 1200),
  -- [{ "kind": "kit" | "ask" | "news" | "moment", "text": "...", "textEs": "...", "link": "https://..." }]
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 12),
  spotlight_partner_id uuid references public.partners (id) on delete set null,
  spotlight_text text check (spotlight_text is null or length(spotlight_text) <= 600),
  spotlight_text_es text check (spotlight_text_es is null or length(spotlight_text_es) <= 600),
  image_path text,
  published_at timestamptz,
  created_by uuid references public.hub_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_updates_published_idx on public.partner_updates (published_at desc);
alter table public.partner_updates enable row level security;

create trigger partner_updates_touch before update on public.partner_updates
for each row execute function public.touch_updated_at();

create policy "Partners see published updates; the team sees all"
on public.partner_updates for select to authenticated
using (
  public.is_hub_member(auth.uid())
  or (published_at is not null and published_at <= now() and public.is_partner_user(auth.uid()))
);

create policy "Team writes updates"
on public.partner_updates for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

revoke all on public.partner_updates from anon, authenticated;
grant select, insert, update, delete on public.partner_updates to authenticated;

-- The spotlight partner's public face (name, place, logo) for an update.
create or replace function public.partner_card(_partner_id uuid)
returns table (id uuid, name text, org_type text, country text, region text, city text, logo_path text, entry_logo_url text, about text, website text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.org_type, p.country, p.region, p.city, p.logo_path, e.logo_url, p.about, coalesce(p.website, e.website)
    from public.partners p left join public.partner_entries e on e.id = p.sheet_entry_id
   where p.id = _partner_id and public.partner_hub_reader(auth.uid())
$$;

-- ---------- 5. the kit ----------

create table public.partner_kit_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 160),
  title_es text check (title_es is null or length(title_es) <= 160),
  description text check (description is null or length(description) <= 600),
  description_es text check (description_es is null or length(description_es) <= 600),
  section text not null default 'social' check (section in ('start', 'social', 'profile', 'print', 'email', 'logos', 'video', 'other')),
  -- who gets it: everyone, organisations, companies or ambassadors (see member_kind)
  audience text not null default 'all' check (audience in ('all', 'organisation', 'company', 'ambassador')),
  lang text not null default 'both' check (lang in ('en', 'es', 'both')),
  -- a file in the public partner-kit bucket, or a link (a Canva template, a Drive folder)
  file_path text,
  thumb_path text,
  url text check (url is null or url ~* '^https?://'),
  mime text,
  size_bytes bigint,
  width integer,
  height integer,
  caption text check (caption is null or length(caption) <= 3000),
  caption_es text check (caption_es is null or length(caption_es) <= 3000),
  sort integer not null default 100,
  hidden boolean not null default false,
  added_at timestamptz not null default now(),
  check (file_path is not null or url is not null)
);
alter table public.partner_kit_items enable row level security;

create policy "Partners see the kit; the team sees all"
on public.partner_kit_items for select to authenticated
using (public.is_hub_member(auth.uid()) or (not hidden and public.is_partner_user(auth.uid())));

create policy "Team manages the kit"
on public.partner_kit_items for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

revoke all on public.partner_kit_items from anon, authenticated;
grant select, insert, update, delete on public.partner_kit_items to authenticated;

-- Kit files are meant to be shared, so the bucket is public to read; only the team can change it.
insert into storage.buckets (id, name, public, file_size_limit)
values ('partner-kit', 'partner-kit', true, 52428800)
on conflict (id) do nothing;

create policy "Team can add kit files"
on storage.objects for insert to authenticated
with check (bucket_id = 'partner-kit' and public.is_hub_member(auth.uid()));

create policy "Team can replace kit files"
on storage.objects for update to authenticated
using (bucket_id = 'partner-kit' and public.is_hub_member(auth.uid()))
with check (bucket_id = 'partner-kit' and public.is_hub_member(auth.uid()));

create policy "Team can remove kit files"
on storage.objects for delete to authenticated
using (bucket_id = 'partner-kit' and public.is_hub_member(auth.uid()));

-- ---------- 6. who can see partner photos ----------

-- Logos are seen by every partner and the team; photos and videos in a community post by every
-- partner while the post is visible; the team sees everything partners upload.
create or replace function public.partner_media_visible(_name text, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_hub_member(_user_id)
      or (public.is_partner_user(_user_id) and (storage.foldername(_name))[2] = 'profile')
      or (public.is_partner_user(_user_id) and exists (
            select 1 from public.partner_posts p
             where p.audience = 'community' and p.hidden_at is null
               and p.media @> jsonb_build_array(jsonb_build_object('path', _name))
         ))
$$;

create policy "Partners and the team can see shared partner media"
on storage.objects for select to authenticated
using (bucket_id = 'partner-media' and public.partner_media_visible(name, auth.uid()));

-- ---------- 7. sign-in links by email ----------

create table public.partner_login_links (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  staff_id uuid references public.partner_staff (id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.partner_login_links enable row level security;
revoke all on public.partner_login_links from anon, authenticated;

-- ---------- 8. figures for the map and the team ----------

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
               'joined', p.account_user_id is not null) order by lower(p.name))
        from public.partners p left join public.partner_entries e on e.id = p.sheet_entry_id), '[]'::jsonb),
    'actsLogged', coalesce((select sum(people_count) from public.partner_submissions where status <> 'rejected'), 0),
    'posts', (select count(*) from public.partner_posts where audience = 'community' and hidden_at is null),
    'listedPartners', (select count(*) from public.partner_entries where status = 'Approved'),
    'pledgedActs', coalesce((select sum(pledge_count) from public.commitments where coalesce(status, 'published') = 'published'), 0)
  );
end;
$$;

-- The newest pledges from anywhere (the website's forms, the partners sheet), for the map's live
-- line. A person shows only as their country; an organisation by name only when it is a listed
-- partner (from the partners sheet), otherwise also by its country.
create or replace function public.partner_recent_pledges(_limit integer default 20)
returns table (created_at timestamptz, country text, kind text, org_name text, acts integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.partner_hub_reader(auth.uid()) then raise exception 'sign in first' using errcode = '42501'; end if;
  return query
  select c.created_at,
         nullif(btrim(c.country), ''),
         case when c.type = 'organization' then 'organisation' else 'person' end,
         case when c.type = 'organization' and c.partner_sheet_id is not null then c.org_name end,
         coalesce(c.pledge_count, 0)
    from public.commitments c
   where coalesce(c.status, 'published') = 'published'
   order by c.created_at desc
   limit least(greatest(coalesce(_limit, 20), 1), 50);
end;
$$;

-- Everything the team needs about each organisation in the hub, including its invite link.
create or replace function public.hub_partners()
returns table (
  id uuid, name text, org_type text, city text, country text, region text, contact_email text, contact_name text,
  logo_path text, entry_logo_url text, website text, pledge_goal integer, pledge_waiting bigint,
  staff integer, joined boolean, last_login timestamptz, acts bigint, posts integer, last_post timestamptz,
  invite_url text, profile_updated_at timestamptz, created_at timestamptz
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
         p.profile_updated_at, p.created_at
    from public.partners p
    left join public.partner_entries e on e.id = p.sheet_entry_id
   order by lower(p.name);
end;
$$;

-- The team adds a member by hand (an ambassador, or an organisation not in the partners sheet)
-- and gets the invite link to send.
create or replace function public.hub_add_member(
  _name text, _org_type text, _contact_email text, _contact_name text, _country text, _pledge_goal integer
)
returns table (id uuid, invite_url text)
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  token text;
begin
  if not public.is_hub_member(auth.uid()) then raise exception 'hub members only' using errcode = '42501'; end if;
  if length(btrim(coalesce(_name, ''))) < 1 then raise exception 'a name is needed' using errcode = '22023'; end if;
  if exists (select 1 from public.partners p where lower(p.name) = lower(btrim(_name)) and coalesce(p.org_type, '') = coalesce(_org_type, '')) then
    raise exception 'there is already a member with that name' using errcode = '23505';
  end if;
  insert into public.partners (name, org_type, contact_email, contact_name, country, pledge_goal)
  values (btrim(_name), nullif(_org_type, ''), nullif(lower(btrim(coalesce(_contact_email, ''))), ''),
          nullif(btrim(coalesce(_contact_name, '')), ''), nullif(btrim(coalesce(_country, '')), ''), greatest(coalesce(_pledge_goal, 0), 0))
  returning partners.id, partners.invite_token into new_id, token;
  id := new_id;
  invite_url := 'https://partners.passkindnessforward.com/join/' || token;
  return next;
end;
$$;

-- The team changes a member's kind or contact (the sheet still sets the pledge for sheet partners).
create or replace function public.hub_update_member(_id uuid, _org_type text, _contact_email text, _contact_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_hub_member(auth.uid()) then raise exception 'hub members only' using errcode = '42501'; end if;
  update public.partners set
    org_type = coalesce(nullif(_org_type, ''), org_type),
    contact_email = case when _contact_email is null then contact_email else nullif(lower(btrim(_contact_email)), '') end,
    contact_name = case when _contact_name is null then contact_name else nullif(btrim(_contact_name), '') end
  where id = _id;
end;
$$;

-- ---------- grants for the functions ----------

revoke execute on function public.hub_add_member(text, text, text, text, text, integer) from public, anon;
revoke execute on function public.hub_update_member(uuid, text, text, text) from public, anon;
grant execute on function public.hub_add_member(text, text, text, text, text, integer) to authenticated;
grant execute on function public.hub_update_member(uuid, text, text, text) to authenticated;
grant execute on function public.member_kind(text) to anon, authenticated;

revoke execute on function public.partner_of(uuid) from public, anon;
revoke execute on function public.is_partner_user(uuid) from public, anon;
revoke execute on function public.partner_staff_ok(uuid, uuid) from public, anon;
revoke execute on function public.partner_hub_reader(uuid) from public, anon;
revoke execute on function public.partner_me() from public, anon;
revoke execute on function public.partner_update_profile(text, text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.partner_add_pledge(uuid, integer, text) from public, anon;
revoke execute on function public.partner_post_visible(uuid, uuid) from public, anon;
revoke execute on function public.partner_post_create(uuid, text, text, text, jsonb, text, boolean, boolean, boolean, text) from public, anon;
revoke execute on function public.partner_post_delete(uuid) from public, anon;
revoke execute on function public.partner_post_heart(uuid, uuid) from public, anon;
revoke execute on function public.partner_comment_create(uuid, uuid, text) from public, anon;
revoke execute on function public.partner_comment_delete(uuid) from public, anon;
revoke execute on function public.partner_feed(uuid, integer, timestamptz, text, text, uuid, text, boolean) from public, anon;
revoke execute on function public.partner_comments(uuid) from public, anon;
revoke execute on function public.partner_card(uuid) from public, anon;
revoke execute on function public.partner_media_visible(text, uuid) from public, anon;
revoke execute on function public.partner_hub_stats() from public, anon;
revoke execute on function public.hub_partners() from public, anon;
revoke execute on function public.partner_recent_pledges(integer) from public, anon;

grant execute on function public.partner_of(uuid) to authenticated;
grant execute on function public.is_partner_user(uuid) to authenticated;
grant execute on function public.partner_staff_ok(uuid, uuid) to authenticated;
grant execute on function public.partner_hub_reader(uuid) to authenticated;
grant execute on function public.partner_me() to authenticated;
grant execute on function public.partner_update_profile(text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.partner_add_pledge(uuid, integer, text) to authenticated;
grant execute on function public.partner_post_visible(uuid, uuid) to authenticated;
grant execute on function public.partner_post_create(uuid, text, text, text, jsonb, text, boolean, boolean, boolean, text) to authenticated;
grant execute on function public.partner_post_delete(uuid) to authenticated;
grant execute on function public.partner_post_heart(uuid, uuid) to authenticated;
grant execute on function public.partner_comment_create(uuid, uuid, text) to authenticated;
grant execute on function public.partner_comment_delete(uuid) to authenticated;
grant execute on function public.partner_feed(uuid, integer, timestamptz, text, text, uuid, text, boolean) to authenticated;
grant execute on function public.partner_comments(uuid) to authenticated;
grant execute on function public.partner_card(uuid) to authenticated;
grant execute on function public.partner_media_visible(text, uuid) to authenticated;
grant execute on function public.partner_hub_stats() to authenticated;
grant execute on function public.hub_partners() to authenticated;
grant execute on function public.partner_recent_pledges(integer) to authenticated;
