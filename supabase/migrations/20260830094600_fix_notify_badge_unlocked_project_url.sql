-- notify_badge_unlocked() was still calling the old Supabase project's
-- send-push function URL (kifjuljtklfayrivzmyq, left over from before this
-- project was split off). Every badge unlock has been silently failing to
-- push-notify since the error is caught and only logged as a warning.
CREATE OR REPLACE FUNCTION public.notify_badge_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
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
      body := jsonb_build_object('user_id', NEW.user_id, 'badge_id', NEW.badge_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_badge_unlocked failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
