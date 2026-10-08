-- Login screen: the whole organization list in one call, so the portal can
-- filter it instantly in the browser instead of a round trip per keystroke
-- (search_partners felt like a 2–4 s wait on the live site). Same public
-- fields search_partners already exposes: names and cities only.
create or replace function public.list_partners()
returns table (id uuid, name text, city text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.city from public.partners p order by p.name limit 5000
$$;

revoke execute on function public.list_partners() from public;
grant execute on function public.list_partners() to anon, authenticated;
