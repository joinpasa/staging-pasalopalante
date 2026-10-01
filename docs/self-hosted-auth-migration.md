# Moving Auth + Postgres off Supabase's hosted plan

**Why now, not later:** Supabase bills by Monthly Active Users (MAU) — at low
volume (today: well under 20 MAU) that's invisible ($25/mo base), but the cost
model built this session shows it scaling to ~$11k/month at the 10M-registered-
user milestone (3.5M MAU), and that one line item is 90%+ of the bill at every
milestone past 1M users. Doing this migration now, with a handful of real
users and nothing at stake, is the version of this project that's a quiet
dry run instead of an emergency.

**What this does and doesn't change:** your app talks to Supabase through the
standard `supabase-js` client (`supabase.auth.signInWithPassword`, `signUp`,
`signInWithOtp`, `signInWithOAuth`, `resetPasswordForEmail` — all in
`packages/shared/src/contexts/AuthContext.tsx`), and your RLS policies key off
`auth.uid()`. Both of those are implemented by **GoTrue** (Supabase's open-
source Auth server, MIT-licensed) sitting in front of **Postgres** — the same
software Supabase's hosted plan runs for you today. Self-hosting means running
that exact same pair yourself. The app code does not change — only the URL and
keys it points at. Edge Functions, Realtime (the Wall's live updates), and
Storage are **out of scope for this first move** — leave them on Supabase for
now; they're cheap and usage-based, not the cost driver. Revisit them
separately later if it's ever worth it.

Verified against the real, current official self-hosting setup (pulled
2026-10-01 from `github.com/supabase/supabase/docker/`, not guessed from
training data): Postgres `supabase/postgres:17.6.1.136`, Auth
`supabase/gotrue:v2.196.0`, gateway `envoyproxy/envoy:v1.39.1` (the compose
file still aliases it as `kong` for compatibility with anything that assumes
that hostname). **Confirm these are still current** before you start — this
moves fast and the versions above are a snapshot, not a permanent fact.

## What you'll need

- A VPS. Current project size (72 migrations, 336KB of schema, <20 MAU) needs
  very little — a $10–20/mo tier (2GB+ RAM) from any mainstream provider is
  comfortably enough to start, with headroom to grow before you'd need to
  resize. (Ballpark only — get an actual current quote before committing;
  this session's sandbox can't reach vendor pricing pages to verify live.)
- Docker + Docker Compose on that server.
- A subdomain for the new Auth/API endpoint, e.g. `auth.pasalopalante.com`,
  with TLS (Caddy or Traefik in front of the stack handles this with one
  config block — not included in Supabase's own compose file, which assumes
  you're putting something like that in front of it).
- **Don't reuse any secret from the live hosted Supabase project.** The new
  stack generates its own `POSTGRES_PASSWORD` and `JWT_SECRET` — the hosted
  project's secrets aren't transferable and shouldn't be reused for a
  different server.

## Steps

### 1. Get the real self-hosting files — don't hand-build them

`docker-compose.yml` on its own is not enough: the `db` service mounts six
init SQL scripts and the gateway mounts four Envoy config files, all living
under `docker/volumes/` in the official repo. Clone that directory wholesale
rather than reconstructing it from the compose file alone — the files are
wired together in ways that are easy to get subtly wrong by hand, and this is
auth infrastructure, not a place to improvise.

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

### 2. Generate real secrets

Replace in `.env`:
- `POSTGRES_PASSWORD` — long random string, generated fresh for this server.
- `JWT_SECRET` — 32+ random characters, generated fresh for this server.
- `ANON_KEY` / `SERVICE_ROLE_KEY` — these are JWTs *signed with* `JWT_SECRET`.
  Supabase's docs include a generator for this pairing (don't hand-edit the
  example tokens — they're signed with the demo project's secret, not yours).

These two new keys (`ANON_KEY`, `SERVICE_ROLE_KEY`) are what replace
`VITE_SUPABASE_ANON_KEY` / the service role key your apps and edge functions
currently use — this is the one place the app side needs a real config
change, not a code change.

### 3. Point it at this project

In `.env`:
- `SITE_URL` → `https://pasalopalante.com`
- `ADDITIONAL_REDIRECT_URLS` → add `https://passkindnessforward.com`,
  `https://app.pasalopalante.com`, and any preview/staging origins the apps
  use for post-auth redirects.
- `API_EXTERNAL_URL` / `SUPABASE_PUBLIC_URL` → `https://auth.pasalopalante.com`
  (whatever subdomain you point at this server).
- `DISABLE_SIGNUP` → `false` (keep signups open, same as today).
- `ENABLE_EMAIL_AUTOCONFIRM` → `false` (keep the confirmation-email step,
  same as today's behavior).

### 4. Email — reuse what you already have

`process-email-queue` already sends through Resend (`RESEND_API_KEY`). Resend
offers an SMTP relay, so GoTrue's mailer can use the same provider — no new
vendor, no new account:

```
SMTP_ADMIN_EMAIL=<a real sending address on your domain>
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<your Resend API key>
SMTP_SENDER_NAME=Pásalo Pa'lante
```
(Confirm Resend's current SMTP host/port against their own docs before
using — not independently verified this session.)

### 5. Google OAuth — reuse the existing client, don't create a new one

In the Google Cloud Console, open the **existing** OAuth client this project
already uses (check `AuthContext.tsx`'s `signInWithGoogle` — the client
ID/secret live in the hosted Supabase project's Auth settings today, not in
this repo) and add the new server's callback URL to its authorized redirect
URIs:

```
https://auth.pasalopalante.com/auth/v1/callback
```

Then in `.env`, uncomment and fill in (these are commented out by default in
the official compose file):

```
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<same client ID already in use>
GOTRUE_EXTERNAL_GOOGLE_SECRET=<same client secret already in use>
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://auth.pasalopalante.com/auth/v1/callback
```

### 6. Bring up the stack, replay the schema

```bash
docker compose up -d
```

Then apply this repo's own schema on top of the fresh database — these are
already version-controlled SQL files, this is not new work:

```bash
for f in supabase/migrations/*.sql; do
  psql "$NEW_POSTGRES_CONNECTION_STRING" -f "$f"
done
```

### 7. Migrate existing accounts — don't make anyone reset their password

GoTrue stores password hashes in `auth.users.encrypted_password` using the
same hashing whether hosted or self-hosted. Dumping and restoring that table
(and `auth.identities`, for anyone who signed in with Google) carries existing
accounts over intact — nobody has to reset anything:

```bash
pg_dump "$OLD_HOSTED_SUPABASE_CONNECTION_STRING" \
  --schema=auth --data-only -t auth.users -t auth.identities \
  > auth_data.sql
psql "$NEW_POSTGRES_CONNECTION_STRING" -f auth_data.sql
```

Get the hosted project's connection string from the Supabase dashboard
(Project Settings → Database) — this session has no network path to
`*.supabase.co` to pull it directly, per this repo's own CLAUDE.md.

### 8. Point the apps at the new server — staging first

Update `VITE_SUPABASE_URL` → `https://auth.pasalopalante.com` and
`VITE_SUPABASE_ANON_KEY` → the new `ANON_KEY` from step 2, for **both**
`apps/website` and `apps/app`. Do this on a staging/preview deploy first, not
production — this is exactly the kind of change CLAUDE.md's auth-verification
rule exists for.

### 9. Test all four auth flows before cutover

Per this repo's standing rule: login, signup, Google OAuth, and forgot-
password, actually exercised in a browser against the new server — not just
"the build succeeded." Also confirm RLS still resolves correctly by logging
an act and viewing an account page while signed in against the new Auth
server, since that's `auth.uid()` doing real work, not just login succeeding.

### 10. Cut over, keep a rollback path

Deploy the env var change to production. **Don't delete or downgrade the old
hosted Supabase project yet** — keep it live and untouched for a week or two.
If anything surfaces, flipping `VITE_SUPABASE_URL` back is a one-line revert.

### 11. After the rollback window

Decide what happens to the old Supabase project — drop to Free tier if edge
functions still need to live there, or decommission entirely if those get
moved too in a later, separate project.

## What this doesn't solve — own these going forward

Supabase's hosted plan was quietly doing these for you. Self-hosting means
someone on the team now owns:
- **Backups.** Set up automated `pg_dump` (or your provider's volume
  snapshots) on a schedule — there's a 20GB+ database with real user accounts
  on this server and no managed backup unless you add one.
- **Security patching** of the Docker images over time (watch for new GoTrue
  /Postgres releases, especially security ones).
- **Uptime.** No managed failover — if this one server goes down, auth goes
  down. A basic healthcheck + alert (even a free uptime monitor hitting
  `/health`) is the minimum.

None of this is expensive. It's attention, not money — which is the actual
trade being made here.
