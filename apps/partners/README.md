# Partner Portal (`apps/partners`)

partners.pasalopalante.com is where schools and partner orgs log their acts of kindness. Submissions go to a Google Sheet for review, and approved ones are published to the Wall of Kindness.

## How login works

- **One Supabase auth account per partner.** It's created automatically the first time anyone from that school logs in. Nobody ever types its email or password.
- **Each person gets a Staff ID** (e.g. `7KQM-4RTX`). They join from the school's invite link (`/join/<invite_token>`) by typing their name. They log in by picking their school and typing their Staff ID.
- The `partner-auth` edge function checks school + Staff ID (bcrypt-hashed and rate-limited) and returns a one-time token for the school's account. The portal swaps that token for a session.
- The portal uses its **own** Supabase client and storage key (`src/lib/portalClient.ts`), never `@shared`'s cookie session. Logging in as a school therefore never touches a teacher's personal pasalopalante.com/app session.

## Adding a partner

In the Supabase SQL editor:

```sql
insert into public.partners (name, city, pledge_goal)
values ('Escuela Esperanza', 'San Juan, Puerto Rico', 1000)
returning invite_token;
```

Send the coordinator `https://partners.pasalopalante.com/join/<invite_token>`. To remove someone, run `update public.partner_staff set active = false where id = '…'`. To invalidate an invite link, give the partner a new `invite_token`.

## Screens → routes

| Route         | Screen                                  |
|---------------|-----------------------------------------|
| `/login`      | School search + Staff ID                |
| `/join/:token`| Create account → shows the new Staff ID |
| `/`           | Dashboard (empty state when no acts)    |
| `/log`        | Log 1 Act (modal over the dashboard)    |
| `/bulk`       | Bulk Log                                |
| `/done`       | Success                                 |

## Backend pieces

- Migration: `supabase/migrations/20261007120000_partner_portal.sql`
- Edge functions: `partner-auth`, `partner-submit`, `partner-sheet`
- Photos and videos: private `partner-media` Supabase Storage bucket, one folder per partner, 50 MB per file
- Review sheet: `supabase/sheets/` (Apps Script and setup steps)

## Deploy (Cloudflare)

Same as `apps/app`: a static-assets Worker (`wrangler.toml`, name `stagingpartners-pasalopalante`). Create the Cloudflare project from this repo with build command `npm run build:partners`, then add `partners.pasalopalante.com` as its Custom Domain.
