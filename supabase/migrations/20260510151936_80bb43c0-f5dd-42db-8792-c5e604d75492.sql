-- Daily AI-generated suggestions, cached per (date, lang)
create table public.daily_suggestions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  lang text not null,
  acts jsonb not null,
  created_at timestamptz not null default now(),
  unique (date, lang)
);

alter table public.daily_suggestions enable row level security;

create policy "Daily suggestions are viewable by everyone"
on public.daily_suggestions for select
using (true);

-- Reactions on acts of kindness (hearts)
create table public.act_reactions (
  id uuid primary key default gen_random_uuid(),
  act_id uuid not null references public.acts_of_kindness(id) on delete cascade,
  user_id uuid not null,
  reaction text not null default 'heart',
  created_at timestamptz not null default now(),
  unique (act_id, user_id, reaction)
);

create index idx_act_reactions_act on public.act_reactions(act_id);

alter table public.act_reactions enable row level security;

create policy "Reactions are viewable by everyone"
on public.act_reactions for select
using (true);

create policy "Signed-in users can add their own reaction"
on public.act_reactions for insert
with check (auth.uid() = user_id);

create policy "Users can remove their own reaction"
on public.act_reactions for delete
using (auth.uid() = user_id);

-- View: top acts ranked by reaction count in last 7 days
create or replace view public.top_acts_recent as
select
  a.id,
  a.created_at,
  a.mode,
  a.description,
  a.first_name,
  a.photo_paths,
  a.video_url,
  a.language,
  coalesce(r.cnt, 0) as reaction_count
from public.acts_of_kindness a
left join (
  select act_id, count(*)::int as cnt
  from public.act_reactions
  group by act_id
) r on r.act_id = a.id
where a.status = 'published';