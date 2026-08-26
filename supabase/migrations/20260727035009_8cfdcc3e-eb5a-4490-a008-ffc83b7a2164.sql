DO $$
BEGIN
  PERFORM net.http_post(
    url := 'https://kifjuljtklfayrivzmyq.supabase.co/functions/v1/classify-act',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{"backfill": true, "limit": 100}'::jsonb,
    timeout_milliseconds := 300000
  );
END $$;