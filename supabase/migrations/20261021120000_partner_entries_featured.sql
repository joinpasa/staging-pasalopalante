-- "Featured" flag for /partners: rows marked Featured in the PKF_Partners
-- sheet show in a highlighted section at the top of the page (they still
-- appear in the full directory below too). Synced by sync-partners like
-- every other column; defaults to false so existing rows and older script
-- versions that don't send it are unaffected.
alter table public.partner_entries
  add column if not exists featured boolean not null default false;
