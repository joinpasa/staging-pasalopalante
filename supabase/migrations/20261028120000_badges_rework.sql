-- Badge system rework: fewer badges, each earned only through choices the
-- user makes themselves when logging an act (the Gave/Received/Witnessed
-- mode and the now-mandatory "What did you do?" chip) — no more AI tags.
--
-- Every badge now has stages. The rules live in badges.criteria and are the
-- single source of truth: act_badge_progress() reads them for both progress
-- and awarding, and the frontends read them to show which badges an act
-- counted toward. Adding a badge = inserting a row, no function changes.
--
--   {"type": "streak", "stages": [...]}                        best streak ever (days)
--   {"type": "acts", "modes": [...]?, "act_types": [...]?, "stages": [...]}
--                                                              published acts matching
--                                                              every filter given
--
-- user_badges keeps one row per badge with the highest stage reached.

-- 1. Push notifications are paused while the badges are rebuilt, so the
--    backfill below doesn't notify every user for every recomputed stage.
--    Re-created at the end (step 9), firing on every new stage.
DROP TRIGGER IF EXISTS notify_badge_unlocked_trg ON public.user_badges;

-- 2. Chip values become short stable keys (the labels are translated in the
--    frontend). Map acts logged with the old English chip labels.
UPDATE public.acts_of_kindness SET act_type = CASE act_type
    WHEN 'Helped a neighbor'    THEN 'helped_out'
    WHEN 'Gave a compliment'    THEN 'compliment'
    WHEN 'Volunteered'          THEN 'volunteered'
    WHEN 'Donated'              THEN 'donated'
    WHEN 'Paid for someone'     THEN 'treated'
    WHEN 'Listened & supported' THEN 'listened'
    WHEN 'Something else'       THEN 'other'
    ELSE act_type
  END
WHERE act_type IN ('Helped a neighbor', 'Gave a compliment', 'Volunteered', 'Donated',
                   'Paid for someone', 'Listened & supported', 'Something else');

-- 3. Stages on earned badges. Everything is recomputed from scratch below.
ALTER TABLE public.user_badges ADD COLUMN IF NOT EXISTS stage integer NOT NULL DEFAULT 1;
DELETE FROM public.user_badges;

-- 4. The new catalogue.
DELETE FROM public.badges
WHERE id NOT IN ('streak', 'good_word', 'listener', 'gift_giver', 'open_hand',
                 'sleeves_up', 'hug_dealer', 'grateful_heart', 'kindness_spotter');

INSERT INTO public.badges (id, kind, sort_order, icon, criteria,
                           name, name_es, name_fr, name_de,
                           description, description_es, description_fr, description_de) VALUES
  ('streak', 'streak', 0, '🔥',
   '{"type": "streak", "stages": [1, 2, 3, 5, 10, 20, 50]}'::jsonb,
   'Kindness Streak', 'Racha de Bondad', 'Série de Bonté', 'Güte-Serie',
   'Log an act on as many days in a row as you can. Your best run counts.',
   'Registra un acto tantos días seguidos como puedas. Cuenta tu mejor racha.',
   'Enregistre un acte autant de jours d''affilée que possible. Ta meilleure série compte.',
   'Halte an möglichst vielen Tagen hintereinander eine Tat fest. Deine beste Serie zählt.'),
  ('good_word', 'act_type', 10, '💬',
   '{"type": "acts", "modes": ["performed"], "act_types": ["compliment"], "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Good Word', 'Buena Palabra', 'Bonne Parole', 'Gutes Wort',
   'Log “Gave” + “Compliment”', 'Registra “Di” + “Cumplido”',
   'Enregistre « Donné » + « Mot gentil »', 'Halte „Gegeben“ + „Kompliment“ fest'),
  ('listener', 'act_type', 20, '👂',
   '{"type": "acts", "modes": ["performed"], "act_types": ["listened"], "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Deep Listener', 'Escucha Profunda', 'Écoute Profonde', 'Gutes Ohr',
   'Log “Gave” + “Listened”', 'Registra “Di” + “Escucha”',
   'Enregistre « Donné » + « Écoute »', 'Halte „Gegeben“ + „Zugehört“ fest'),
  ('gift_giver', 'act_type', 30, '🎁',
   '{"type": "acts", "modes": ["performed"], "act_types": ["gift"], "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Gift Giver', 'Dador de Regalos', 'Offreur de Cadeaux', 'Schenker',
   'Log “Gave” + “Gift”', 'Registra “Di” + “Regalo”',
   'Enregistre « Donné » + « Cadeau »', 'Halte „Gegeben“ + „Geschenk“ fest'),
  ('open_hand', 'act_type', 40, '🤲',
   '{"type": "acts", "modes": ["performed"], "act_types": ["donated", "treated"], "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Open Hand', 'Mano Abierta', 'Main Ouverte', 'Offene Hand',
   'Log “Gave” + “Donated” or “Treated”', 'Registra “Di” + “Donación” o “Invitación”',
   'Enregistre « Donné » + « Don » ou « Invitation »', 'Halte „Gegeben“ + „Gespendet“ oder „Eingeladen“ fest'),
  ('sleeves_up', 'act_type', 50, '💪',
   '{"type": "acts", "modes": ["performed"], "act_types": ["helped_out", "volunteered"], "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Helping Hand', 'Mano Amiga', 'Coup de Main', 'Helfende Hand',
   'Log “Gave” + “Helped out” or “Volunteered”', 'Registra “Di” + “Ayuda” o “Voluntariado”',
   'Enregistre « Donné » + « Coup de main » ou « Bénévolat »', 'Halte „Gegeben“ + „Geholfen“ oder „Ehrenamt“ fest'),
  ('hug_dealer', 'act_type', 60, '🤗',
   '{"type": "acts", "modes": ["performed", "received"], "act_types": ["hug"], "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Hug Dealer', 'Repartidor de Abrazos', 'Distributeur de Câlins', 'Umarmungs-Profi',
   'Log “Gave” or “Received” + “Hug”', 'Registra “Di” o “Recibí” + “Abrazo”',
   'Enregistre « Donné » ou « Reçu » + « Câlin »', 'Halte „Gegeben“ oder „Empfangen“ + „Umarmung“ fest'),
  ('grateful_heart', 'act_type', 70, '💛',
   '{"type": "acts", "modes": ["received"], "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Grateful Heart', 'Corazón Agradecido', 'Cœur Reconnaissant', 'Dankbares Herz',
   'Log any act as “Received”', 'Registra cualquier acto como “Recibí”',
   'Enregistre n''importe quel acte comme « Reçu »', 'Halte eine beliebige Tat als „Empfangen“ fest'),
  ('kindness_spotter', 'act_type', 80, '👀',
   '{"type": "acts", "modes": ["witnessed"], "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Kindness Spotter', 'Observador de Bondad', 'Repéreur de Bonté', 'Güte-Spotter',
   'Log any act as “Witnessed”', 'Registra cualquier acto como “Presencié”',
   'Enregistre n''importe quel acte comme « Vu »', 'Halte eine beliebige Tat als „Miterlebt“ fest')
ON CONFLICT (id) DO UPDATE SET
  kind = EXCLUDED.kind, sort_order = EXCLUDED.sort_order, icon = EXCLUDED.icon,
  criteria = EXCLUDED.criteria,
  name = EXCLUDED.name, name_es = EXCLUDED.name_es, name_fr = EXCLUDED.name_fr, name_de = EXCLUDED.name_de,
  description = EXCLUDED.description, description_es = EXCLUDED.description_es,
  description_fr = EXCLUDED.description_fr, description_de = EXCLUDED.description_de;

-- 5. Progress for every badge, driven by badges.criteria. `target` is the
--    next stage's threshold (or the last one once every stage is reached).
DROP FUNCTION IF EXISTS public.act_badge_progress(uuid);
CREATE FUNCTION public.act_badge_progress(_user_id uuid)
RETURNS TABLE(badge_id text, current_count bigint, target integer, stage integer, max_stage integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH acts AS (
    SELECT a.mode, a.act_type
    FROM public.acts_of_kindness a
    WHERE a.user_id = _user_id AND a.status = 'published'
  ),
  counts AS (
    SELECT b.id, b.criteria,
           CASE b.criteria->>'type'
             WHEN 'streak' THEN (
               SELECT coalesce(max(us.longest_streak), 0)::bigint FROM public.user_streak(_user_id) us)
             WHEN 'acts' THEN (
               SELECT count(*) FROM acts a
               WHERE (NOT b.criteria ? 'modes'
                      OR a.mode IN (SELECT jsonb_array_elements_text(b.criteria->'modes')))
                 AND (NOT b.criteria ? 'act_types'
                      OR a.act_type IN (SELECT jsonb_array_elements_text(b.criteria->'act_types'))))
           END AS n
    FROM public.badges b
    WHERE b.criteria->>'type' IN ('streak', 'acts')
      AND jsonb_typeof(b.criteria->'stages') = 'array'
  )
  SELECT c.id,
         c.n,
         coalesce(
           (SELECT min(s::int) FROM jsonb_array_elements_text(c.criteria->'stages') s WHERE s::int > c.n),
           (SELECT max(s::int) FROM jsonb_array_elements_text(c.criteria->'stages') s)
         )::int,
         (SELECT count(*) FROM jsonb_array_elements_text(c.criteria->'stages') s WHERE s::int <= c.n)::int,
         jsonb_array_length(c.criteria->'stages')
  FROM counts c
  WHERE _user_id IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.act_badge_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.act_badge_progress(uuid) TO authenticated, service_role;

-- 6. Awarding: raise each badge to the stage reached, never lower it.
--    Returns only the badges whose stage went up in this call.
DROP FUNCTION IF EXISTS public.award_badges_for_user(uuid);
CREATE FUNCTION public.award_badges_for_user(_user_id uuid)
RETURNS TABLE(earned_badge_id text, new_stage integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  -- Same guard as before: through PostgREST only the user themselves (or
  -- the service role) may recompute; a null auth.role() is a direct DB
  -- session (SQL editor, migrations, manual approval) and is trusted.
  IF auth.role() IS NOT NULL
     AND auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() <> _user_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH reached AS (
    SELECT p.badge_id AS bid, p.stage AS st
    FROM public.act_badge_progress(_user_id) p
    WHERE p.stage > 0
  ), upserted AS (
    INSERT INTO public.user_badges AS ub (user_id, badge_id, stage)
    SELECT _user_id, r.bid, r.st FROM reached r
    ON CONFLICT (user_id, badge_id) DO UPDATE
      SET stage = EXCLUDED.stage, earned_at = now()
      WHERE ub.stage < EXCLUDED.stage
    RETURNING ub.badge_id AS bid, ub.stage AS st
  )
  SELECT u.bid, u.st FROM upserted u;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.award_badges_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_badges_for_user(uuid) TO authenticated, service_role;

-- 7. Re-award when an act's mode or chip is edited too, not just its status.
DROP TRIGGER IF EXISTS award_badges_after_act_insert_update ON public.acts_of_kindness;
CREATE TRIGGER award_badges_after_act_insert_update
AFTER INSERT OR UPDATE OF user_id, status, mode, act_type, created_at ON public.acts_of_kindness
FOR EACH ROW
EXECUTE FUNCTION public.award_badges_after_act_change();

-- 8. Backfill everyone with at least one published act.
SELECT public.award_badges_for_user(user_id)
FROM (
  SELECT DISTINCT user_id
  FROM public.acts_of_kindness
  WHERE user_id IS NOT NULL
    AND status = 'published'
) existing_users;

-- 9. Push notification for every new stage. Only reaches members who turned
--    alerts on (a push_subscriptions row exists only after they opt in from
--    the app — off by default). Same delivery path as before, now also
--    firing when an existing badge's stage goes up, with the stage included.
CREATE OR REPLACE FUNCTION public.notify_badge_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage <= OLD.stage THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://tipfbleltjexofsjffwb.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := jsonb_build_object('user_id', NEW.user_id, 'badge_id', NEW.badge_id, 'stage', NEW.stage)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_badge_unlocked failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_badge_unlocked_trg
AFTER INSERT OR UPDATE OF stage ON public.user_badges
FOR EACH ROW EXECUTE FUNCTION public.notify_badge_unlocked();
