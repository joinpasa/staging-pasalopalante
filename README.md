# Pásalo Pa'lante

A monorepo containing two independently deployable apps that share one design system, auth layer, and Supabase backend:

- **`apps/website`** — the public marketing site (pasalopalante.com): landing page, share/commit flows, wall of kindness, donate, legal pages.
- **`apps/app`** — the installed/logged-in app (app.pasalopalante.com), also packaged for the App Store / Play Store via Capacitor: home feed, wall, pass/QR, map, badges.
- **`packages/shared`** — auth context, Supabase client, i18n, shadcn UI components, and design tokens used by both apps. Not published or built independently — each app's Vite config resolves it directly from source via the `@shared/*` alias.
- **`supabase/`** — the single shared Supabase project (migrations + edge functions) both apps talk to.

## Getting started

```sh
npm install          # installs once for the whole workspace

npm run dev:website  # http://localhost:8080
npm run dev:app      # http://localhost:8081
```

## Building

```sh
npm run build:website
npm run build:app
# or both:
npm run build
```

## Testing

```sh
npm test                     # unit tests: shared, website, app, and cross-cutting repo checks
npm run test:e2e:website     # Playwright, requires the website dev server running
npm run test:e2e:app         # Playwright, requires the app dev server running
```

## Technologies

Vite, TypeScript, React, React Router, shadcn-ui, Tailwind CSS, Supabase, Capacitor (native app shells for `apps/app`).

## Deploying

Each app deploys independently. `apps/website/netlify.toml` and `apps/app/netlify.toml` each configure their own Netlify site with `base` pointed at the respective app directory — set each site's production domain (pasalopalante.com / app.pasalopalante.com) in the Netlify dashboard.
