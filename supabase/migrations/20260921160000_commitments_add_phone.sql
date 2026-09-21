-- The new quick pledge form (homepage "Get Involved" inline form) collects a
-- phone number so ambassadors/outreach can follow up during Global Kindness
-- Season. GHL already accepts phone via ppl-signup's ghlUpsertContact; this
-- just lets submit-commitment persist it alongside the rest of the pledge.
alter table public.commitments add column if not exists phone text;
