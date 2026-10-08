-- Partner organization type + coordinator contact, for the review sheet's
-- "Org type" and "Org contact" columns (and season reporting by type, now
-- that NGOs and other orgs join alongside schools). Both optional; set them
-- when adding a partner:
--   insert into public.partners (name, city, pledge_goal, org_type, contact_email)
--   values ('Comedor Esperanza', 'Ponce, Puerto Rico', 500, 'ngo', 'coord@example.org');
alter table public.partners
  add column if not exists org_type text
    check (org_type is null or org_type in ('school', 'ngo', 'company', 'faith', 'government', 'community', 'other')),
  add column if not exists contact_email text
    check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
