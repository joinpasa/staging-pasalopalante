CREATE OR REPLACE FUNCTION public.referrer_display_name(code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.display_name IS NULL OR btrim(p.display_name) = '' THEN NULL
    WHEN array_length(regexp_split_to_array(btrim(p.display_name), '\s+'), 1) > 1
      THEN (regexp_split_to_array(btrim(p.display_name), '\s+'))[1] || ' ' ||
           upper(left((regexp_split_to_array(btrim(p.display_name), '\s+'))[array_length(regexp_split_to_array(btrim(p.display_name), '\s+'), 1)], 1)) || '.'
    ELSE (regexp_split_to_array(btrim(p.display_name), '\s+'))[1]
  END
  FROM public.profiles p
  WHERE p.referral_code = code
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.referrer_display_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referrer_display_name(text) TO anon, authenticated, service_role;