UPDATE public.acts_of_kindness
SET first_name = COALESCE(NULLIF(trim(first_name), ''), (SELECT split_part(display_name, ' ', 1) FROM public.profiles WHERE user_id = acts_of_kindness.user_id))
WHERE id = 'fbda3137-2683-4130-8d3d-2c662c0d9cde';