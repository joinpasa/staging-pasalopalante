-- Thumbnail for a social-link act (Facebook/Instagram/TikTok/X) scraped
-- from the post's own Open Graph <meta> tags by the new fetch-link-preview
-- function, fire-and-forget from submit-act. Nullable and best-effort: a
-- platform that blocks the fetch, rate-limits it, or simply has no og:image
-- just leaves this null, and the Wall already falls back to a plain
-- "View on <platform>" card with no image in that case.
alter table public.acts_of_kindness
  add column if not exists link_preview_image text;
