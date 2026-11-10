-- "Founding Partner" flag for /partners: rows marked Yes in the PKF_Partners
-- sheet's "Founding Partner" column get a yellow "Founding Organization
-- Partner" tag on their card. Synced by sync-partners like every other
-- column; defaults to false so existing rows and older script versions that
-- don't send it are unaffected.
alter table public.partner_entries
  add column if not exists founding boolean not null default false;
