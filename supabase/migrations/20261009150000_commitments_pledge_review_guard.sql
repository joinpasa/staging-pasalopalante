-- submit-commitment now holds any pledge_count over a per-type threshold
-- as status='pending' instead of auto-publishing, so a single oversized
-- (spam/joke/bot) submission can no longer skew the public "Acts pledged"
-- total. But that's an application-layer check in one edge function, and
-- commitments already has an RLS policy letting a signed-in user UPDATE
-- their own row directly from the client (the account page's "modify
-- pledge" editors in YourCommitment.tsx / YourGroup.tsx do exactly that,
-- with no edge function in between) — so the same oversized-number problem
-- was still reachable by editing an existing commitment after the fact,
-- completely bypassing the new threshold check. Enforcing it here too,
-- at the row level, closes that gap regardless of which client path wrote
-- the row.
--
-- The guard only fires when auth.uid() = NEW.user_id — i.e. a regular
-- signed-in user editing their own row through PostgREST/RLS. It's a
-- no-op when auth.uid() is NULL, which is the case both for the
-- submit-commitment edge function (it already computed the right status
-- itself, using the service role key, which bypasses RLS and sets no JWT
-- claims) and for a human approving a held pledge by hand in the Supabase
-- Table Editor or SQL editor (same reason) — so the documented approval
-- step ("open commitments, change status from pending to published")
-- keeps working undisturbed.
CREATE OR REPLACE FUNCTION public.commitments_link_and_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched uuid;
  review_threshold integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.user_id IS NOT NULL
       AND (NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
      RAISE EXCEPTION
        'commitments.user_id is immutable once set (commitment %)', OLD.id;
    END IF;
  END IF;

  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO matched FROM auth.users
     WHERE lower(email) = lower(NEW.email)
     LIMIT 1;
    IF matched IS NOT NULL THEN
      NEW.user_id := matched;
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    review_threshold := CASE WHEN NEW.type = 'organization' THEN 1000000 ELSE 10000 END;
    IF NEW.pledge_count > review_threshold THEN
      NEW.status := 'pending';
      NEW.moderation_reason := format(
        'Pledge count %s exceeds the %s auto-publish threshold for %s commitments — held for review.',
        NEW.pledge_count, review_threshold, NEW.type
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger definition is unchanged (still BEFORE INSERT OR UPDATE, same
-- function name) — CREATE OR REPLACE FUNCTION above is enough to apply
-- this everywhere the existing trigger already runs.
