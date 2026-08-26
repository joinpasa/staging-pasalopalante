CREATE OR REPLACE FUNCTION public.sync_acts_public_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name AND NEW.display_name IS NOT NULL THEN
    UPDATE public.acts_of_kindness
       SET first_name = NEW.display_name
     WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_acts_name_trg ON public.profiles;
CREATE TRIGGER profiles_sync_acts_name_trg
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_acts_public_name();

CREATE OR REPLACE FUNCTION public.acts_use_profile_public_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE pname text;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT display_name INTO pname FROM public.profiles WHERE user_id = NEW.user_id;
    IF pname IS NOT NULL AND btrim(pname) <> '' THEN
      NEW.first_name := pname;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS acts_use_profile_public_name_trg ON public.acts_of_kindness;
CREATE TRIGGER acts_use_profile_public_name_trg
BEFORE INSERT ON public.acts_of_kindness
FOR EACH ROW EXECUTE FUNCTION public.acts_use_profile_public_name();