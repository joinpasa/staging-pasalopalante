# Partner submissions → Google Sheets review

Schools log acts in the partner portal. They land in a Google Sheet. You set **Status** to **Approved** and the act goes live on the Wall of Kindness (website and app).

```
Partner portal ──► partner-submit ──► partner_submissions (pending)
                                            │  pulled every minute
                                            ▼
                                     Google Sheet ("Submissions" tab)
                                            │  Status edited
                                            ▼
                 partner-sheet "review" ──► Approved: published acts_of_kindness row (wall)
                                            Other:   wall row taken down again
```

Supabase stays the source of truth, and the Sheet is a review surface. Deleting a row in the Sheet does nothing to the submission. Change its Status instead.

## One-time setup (about 5 minutes)

1. **Pick a secret.** Any long random string works, e.g. from `openssl rand -hex 32`.
2. **Give it to Supabase.** Dashboard → Edge Functions → Secrets → add `PARTNER_SHEET_SECRET` = that string.
3. **Create the Sheet.** New Google Sheet → **Extensions → Apps Script**. Delete the sample code and paste in [`partner-review.gs`](./partner-review.gs).
4. **Script properties.** In the Apps Script editor go to Project Settings (gear) → Script properties and add:
   - `SUPABASE_URL` = `https://tipfbleltjexofsjffwb.supabase.co`
   - `SHEET_SECRET` = the same string from step 1
5. **Run `setup`.** Pick `setup` in the function dropdown, click **Run** and approve the Google permissions. That creates the tab, the Status dropdown, the every-minute sync and the edit trigger.

`setup` also writes the header row. Don't type headers yourself; the script finds columns by name and order.

After that the Sheet fills itself. **Partner review → Sync now** forces an immediate pull.

## Columns

**Status · Note · Organization · Org type · What happened · People · Act date · Photos / videos · Media · Media consent · YouTube link** · Submitted by · City · Submitted · Batch · Reviewed by · Reviewed at · Org contact · Last synced · Submission ID

- The review columns are on the left, and Status, Note and Organization stay frozen while you scroll.
- **Media** summarizes attachments ("2 photos · 1 video" / "None"). Filter it for "video" to find rows that need a YouTube upload.
- **Batch** is shared by every row from one Bulk Log submission.
- **Reviewed by / Reviewed at** fill in automatically when someone changes Status. Reviewed by needs the reviewer to be in the same Google Workspace as the script's owner, otherwise it stays blank.
- **Org type / Org contact** come from the partner record (see `apps/partners/README.md`).
- Don't edit **Submission ID**; it's how each row is matched back to the database.

## Reviewing

| Status        | What happens                                                         |
|---------------|----------------------------------------------------------------------|
| Pending       | Default. Not on the wall.                                            |
| Approved      | Published to the wall with the organization's name and its photos.   |
| Needs Changes | Not on the wall. The organization sees "Needs Changes" and your **Note**. |
| Rejected      | Not on the wall.                                                     |

- You can change your mind. Moving an Approved row to anything else takes it off the wall again.
- Photo/video links in the sheet are private, signed links that work for 30 days.
- **Videos → YouTube link column.** Download the video from the row's link, upload it to the YouTube channel as **Public or Unlisted** (Private videos can't play on the wall), and paste the YouTube URL into **YouTube link**. Any youtube.com, youtu.be or Shorts link works. Once the row is Approved, the video plays on the website's Wall of Kindness. Paste the link before or after approving, either works. Clear the cell to remove it.
- **Which channel account doesn't matter.** Upload from the temporary Gmail-owned channel now and transfer it to the Workspace account later. Video URLs don't change when a channel changes owners, so everything already on the wall keeps playing.
- If **Last synced** shows `ERROR: …`, the status change didn't reach Supabase. Fix the cause (usually a wrong secret) and change the Status again.
