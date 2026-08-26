ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS public_name_mode text NOT NULL DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS custom_display_name text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_public_name_mode_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_public_name_mode_check
  CHECK (public_name_mode IN ('initial','full','custom'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_custom_display_name_unique
  ON public.profiles (lower(custom_display_name))
  WHERE custom_display_name IS NOT NULL;

ALTER TABLE public.commitments ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill first/last from existing display_name
UPDATE public.profiles
   SET first_name = COALESCE(first_name, NULLIF(split_part(btrim(display_name), ' ', 1), '')),
       last_name = COALESCE(
         last_name,
         NULLIF(btrim(substring(btrim(display_name) from position(' ' in btrim(display_name)) + 1)), '')
       )
 WHERE display_name IS NOT NULL
   AND btrim(display_name) <> ''
   AND (first_name IS NULL OR last_name IS NULL);

UPDATE public.profiles
   SET last_name = NULL
 WHERE last_name IS NOT NULL AND btrim(last_name) = ''
    OR (last_name IS NOT NULL AND first_name IS NOT NULL AND lower(btrim(last_name)) = lower(btrim(first_name)));

CREATE OR REPLACE FUNCTION public.compute_public_name(
  _mode text, _custom text, _first text, _last text, _fallback text
) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(btrim(
      CASE
        WHEN _mode = 'custom' AND COALESCE(btrim(_custom),'') <> '' THEN btrim(_custom)
        WHEN _mode = 'full' AND COALESCE(btrim(_first),'') <> ''
          THEN btrim(btrim(_first) || ' ' || COALESCE(btrim(_last), ''))
        WHEN COALESCE(btrim(_first),'') <> '' AND COALESCE(btrim(_last),'') <> ''
          THEN btrim(_first) || ' ' || upper(left(btrim(_last), 1)) || '.'
        WHEN COALESCE(btrim(_first),'') <> '' THEN btrim(_first)
        ELSE NULL
      END
    ), ''),
    _fallback
  )
$$;

CREATE OR REPLACE FUNCTION public.profiles_sync_display_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.custom_display_name IS NOT NULL AND btrim(NEW.custom_display_name) = '' THEN
    NEW.custom_display_name := NULL;
  END IF;
  IF NEW.public_name_mode = 'custom' AND NEW.custom_display_name IS NULL THEN
    NEW.public_name_mode := 'initial';
  END IF;
  NEW.display_name := public.compute_public_name(
    NEW.public_name_mode, NEW.custom_display_name, NEW.first_name, NEW.last_name,
    COALESCE(NULLIF(btrim(NEW.display_name), ''), split_part(COALESCE(NEW.email,''), '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_display_name_trg ON public.profiles;
CREATE TRIGGER profiles_sync_display_name_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_display_name();

UPDATE public.profiles SET updated_at = updated_at;

CREATE OR REPLACE FUNCTION public.is_display_name_available(candidate text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND COALESCE(btrim(candidate), '') <> ''
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p
        WHERE lower(p.custom_display_name) = lower(btrim(candidate))
          AND p.user_id <> auth.uid()
     )
$$;

REVOKE ALL ON FUNCTION public.is_display_name_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_display_name_available(text) TO authenticated, service_role;

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
  latest_help_role text;
  latest_country text;
  latest_org_name text;
  latest_org_type text;
  latest_first text;
  latest_last text;
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;

  update public.commitments set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);

  update public.acts_of_kindness set user_id = new.id
   where user_id is null and email is not null and lower(email) = lower(new.email);

  select
    (select help_role from public.commitments where user_id = new.id and help_role is not null order by created_at desc limit 1),
    (select country   from public.commitments where user_id = new.id and country is not null order by created_at desc limit 1),
    (select org_name  from public.commitments where user_id = new.id and org_name is not null order by created_at desc limit 1),
    (select org_type  from public.commitments where user_id = new.id and org_type is not null order by created_at desc limit 1),
    (select first_name from public.commitments where user_id = new.id and first_name is not null order by created_at desc limit 1),
    (select last_name  from public.commitments where user_id = new.id and last_name is not null order by created_at desc limit 1)
  into latest_help_role, latest_country, latest_org_name, latest_org_type, latest_first, latest_last;

  update public.profiles set
    help_role  = coalesce(latest_help_role, help_role),
    country    = coalesce(latest_country,   country),
    org_name   = coalesce(latest_org_name,  org_name),
    org_type   = coalesce(latest_org_type,  org_type),
    first_name = coalesce(latest_first,     first_name),
    last_name  = coalesce(latest_last,      last_name)
  where user_id = new.id;

  for c in
    select id, org_name, org_website
      from public.commitments
     where user_id = new.id and type = 'organization' and coalesce(org_name, '') <> ''
  loop
    if position(' — ' in c.org_name) > 0 then
      parsed_name := split_part(c.org_name, ' — ', 1);
      parsed_chapter := split_part(c.org_name, ' — ', 2);
    else
      parsed_name := c.org_name;
      parsed_chapter := null;
    end if;

    select id into org_id_v from public.organizations
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

  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict do nothing;

  return new;
end;
$function$;