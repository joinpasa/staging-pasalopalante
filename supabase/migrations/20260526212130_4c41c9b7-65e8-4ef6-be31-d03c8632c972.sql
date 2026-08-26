ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_password boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET has_password = true WHERE user_id = '109ad954-4fc4-4ac7-a419-4e9e76178782';