-- Links a partner-portal organization to its row in the PKF_Partners Google
-- Sheet (the sheet's own row ID, e.g. "BUS-008"). sync-partners creates the
-- portal org the first time a row is both Approved and marked Portal Access =
-- Yes, and uses this column to never create it twice. Orgs added by hand
-- (SQL editor) keep it null; sync-partners links those by name instead of
-- creating a duplicate.
alter table public.partners
  add column if not exists sheet_entry_id text unique;

-- When sync-partners last pushed this org's portal invite link to the
-- contact's GHL record (custom field partner_portal_url + tag
-- partner-portal-invite, which a GHL workflow turns into the invite email).
-- Null = not pushed yet; retried on every sync until it succeeds.
alter table public.partners
  add column if not exists ghl_invite_pushed_at timestamptz;
