-- 1. Add missing Data API GRANTs on every public table (idempotent)
DO $$
DECLARE tbl record; has_priv boolean;
BEGIN
  FOR tbl IN
    SELECT c.relname AS table_name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname = 'public'
  LOOP
    SELECT EXISTS (SELECT 1 FROM information_schema.role_table_grants
      WHERE grantee='authenticated' AND table_schema='public' AND table_name=tbl.table_name
        AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) INTO has_priv;
    IF NOT has_priv THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
    END IF;
    SELECT EXISTS (SELECT 1 FROM information_schema.role_table_grants
      WHERE grantee='service_role' AND table_schema='public' AND table_name=tbl.table_name
        AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) INTO has_priv;
    IF NOT has_priv THEN
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
    END IF;
  END LOOP;
END $$;

-- Public-readable tables that need anon SELECT (have permissive RLS)
GRANT SELECT ON public.commitments TO anon;
GRANT SELECT ON public.acts_of_kindness TO anon;
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.badges TO anon;
GRANT SELECT ON public.daily_suggestions TO anon;
GRANT SELECT ON public.legal_document_versions TO anon;
GRANT SELECT ON public.act_reactions TO anon;
GRANT INSERT ON public.user_consents TO anon;

-- 2. Add CRM-ready denormalized fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS help_role text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS org_name text,
  ADD COLUMN IF NOT EXISTS org_type text;

-- 3. Backfill from existing commitments (most recent non-null wins)
UPDATE public.profiles p SET
  help_role = COALESCE(p.help_role, sub.help_role),
  country   = COALESCE(p.country,   sub.country),
  org_name  = COALESCE(p.org_name,  sub.org_name),
  org_type  = COALESCE(p.org_type,  sub.org_type)
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    (SELECT help_role FROM public.commitments c2
      WHERE c2.user_id = c.user_id AND c2.help_role IS NOT NULL
      ORDER BY created_at DESC LIMIT 1) AS help_role,
    (SELECT country FROM public.commitments c2
      WHERE c2.user_id = c.user_id AND c2.country IS NOT NULL
      ORDER BY created_at DESC LIMIT 1) AS country,
    (SELECT org_name FROM public.commitments c2
      WHERE c2.user_id = c.user_id AND c2.org_name IS NOT NULL
      ORDER BY created_at DESC LIMIT 1) AS org_name,
    (SELECT org_type FROM public.commitments c2
      WHERE c2.user_id = c.user_id AND c2.org_type IS NOT NULL
      ORDER BY created_at DESC LIMIT 1) AS org_type
  FROM public.commitments c
  WHERE c.user_id IS NOT NULL
) sub
WHERE p.user_id = sub.user_id;

-- 4. Update handle_new_user to also sync role/org fields onto profile
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
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;

  update public.commitments set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);

  update public.acts_of_kindness set user_id = new.id
   where user_id is null and email is not null and lower(email) = lower(new.email);

  -- Pull latest non-null role/org fields from this user's commitments onto profile
  select
    (select help_role from public.commitments where user_id = new.id and help_role is not null order by created_at desc limit 1),
    (select country   from public.commitments where user_id = new.id and country is not null order by created_at desc limit 1),
    (select org_name  from public.commitments where user_id = new.id and org_name is not null order by created_at desc limit 1),
    (select org_type  from public.commitments where user_id = new.id and org_type is not null order by created_at desc limit 1)
  into latest_help_role, latest_country, latest_org_name, latest_org_type;

  update public.profiles set
    help_role = coalesce(latest_help_role, help_role),
    country   = coalesce(latest_country,   country),
    org_name  = coalesce(latest_org_name,  org_name),
    org_type  = coalesce(latest_org_type,  org_type)
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