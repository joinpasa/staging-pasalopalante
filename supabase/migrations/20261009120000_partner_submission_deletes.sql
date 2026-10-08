-- Organizations can permanently delete their own acts from the portal
-- (partner-submit action "delete"): the submission, its uploaded media and,
-- if it was approved, its Wall row are removed for good. This table only
-- remembers THAT it happened, so the review sheet can grey out the row
-- instead of leaving a stale one — it keeps no copy of the content.
create table public.partner_deleted_submissions (
  submission_id uuid primary key,
  partner_id uuid references public.partners(id) on delete cascade,
  deleted_by_staff_id uuid references public.partner_staff(id) on delete set null,
  deleted_by_name text,
  deleted_at timestamptz not null default now(),
  sheet_synced_at timestamptz
);

create index partner_deleted_submissions_unsynced_idx
  on public.partner_deleted_submissions (deleted_at) where sheet_synced_at is null;

alter table public.partner_deleted_submissions enable row level security;
revoke all on public.partner_deleted_submissions from anon, authenticated;
