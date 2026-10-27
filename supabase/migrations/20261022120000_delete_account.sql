-- Self-service account deletion (the "Delete account" button on
-- /account/settings, via the delete-account edge function).
--
-- 1. acts_of_kindness.to_user_id was added without an ON DELETE rule, so it
--    defaulted to NO ACTION — deleting any user who had ever been named as
--    the recipient of a /wave hand-off act would fail outright. The act
--    belongs to its giver, so it should survive; it just stops pointing at
--    the deleted recipient.
--    Drops whatever FK is on the column rather than assuming the default
--    constraint name, so a differently-named one can't survive alongside.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att
        ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
     WHERE con.conrelid = 'public.acts_of_kindness'::regclass
       AND con.contype = 'f'
       AND att.attname = 'to_user_id'
  LOOP
    EXECUTE format('ALTER TABLE public.acts_of_kindness DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.acts_of_kindness
  ADD CONSTRAINT acts_of_kindness_to_user_id_fkey
  FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Deletes everything tied to a user that does NOT already go away via
--    ON DELETE CASCADE when the auth.users row is removed. Runs in a single
--    transaction, so it either fully happens or not at all, and it's safe to
--    re-run (the edge function retries cleanly if a later step failed).
--
--    Already handled by cascade on auth.users delete (done by the edge
--    function right after this): profiles, user_roles, org_members,
--    reminders, user_badges, push_subscriptions, pass_handoffs, thanks they
--    sent; partners.account_user_id is set to null.
--
--    Rows are matched by user_id AND, for tables that used to accept
--    anonymous submissions, by email with no user_id — signup claims those
--    by email (acts_link_and_lock / commitments_link_and_lock), so leaving
--    them behind would both keep personal data and silently re-attach it if
--    the same email ever signs up again.
--
--    Kept on purpose: suppressed_emails (a do-not-email list must outlive
--    the account, or a bounced/complained address could be mailed again).
--
--    Returns the kindness-photos storage paths that are no longer referenced
--    by any remaining act, for the edge function to remove from storage
--    (SQL can't delete storage files directly).
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid, _email text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email_l text := lower(nullif(trim(_email), ''));
  _photos text[];
BEGIN
  -- Collect photo paths of the acts about to be deleted.
  SELECT coalesce(array_agg(DISTINCT p), '{}')
    INTO _photos
    FROM public.acts_of_kindness a, unnest(a.photo_paths) AS p
   WHERE a.user_id = _user_id
      OR (a.user_id IS NULL AND _email_l IS NOT NULL AND lower(a.email) = _email_l);

  -- Acts (reactions, thanks and translations on them cascade).
  DELETE FROM public.acts_of_kindness
   WHERE user_id = _user_id
      OR (user_id IS NULL AND _email_l IS NOT NULL AND lower(email) = _email_l);

  DELETE FROM public.commitments
   WHERE user_id = _user_id
      OR (user_id IS NULL AND _email_l IS NOT NULL AND lower(email) = _email_l);

  -- Reactions this user left on other people's acts (no FK to auth.users).
  DELETE FROM public.act_reactions WHERE user_id = _user_id;

  DELETE FROM public.feature_interest WHERE user_id = _user_id;

  DELETE FROM public.moderation_logs
   WHERE user_id = _user_id
      OR (_email_l IS NOT NULL AND lower(email) = _email_l);

  DELETE FROM public.user_consents
   WHERE user_id = _user_id
      OR (_email_l IS NOT NULL AND lower(email) = _email_l);

  IF _email_l IS NOT NULL THEN
    DELETE FROM public.email_unsubscribe_tokens WHERE lower(email) = _email_l;
    DELETE FROM public.email_send_log WHERE lower(recipient_email) = _email_l;
  END IF;

  -- Referral links pointing at this user (no FK).
  UPDATE public.profiles SET referred_by = NULL WHERE referred_by = _user_id;

  -- Groups this user is the only member of would be left empty and
  -- unreachable — remove them. Groups with other members stay.
  DELETE FROM public.organizations o
   WHERE EXISTS (SELECT 1 FROM public.org_members m
                  WHERE m.org_id = o.id AND m.user_id = _user_id)
     AND NOT EXISTS (SELECT 1 FROM public.org_members m
                      WHERE m.org_id = o.id AND m.user_id <> _user_id);

  -- Only hand back photos nobody else's act still points at.
  RETURN coalesce((
    SELECT array_agg(p) FROM unnest(_photos) AS p
     WHERE NOT EXISTS (SELECT 1 FROM public.acts_of_kindness a
                        WHERE p = ANY (a.photo_paths))
  ), '{}');
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid, text) TO service_role;
