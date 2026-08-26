GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitments TO authenticated;
GRANT SELECT ON public.commitments TO anon;
GRANT ALL ON public.commitments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acts_of_kindness TO authenticated;
GRANT SELECT ON public.acts_of_kindness TO anon;
GRANT ALL ON public.acts_of_kindness TO service_role;
NOTIFY pgrst, 'reload schema';