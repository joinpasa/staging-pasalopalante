-- Partner submissions: YouTube link set from the review sheet.
--
-- Reviewers upload a submission's video to the org's YouTube channel (any
-- Google account that manages it — channel ownership can change later
-- without breaking anything, since watch URLs never change) and paste the
-- link into the sheet's "YouTube link" column. partner-sheet stores it here
-- and copies it onto the Wall row's video_url, which the website wall
-- already embeds.
alter table public.partner_submissions
  add column if not exists youtube_url text
    check (youtube_url is null or youtube_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$');
