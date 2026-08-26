CREATE OR REPLACE FUNCTION public.kindness_map_counts()
RETURNS TABLE(country text, acts bigint, commitments bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH a AS (
    SELECT p.country AS country, count(*)::bigint AS c
    FROM public.acts_of_kindness ak
    JOIN public.profiles p ON p.user_id = ak.user_id
    WHERE ak.status = 'published' AND coalesce(btrim(p.country), '') <> ''
    GROUP BY 1
  ), cm AS (
    SELECT c.country AS country, count(*)::bigint AS c
    FROM public.commitments c
    WHERE c.status = 'published' AND coalesce(btrim(c.country), '') <> ''
    GROUP BY 1
  )
  SELECT coalesce(a.country, cm.country),
         coalesce(a.c, 0),
         coalesce(cm.c, 0)
  FROM a FULL JOIN cm ON a.country = cm.country;
$$;

GRANT EXECUTE ON FUNCTION public.kindness_map_counts() TO anon, authenticated;