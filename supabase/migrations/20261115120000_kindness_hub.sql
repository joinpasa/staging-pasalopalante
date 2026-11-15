-- Kindness Hub: the marketing team's own place to plan, make, approve and schedule content.
--
-- Everything here is additive: new hub_* tables, a few helper functions and one private storage
-- bucket. No existing table, policy or function is changed.
--
-- Who can use it
--   * Anyone who is already a site admin (user_roles.role = 'admin') is a hub admin.
--   * Everyone else is added by a hub admin, by email, in the hub's Settings screen. Their row is
--     linked to their account the first time they sign in (hub_claim()).
--   No email addresses live in this file: the repository is public.
--
-- What the database itself enforces (so it does not depend on the screens getting it right)
--   * Only hub members can read or write any hub_* row, or any file in the hub-media bucket.
--   * Only an approver or admin can approve a card, and nobody but an admin approves their own.
--   * Only the hub's edge function (service role) can mark a card Scheduled or Posted, or link it
--     to a HighLevel post.

-- =========================================
-- People
-- =========================================
create table public.hub_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email <> ''),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null default '',
  role text not null default 'member' check (role in ('member', 'approver', 'admin')),
  color text not null default '#00a3e0',
  created_at timestamptz not null default now()
);
alter table public.hub_members enable row level security;

create or replace function public.hub_role(_user_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when _user_id is null then null
    when public.has_role(_user_id, 'admin') then 'admin'
    else (select m.role from public.hub_members m where m.user_id = _user_id)
  end
$$;

create or replace function public.is_hub_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.hub_role(_user_id) is not null
$$;

-- The signed-in person's own hub_members row.
create or replace function public.hub_me()
returns uuid language sql stable security definer set search_path = public as $$
  select m.id from public.hub_members m where m.user_id = auth.uid()
$$;

-- Called once after sign-in. Links the account to the row an admin made for its email (only when
-- that email has been confirmed), gives a site admin a row of their own, and returns the role,
-- or null when this person has not been added to the hub.
create or replace function public.hub_claim()
returns text language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _email text;
begin
  if _uid is null then
    return null;
  end if;
  select lower(u.email) into _email from auth.users u where u.id = _uid and u.email_confirmed_at is not null;
  if _email is not null then
    update public.hub_members set user_id = _uid where email = _email and user_id is null;
    if public.has_role(_uid, 'admin') and not exists (select 1 from public.hub_members where user_id = _uid) then
      insert into public.hub_members (email, user_id, role) values (_email, _uid, 'admin')
      on conflict (email) do update set user_id = excluded.user_id;
    end if;
  end if;
  return public.hub_role(_uid);
end
$$;

revoke all on function public.hub_claim() from public, anon;
grant execute on function public.hub_claim() to authenticated;

create policy "Hub members can see the team"
on public.hub_members for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Hub admins can add people"
on public.hub_members for insert to authenticated
with check (public.hub_role(auth.uid()) = 'admin');

create policy "Hub admins can change people"
on public.hub_members for update to authenticated
using (public.hub_role(auth.uid()) = 'admin')
with check (public.hub_role(auth.uid()) = 'admin');

create policy "Hub admins can remove people"
on public.hub_members for delete to authenticated
using (public.hub_role(auth.uid()) = 'admin');

-- =========================================
-- Cards: one piece of content moving through the pipeline
-- =========================================
create table public.hub_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  notes text not null default '',
  stage text not null default 'idea' check (stage in ('idea', 'planning', 'creating', 'review', 'approved', 'scheduled', 'posted')),
  format text not null default 'reel' check (format in ('reel', 'story', 'carousel', 'image', 'video', 'email')),
  owner_id uuid references public.hub_members (id) on delete set null,
  account_ids text[] not null default '{}',
  publish_at timestamptz,
  event_at timestamptz,
  caption_en text not null default '',
  caption_es text not null default '',
  subject text,
  in_kit boolean not null default false,
  -- emails only: the newsletter as designed in the hub (blocks, subject, sender, both languages)
  design jsonb,
  -- files on the card: [{id, kind, path | url, mime, name, size, storyId, consent, minors}]
  assets jsonb not null default '[]'::jsonb,
  approved_by uuid references public.hub_members (id) on delete set null,
  approved_at timestamptz,
  needs_changes text,
  ghl_post_id text,
  source text not null default 'manual' check (source in ('brief', 'suggestion', 'manual', 'highlevel')),
  -- what happened to the card, newest first: [{id, at, by, text}]
  activity jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hub_items_stage_idx on public.hub_items (stage);
create index hub_items_publish_at_idx on public.hub_items (publish_at);
alter table public.hub_items enable row level security;

create or replace function public.hub_items_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role text;
  _me uuid;
begin
  new.updated_at := now();
  -- the hub's edge function, which is the only thing that talks to HighLevel
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  _role := public.hub_role(auth.uid());
  _me := public.hub_me();

  if tg_op = 'INSERT' then
    if new.stage in ('approved', 'scheduled', 'posted') then
      raise exception 'A new card starts before approval.';
    end if;
    new.approved_by := null;
    new.approved_at := null;
    new.ghl_post_id := null;
    return new;
  end if;

  if new.stage is distinct from old.stage then
    if new.stage in ('scheduled', 'posted') or old.stage in ('scheduled', 'posted') then
      raise exception 'The hub moves cards to Scheduled and Posted by itself.';
    end if;
    if new.stage = 'approved' then
      if _role is null or _role not in ('approver', 'admin') then
        raise exception 'Only an approver can approve a card.';
      end if;
      if old.owner_id is not null and old.owner_id = _me and _role <> 'admin' then
        raise exception 'A second pair of eyes approves it. Ask another approver.';
      end if;
      new.approved_by := _me;
      new.approved_at := now();
      new.needs_changes := null;
    else
      new.approved_by := null;
      new.approved_at := null;
    end if;
  else
    -- an approval cannot be written in by hand
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;
  new.ghl_post_id := old.ghl_post_id;
  return new;
end
$$;

create trigger hub_items_guard
before insert or update on public.hub_items
for each row execute function public.hub_items_guard();

-- A scheduled or posted card belongs to HighLevel's queue, so only the edge function removes it.
create or replace function public.hub_items_guard_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and old.stage in ('scheduled', 'posted') then
    raise exception 'Take the post off the schedule first.';
  end if;
  return old;
end
$$;

create trigger hub_items_guard_delete
before delete on public.hub_items
for each row execute function public.hub_items_guard_delete();

create policy "Hub members can see cards"
on public.hub_items for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Hub members can add cards"
on public.hub_items for insert to authenticated
with check (public.is_hub_member(auth.uid()));

create policy "Hub members can change cards"
on public.hub_items for update to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

create policy "Hub members can remove cards"
on public.hub_items for delete to authenticated
using (public.is_hub_member(auth.uid()));

-- =========================================
-- The Monday brief
-- =========================================
create table public.hub_briefs (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  headline text not null default '',
  summary text not null default '',
  dates jsonb not null default '[]'::jsonb,
  formats jsonb not null default '[]'::jsonb,
  -- [{id, title, why, format, hook, itemId}]
  ideas jsonb not null default '[]'::jsonb,
  -- the week's goal in one sentence, shown on Home and Growth
  goal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hub_briefs enable row level security;

create trigger hub_briefs_touch
before update on public.hub_briefs
for each row execute function public.touch_updated_at();

create policy "Hub members can see briefs"
on public.hub_briefs for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Hub members can write briefs"
on public.hub_briefs for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

-- =========================================
-- The story bank: real clips, photos and words, with who is in them and whether they agreed
-- =========================================
create table public.hub_stories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('clip', 'photo', 'words')),
  title text not null default '',
  -- a file in the hub-media bucket, or a link to a file kept elsewhere
  path text,
  url text,
  mime text,
  poster_path text,
  words text,
  people text not null default '',
  source text not null default '',
  partner text,
  country text,
  tags text[] not null default '{}',
  consent text not null default 'unknown' check (consent in ('on-file', 'partner', 'asked', 'unknown', 'not-needed')),
  consent_note text,
  minors boolean not null default false,
  credit text,
  added_by uuid references public.hub_members (id) on delete set null,
  added_at timestamptz not null default now()
);
alter table public.hub_stories enable row level security;

create policy "Hub members can see stories"
on public.hub_stories for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Hub members can write stories"
on public.hub_stories for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

-- =========================================
-- Suggestions, and what partners and ambassadors send back from the kit page.
-- People without an account send these through the hub's public edge function, never straight
-- into the table, so there is no policy for anonymous visitors here.
-- =========================================
create table public.hub_suggestions (
  id uuid primary key default gen_random_uuid(),
  from_name text not null default '',
  body text not null check (char_length(body) between 1 and 4000),
  link text check (link is null or char_length(link) <= 600),
  status text not null default 'new' check (status in ('new', 'accepted', 'declined')),
  grp text check (grp in ('partner', 'ambassador')),
  kind text check (kind in ('idea', 'story', 'date')),
  consent boolean,
  item_id uuid references public.hub_items (id) on delete set null,
  story_id uuid references public.hub_stories (id) on delete set null,
  created_at timestamptz not null default now()
);
create index hub_suggestions_status_idx on public.hub_suggestions (status, created_at desc);
alter table public.hub_suggestions enable row level security;

create policy "Hub members can see suggestions"
on public.hub_suggestions for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Hub members can write suggestions"
on public.hub_suggestions for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

-- =========================================
-- The weekly kit: what partners and ambassadors are asked to share
-- =========================================
create table public.hub_kit (
  week_start date primary key,
  ask_en text not null default '',
  ask_es text not null default '',
  shares integer not null default 0 check (shares >= 0),
  updated_at timestamptz not null default now()
);
alter table public.hub_kit enable row level security;

create trigger hub_kit_touch
before update on public.hub_kit
for each row execute function public.touch_updated_at();

create policy "Hub members can see the kit"
on public.hub_kit for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Hub members can write the kit"
on public.hub_kit for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

-- =========================================
-- Growth tasks: the work that grows reach besides posting (replying, partners, trends, email,
-- the website), planned by day and ticked off by the team
-- =========================================
create table public.hub_tasks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  day date not null,
  title text not null check (char_length(title) between 1 and 300),
  detail text not null default '',
  lever text not null default 'engage' check (lever in ('post', 'engage', 'trend', 'partners', 'collab', 'email', 'website', 'review')),
  owner_id uuid references public.hub_members(id) on delete set null,
  item_id uuid references public.hub_items(id) on delete set null,
  done boolean not null default false,
  done_at timestamptz,
  -- the guide: what already exists and where, what does not exist yet, and the steps
  have text not null default '',
  missing text not null default '',
  -- [{text, link, linkLabel}]
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hub_tasks_week on public.hub_tasks (week_start, day);
alter table public.hub_tasks enable row level security;

create trigger hub_tasks_touch
before update on public.hub_tasks
for each row execute function public.touch_updated_at();

create policy "Hub members can see tasks"
on public.hub_tasks for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Hub members can write tasks"
on public.hub_tasks for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

-- =========================================
-- Videos: every video the team has or has found, with what it may be used for. Links only: the
-- files themselves stay where they are (HighLevel's media library, the shared drive, YouTube).
-- =========================================
create table public.hub_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  url text not null unique check (url ~* '^https?://' and char_length(url) <= 1000),
  kind text not null default 'link' check (kind in ('file', 'youtube', 'instagram', 'facebook', 'tiktok', 'linkedin', 'drive', 'link')),
  grp text not null default 'ours' check (grp in ('ours', 'partner', 'press', 'event', 'reference')),
  -- ours: free to use; ask: ask the owner first; share: link or share only; no: keep out
  rights text not null default 'ask' check (rights in ('ours', 'ask', 'share', 'no')),
  source text not null default '',
  made_on date,
  seconds integer check (seconds is null or seconds >= 0),
  orientation text check (orientation in ('vertical', 'horizontal', 'square')),
  lang text check (lang in ('en', 'es', 'both', 'none')),
  poster text check (poster is null or poster ~* '^https?://'),
  people text check (people in ('agreed', 'check', 'none')),
  notes text not null default '',
  tags text[] not null default '{}',
  item_ids uuid[] not null default '{}',
  added_by uuid references public.hub_members (id) on delete set null,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hub_videos_added on public.hub_videos (added_at desc);
alter table public.hub_videos enable row level security;

create trigger hub_videos_touch
before update on public.hub_videos
for each row execute function public.touch_updated_at();

create policy "Hub members can see videos"
on public.hub_videos for select to authenticated
using (public.is_hub_member(auth.uid()));

create policy "Hub members can write videos"
on public.hub_videos for all to authenticated
using (public.is_hub_member(auth.uid()))
with check (public.is_hub_member(auth.uid()));

-- =========================================
-- What changed through the hub's API (the hub-api edge function), so the team can always see
-- what was added or edited from outside the screens, by whom, and when.
-- =========================================
create table public.hub_api_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null default '',
  action text not null check (action in ('create', 'update', 'delete', 'import')),
  resource text not null,
  record_id text,
  summary text not null default ''
);
create index hub_api_log_at on public.hub_api_log (at desc);
alter table public.hub_api_log enable row level security;

-- only the edge function writes here; the team can read it
create policy "Hub members can see the API log"
on public.hub_api_log for select to authenticated
using (public.is_hub_member(auth.uid()));

-- =========================================
-- Files: private, hub members only. The edge function hands HighLevel a short-lived link when a
-- post is scheduled, so nothing in here is public.
-- =========================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hub-media', 'hub-media', false, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;

create policy "Hub members can see hub files"
on storage.objects for select to authenticated
using (bucket_id = 'hub-media' and public.is_hub_member(auth.uid()));

create policy "Hub members can add hub files"
on storage.objects for insert to authenticated
with check (bucket_id = 'hub-media' and public.is_hub_member(auth.uid()));

create policy "Hub members can replace hub files"
on storage.objects for update to authenticated
using (bucket_id = 'hub-media' and public.is_hub_member(auth.uid()))
with check (bucket_id = 'hub-media' and public.is_hub_member(auth.uid()));

create policy "Hub members can remove hub files"
on storage.objects for delete to authenticated
using (bucket_id = 'hub-media' and public.is_hub_member(auth.uid()));
