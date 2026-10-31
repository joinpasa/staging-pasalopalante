-- "My country" filter on the Wall (website and app): published acts whose
-- author's profile country matches. Acts carry no country of their own and
-- profiles aren't publicly readable, so this returns only act ids (already
-- public) — the client then fetches the rows through its normal acts query.
CREATE OR REPLACE FUNCTION public.wall_act_ids_by_country(
  _country text,
  _mode text DEFAULT NULL,
  _with_description boolean DEFAULT false,
  _limit integer DEFAULT 20,
  _offset integer DEFAULT 0
)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ak.id
  FROM public.acts_of_kindness ak
  JOIN public.profiles p ON p.user_id = ak.user_id
  WHERE ak.status = 'published'
    AND coalesce(btrim(_country), '') <> ''
    AND lower(btrim(p.country)) = lower(btrim(_country))
    AND (_mode IS NULL OR ak.mode = _mode)
    AND (NOT _with_description OR coalesce(btrim(ak.description), '') <> '')
  ORDER BY ak.created_at DESC
  LIMIT least(greatest(_limit, 0), 200)
  OFFSET greatest(_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.wall_act_ids_by_country(text, text, boolean, integer, integer) TO anon, authenticated;
