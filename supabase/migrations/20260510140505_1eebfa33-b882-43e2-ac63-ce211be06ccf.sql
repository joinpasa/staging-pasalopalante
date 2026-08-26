-- =========================================
-- Enums
-- =========================================
create type public.app_role as enum ('member', 'leader', 'admin');
create type public.reminder_channel as enum ('email', 'sms');
create type public.reminder_frequency as enum ('daily', 'weekdays', 'weekly');

-- =========================================
-- profiles
-- =========================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  language text default 'en',
  timezone text default 'America/Puerto_Rico',
  phone text,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
on public.profiles for select using (true);

create policy "Users can insert their own profile"
on public.profiles for insert with check (auth.uid() = user_id);

create policy "Users can update their own profile"
on public.profiles for update using (auth.uid() = user_id);

create policy "Users can delete their own profile"
on public.profiles for delete using (auth.uid() = user_id);

-- =========================================
-- user_roles + has_role helper
-- =========================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  org_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, role, org_id)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view their own roles"
on public.user_roles for select using (auth.uid() = user_id);

create policy "Admins can view all roles"
on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- organizations + org_members
-- =========================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  logo_url text,
  chapter text,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create policy "Orgs are viewable by everyone"
on public.organizations for select using (true);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_leader boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table public.org_members enable row level security;

create or replace function public.is_org_member(_user_id uuid, _org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members where user_id = _user_id and org_id = _org_id)
$$;

create or replace function public.is_org_leader(_user_id uuid, _org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members where user_id = _user_id and org_id = _org_id and is_leader = true)
$$;

create policy "Members can view their org members"
on public.org_members for select
using (public.is_org_member(auth.uid(), org_id));

create policy "Users can join an org"
on public.org_members for insert
with check (auth.uid() = user_id);

create policy "Users can leave their own membership"
on public.org_members for delete
using (auth.uid() = user_id);

-- Aggregate stats RPC (no PII)
create or replace function public.org_stats(_org_id uuid)
returns table (member_count bigint, total_acts bigint, total_pledged bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.org_members where org_id = _org_id),
    (select coalesce(count(*),0)
       from public.acts_of_kindness a
       join public.org_members m on m.user_id = a.user_id
      where m.org_id = _org_id and a.status = 'published'),
    (select coalesce(sum(c.pledge_count),0)
       from public.commitments c
       join public.org_members m on m.user_id = c.user_id
      where m.org_id = _org_id and c.status = 'published')
$$;

-- =========================================
-- reminders
-- =========================================
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  channel public.reminder_channel not null default 'email',
  frequency public.reminder_frequency not null default 'daily',
  send_time time not null default '09:00',
  timezone text not null default 'America/Puerto_Rico',
  quiet_hours_start time,
  quiet_hours_end time,
  paused_until timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create policy "Users manage their own reminders"
on public.reminders for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================
-- badges + user_badges
-- =========================================
create table public.badges (
  id text primary key,
  name text not null,
  name_es text,
  description text,
  description_es text,
  icon text,
  criteria jsonb,
  created_at timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy "Badges are viewable by everyone"
on public.badges for select using (true);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "Users view their own badges"
on public.user_badges for select using (auth.uid() = user_id);

-- Seed a starter badge catalog
insert into public.badges (id, name, name_es, description, description_es, icon, criteria) values
  ('first_act', 'First Spark', 'Primera Chispa', 'Logged your first act of kindness', 'Registraste tu primer acto de bondad', '✨', '{"acts": 1}'::jsonb),
  ('streak_3', '3-Day Streak', 'Racha de 3 días', 'Kindness 3 days in a row', 'Bondad 3 días seguidos', '🔥', '{"streak": 3}'::jsonb),
  ('streak_7', '7-Day Streak', 'Racha de 7 días', 'A whole week of kindness', 'Una semana entera de bondad', '🔥', '{"streak": 7}'::jsonb),
  ('streak_30', '30-Day Streak', 'Racha de 30 días', 'A month of kindness', 'Un mes de bondad', '🏆', '{"streak": 30}'::jsonb),
  ('hug_dealer', 'Hug Dealer', 'Repartidor de Abrazos', 'Logged 10 hugs', '10 abrazos registrados', '🤗', '{"type_tag": "hug", "count": 10}'::jsonb),
  ('listener', 'Deep Listener', 'Escucha Profunda', 'Logged 10 acts of listening', '10 actos de escuchar', '👂', '{"type_tag": "listening", "count": 10}'::jsonb);

-- =========================================
-- Acts + commitments — owner policies
-- =========================================
create policy "Users can view their own acts"
on public.acts_of_kindness for select using (auth.uid() = user_id);

create policy "Users can update their own acts"
on public.acts_of_kindness for update using (auth.uid() = user_id);

create policy "Users can delete their own acts"
on public.acts_of_kindness for delete using (auth.uid() = user_id);

create policy "Users can view their own commitments"
on public.commitments for select using (auth.uid() = user_id);

create policy "Users can update their own commitments"
on public.commitments for update using (auth.uid() = user_id);

create policy "Users can delete their own commitments"
on public.commitments for delete using (auth.uid() = user_id);

-- =========================================
-- Auto-create profile + claim anonymous rows on signup
-- =========================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;

  -- Claim previously anonymous commitments by matching email
  update public.commitments
     set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);

  -- Default member role
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================
-- Streak helper function
-- =========================================
create or replace function public.user_streak(_user_id uuid)
returns table (current_streak int, longest_streak int, total_acts bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  cur int := 0;
  longest int := 0;
  run int := 0;
  prev date := null;
  d date;
  total bigint := 0;
  tz text;
begin
  select coalesce(timezone, 'America/Puerto_Rico') into tz from public.profiles where user_id = _user_id;
  if tz is null then tz := 'America/Puerto_Rico'; end if;

  for d in
    select distinct (created_at at time zone tz)::date as day
    from public.acts_of_kindness
    where user_id = _user_id and status = 'published'
    order by day desc
  loop
    total := total + 1;
    if prev is null then
      run := 1;
    elsif prev - d = 1 then
      run := run + 1;
    else
      if run > longest then longest := run; end if;
      exit;
    end if;
    if longest < run then longest := run; end if;
    prev := d;
  end loop;

  -- current streak only counts if last act is today or yesterday
  if prev is not null and (current_date at time zone tz)::date - prev <= 1 then
    cur := run;
  else
    cur := 0;
  end if;

  -- recompute total properly
  select count(*) into total from public.acts_of_kindness where user_id = _user_id and status = 'published';

  current_streak := cur;
  longest_streak := longest;
  total_acts := total;
  return next;
end;
$$;

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger reminders_touch before update on public.reminders
for each row execute function public.touch_updated_at();