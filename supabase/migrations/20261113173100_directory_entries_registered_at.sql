-- The directory sheet's new "Date Registered" column (one per roster tab,
-- added 2026-11-13) — when someone's row was first added, not when it was
-- last synced (synced_at already covers that). Nullable: existing rows and
-- any tab/entry that hasn't adopted the new column yet simply have none.
alter table public.directory_entries
  add column registered_at date;
