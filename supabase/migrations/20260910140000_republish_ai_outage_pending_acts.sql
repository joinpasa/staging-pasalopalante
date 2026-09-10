-- One-time backfill: submit-act holds an act as status='pending' whenever
-- AI moderation returns anything other than "approved" - including when the
-- AI service itself was unavailable (rate-limited/down), a case that says
-- nothing about the content and was never meant to sit unpublished
-- indefinitely. Only republishes acts stuck for that specific reason - acts
-- the AI actually reviewed and was uncertain about (a different
-- moderation_reason) are left pending for real human review, unchanged.
UPDATE public.acts_of_kindness
SET status = 'published'
WHERE status = 'pending'
  AND moderation_reason = 'Automated moderation was unavailable — held for manual review.';
