-- Partner pledges from the PKF_Partners sheet count toward the site's
-- "Acts pledged" total. sync-partners keeps one organization commitment per
-- Approved sheet row with a Pledge, keyed by the sheet's row ID (e.g.
-- "BUS-008"): created on approval, updated when the number changes, removed
-- when the row is no longer Approved or the pledge is cleared. These rows
-- carry no email/user_id on purpose, so they never attach to the contact
-- person's own website account.
alter table public.commitments
  add column if not exists partner_sheet_id text unique;
