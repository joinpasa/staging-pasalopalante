# Partners Hub (`apps/partners`)

Since 25 Nov 2026 the partner portal is the **Partners Hub**: a social home for organisations, companies and ambassadors (feed, weekly update, kit, map, profile with badges, sharing with consent). Data and access rules: `supabase/migrations/20261125120000_partners_hub.sql`. The team's side is the Partners Hub page in the Kindness Hub (`apps/hub`, `/partners-hub`). Preview with made-up data: `npm run dev -- --mode demo` with `VITE_PARTNERS_DEMO=1` in `.env.demo` (add `?kind=company`, `?kind=ambassador` or `?logo=1`).

What follows is the original portal, which still works underneath.


partners.passkindnessforward.com is where schools and partner orgs log their acts of kindness. Submissions go to a Google Sheet for review, and approved ones are published to the Wall of Kindness.

## How login works

- **One Supabase auth account per partner.** It's created automatically the first time anyone from that school logs in. Nobody ever types its email or password.
- **Each person gets a Staff ID** (e.g. `7KQM-4RTX`). They join from the school's invite link (`/join/<invite_token>`) by typing their name. They log in by picking their school and typing their Staff ID.
- The `partner-auth` edge function checks school + Staff ID (bcrypt-hashed and rate-limited) and returns a one-time token for the school's account. The portal swaps that token for a session.
- The portal uses its **own** Supabase client and storage key (`src/lib/portalClient.ts`), never `@shared`'s cookie session. Logging in as a school therefore never touches a teacher's personal pasalopalante.com/app session.

## Adding a partner

**Normally automatic:** partners who apply through the `/partners/apply` survey get their portal org created once their row in the PKF_Partners sheet is set to Approved (with Portal Access = Yes). The invite link is written into the sheet's Portal Link column and emailed through GHL. See `apps-script/pkf-partners/README.md`. The SQL below is for adding one by hand.

In the Supabase SQL editor:

```sql
insert into public.partners (name, city, pledge_goal, org_type, contact_email)
values ('Escuela Esperanza', 'San Juan, Puerto Rico', 1000, 'school', 'coordinator@example.org')
returning invite_token;
```

`org_type` is one of `school`, `ngo`, `company`, `faith`, `government`, `community`, `other`. It and `contact_email` are optional and show up in the review sheet's **Org type** and **Org contact** columns.

Send the coordinator `https://partners.passkindnessforward.com/join/<invite_token>`. Once they've joined, anyone on the team can open **Invite team** (`/invite`) to get the same link as a QR code: copy/share it, download a QR image for group chats, or print a poster. **Reset link** there issues a new `invite_token` (old links and printed QR codes stop working; people who already joined keep their Kindness IDs). To remove someone, run `update public.partner_staff set active = false where id = '…'`.

## Screens → routes

| Route          | Screen                                                        |
|----------------|---------------------------------------------------------------|
| `/login`       | Email sign-in link, or organisation + Kindness ID             |
| `/link/:token` | Sign-in link from the email (asks for a name the first time)  |
| `/join/:token` | Create account → shows the new Kindness ID                    |
| `/`            | Home: weekly update, then the feed                            |
| `/map`         | Members and pledgers on a map, newest pledges live            |
| `/kit`         | The member's kit, plus pictures made with their logo          |
| `/me`          | Profile, pledge, badges, acts, posts, team                    |
| `/me/edit`     | Edit profile (logo, country, region, links)                   |
| `/story`       | Send us your story (photo, video, testimonial)                |
| `/updates`     | Past weekly updates                                           |
| `/log`, `/edit/:id` | Log 1 Act (over Me)                                      |
| `/bulk`        | Bulk Log                                                      |
| `/invite`      | Invite your team (QR)                                         |
| `/done`        | Success                                                       |

## Backend pieces

- Migration: `supabase/migrations/20261007120000_partner_portal.sql`
- Edge functions: `partner-auth` (also email sign-in links: `email_link`, `redeem`), `partner-submit`, `partner-sheet`
- Photos and videos: private `partner-media` Supabase Storage bucket, one folder per partner, 50 MB per file
- Review sheet: `supabase/sheets/` (Apps Script and setup steps)

## Deploy (Cloudflare)

Same as `apps/app`: a static-assets Worker (`wrangler.toml`, name `partnersportal-pkf` — must match the Cloudflare project name exactly or Workers Builds fails). Create the Cloudflare project from this repo with build command `npm run build:partners`, then add `partners.passkindnessforward.com` as its Custom Domain.
