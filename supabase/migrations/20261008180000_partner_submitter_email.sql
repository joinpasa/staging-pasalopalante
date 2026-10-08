-- "Needs Changes" emails go to the person who logged the act (cc the
-- organization's contact), not only the org contact — one organization can
-- have 50+ people logging. The portal asks for the submitter's email on the
-- log forms, pre-fills it per person, and also saves it on their
-- partner_staff row so it follows them to another device.
alter table public.partner_submissions
  add column if not exists submitter_email text
    check (submitter_email is null or submitter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

alter table public.partner_staff
  add column if not exists email text
    check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- The portal reads its own staff member's saved email to pre-fill the field.
grant select (email) on public.partner_staff to authenticated;
