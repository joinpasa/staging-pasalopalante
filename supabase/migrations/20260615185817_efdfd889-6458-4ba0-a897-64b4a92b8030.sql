
-- 1. One-time backfill of orphans
UPDATE public.acts_of_kindness a
   SET user_id = u.id
  FROM auth.users u
 WHERE a.user_id IS NULL
   AND a.email IS NOT NULL
   AND lower(a.email) = lower(u.email);

UPDATE public.commitments c
   SET user_id = u.id
  FROM auth.users u
 WHERE c.user_id IS NULL
   AND c.email IS NOT NULL
   AND lower(c.email) = lower(u.email);

-- 2. Auto-link + lock trigger for acts_of_kindness
CREATE OR REPLACE FUNCTION public.acts_link_and_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE matched uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.user_id IS NOT NULL
       AND (NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
      RAISE EXCEPTION
        'acts_of_kindness.user_id is immutable once set (act %)', OLD.id;
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS acts_link_and_lock_trg ON public.acts_of_kindness;
CREATE TRIGGER acts_link_and_lock_trg
BEFORE INSERT OR UPDATE ON public.acts_of_kindness
FOR EACH ROW EXECUTE FUNCTION public.acts_link_and_lock();

-- 3. Auto-link + lock trigger for commitments
CREATE OR REPLACE FUNCTION public.commitments_link_and_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE matched uuid;
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS commitments_link_and_lock_trg ON public.commitments;
CREATE TRIGGER commitments_link_and_lock_trg
BEFORE INSERT OR UPDATE ON public.commitments
FOR EACH ROW EXECUTE FUNCTION public.commitments_link_and_lock();
