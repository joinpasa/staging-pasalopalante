
-- Add email to acts_of_kindness
ALTER TABLE public.acts_of_kindness ADD COLUMN IF NOT EXISTS email text;
CREATE INDEX IF NOT EXISTS acts_of_kindness_email_lower_idx ON public.acts_of_kindness (lower(email));

-- Update handle_new_user to also claim acts by email and create org + leader membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  c record;
  org_id_v uuid;
  parsed_name text;
  parsed_chapter text;
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;

  -- Claim previously anonymous commitments by email
  update public.commitments
     set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);

  -- Claim previously anonymous acts by email
  update public.acts_of_kindness
     set user_id = new.id
   where user_id is null and email is not null and lower(email) = lower(new.email);

  -- For each organization commitment owned by this user, ensure org + leader membership
  for c in
    select id, org_name, org_website
      from public.commitments
     where user_id = new.id
       and type = 'organization'
       and coalesce(org_name, '') <> ''
  loop
    -- Split "Name — Chapter" if present
    if position(' — ' in c.org_name) > 0 then
      parsed_name := split_part(c.org_name, ' — ', 1);
      parsed_chapter := split_part(c.org_name, ' — ', 2);
    else
      parsed_name := c.org_name;
      parsed_chapter := null;
    end if;

    select id into org_id_v
      from public.organizations
     where lower(name) = lower(parsed_name)
       and coalesce(lower(chapter), '') = coalesce(lower(parsed_chapter), '')
     limit 1;

    if org_id_v is null then
      insert into public.organizations (name, chapter, website)
      values (parsed_name, parsed_chapter, c.org_website)
      returning id into org_id_v;
    end if;

    insert into public.org_members (org_id, user_id, is_leader)
    values (org_id_v, new.id, true)
    on conflict do nothing;
  end loop;

  -- Default member role
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict do nothing;

  return new;
end;
$function$;
