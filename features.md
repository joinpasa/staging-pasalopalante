# Pásalo Pa'lante — Feature Inventory

> **Living document.** Update this file whenever a major feature is added, removed, or meaningfully changed. The agent will prompt before updating it — no auto-edits.

**Legend**
- **User Type**: `visitor` (signed out), `authenticated` (any logged-in user), `individual`, `organization`, `admin`
- **Status**: `live`, `beta`, `coming-soon`, `deprecated`, `planned`

---

## 1. Landing & Marketing

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| Hero | Full-bleed hero with mission statement and primary CTA. | visitor | `/` → `Hero.tsx` | live | i18n |
| How It Works | 3-step explainer grid with hover animations. | visitor | `/` → `HowItWorks.tsx` | live | i18n |
| Anthem Section | Bilingual anthem/quote block. | visitor | `/` → `AnthemSection.tsx` | live | i18n |
| The Story | Origin story with 7/5 image stack. | visitor | `/` → `TheStory.tsx` | live | static images |
| Science & Proof | Impact metrics and coherence research. | visitor | `/` → `ScienceProof.tsx` | live | i18n |
| Global Map | Interactive world map with pulsing activation markers. | visitor | `/` → `GlobalMap.tsx` | live | `react-simple-maps` |
| Testimonials | Bilingual testimonial carousel. | visitor | `/` → `Testimonials.tsx` | live | i18n |
| Two Paths | Share vs. Commit pathway choice. | visitor | `/` → `TwoPaths.tsx` | live | routes `/share`, `/commit` |
| November Band | Global activation date band with 11:11 AM countdown. | visitor | `NovemberBand.tsx` | live | event-date logic |
| Donate Band | Inline donation CTA strip. | visitor | `/` → `DonateBand.tsx` | live | `/donate` |
| Contact Page | Static contact info. | visitor | `/contact` → `ContactPage.tsx` | live | — |

---

## 2. Share an Act Flow

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| Mode Picker | Step 1: choose Performed / Received / Witnessed. | visitor + authenticated | `/share` → `ShareActFlow.tsx` (step 1) | live | — |
| Act Details Form | Step 2: description, name, email (anon), optional photo + video URL. | visitor + authenticated | `/share` → `ShareActFlow.tsx` (step 2) | live | `submit-act`, `sign-photo-upload` |
| Photo Upload | Single image up to 5 MB, signed-URL direct upload, consent checkbox. | visitor + authenticated | inside Share flow | live | `sign-photo-upload`, `kindness-photos` bucket |
| AI Moderation | Pre-publish scan for hate, harassment, threats, sexual content, profanity; rejects on uncertainty. | system | `submit-act` edge fn | live | Lovable AI Gateway, `moderation_logs` |
| Anonymous Submission | Submit without account; magic link emailed if email provided. | visitor | `/share` | live | Supabase auth OTP |
| Claim-on-Login | Magic-link landing on `/share/thanks/:id?claim=1` attaches act to new user. | visitor → authenticated | `ShareThanks.tsx` | live | `acts_of_kindness.user_id` |
| Thanks + Share Graphic | Post-submission confirmation page with downloadable branded PNG. | visitor + authenticated | `/share/thanks/:id` → `ThanksSummary.tsx`, `ShareGraphic.tsx` | live | `html-to-image`, `ShareDialog` |
| Share Dialog | Native share, Facebook, X, WhatsApp, LinkedIn, Instagram, copy link, download. | any | `ShareDialog.tsx` | live | Web Share API |
| Description Required for Wall | Acts without description are hidden from the public Wall but visible in account. | system | Wall query filter | live | `acts_of_kindness.description` |
| Consent Logging | Audit-trail entry of terms/privacy/community guidelines version on submit. | any | `lib/legal.ts` | live | `user_consents`, `legal_document_versions` |

---

## 3. Commit / Pledge Flow

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| Individual Pledge | First name, email, help role, country (Ambassador only), preset counts 1/5/10/25/100. | visitor + individual | `/commit` → `CommitFlow.tsx` (Individual tab) | live | `submit-commitment`, `commitments` |
| Organization Pledge | Org name, type, chapter/location, website, contact, presets 100/1k/10k (min 100). | visitor + organization | `/commit` → `CommitFlow.tsx` (Organization tab) | live | `submit-commitment`, `organizations` |
| Help-Role Selector | Do acts / Champion / Ambassador / Civic / Volunteer. | individual | inside Commit flow | live | — |
| Org-Type Selector | School / Company / Nonprofit / NGO / Faith / Other. | organization | inside Commit flow | live | — |
| Passive Account Creation | Submit → magic link emailed; consent stashed in `sessionStorage` and flushed on `/account` arrival. | visitor | Commit + `AccountPage` flush effect | live | Supabase auth OTP |
| Commit Roles Explainer | Section below the form describing what each role does. | visitor | `/commit` → `CommitRoles.tsx` | live | i18n |
| Pledge Counter | Shared preset-pill + numeric input component. | any | `PledgeCounter.tsx` | live | — |
| Org Certification Disclaimer | Microcopy stating org pledges are good-faith commitments. | organization | `/commit` | live | i18n |

---

## 4. Auth & Identity

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| Magic Link Sign-In | Primary auth method; passwordless email link. | visitor | `/auth` → `AuthPage.tsx` | live | Supabase auth, `auth-email-hook` |
| Password Sign-In | Collapsible alternative; password set later in account. | authenticated | `/auth` | live | Supabase auth |
| Set Password | Add a password to an account that signed up via magic link. | authenticated | `/account` → `SetPasswordCard.tsx` | live | Supabase auth `updateUser` |
| Password Reset | Email-based reset via canonical published origin. | visitor | `/auth` (via `resetPassword`) | live | `auth-email-hook` |
| Auth Email Templates | Branded React Email templates for signup/magic/recovery/etc. | system | `supabase/functions/auth-email-hook` | live | Lovable email infra |
| Re-Consent Gate | Blocking modal when Terms or Privacy major version increases. | authenticated | `ReconsentGate.tsx` (global) | live | `profiles.terms_major_accepted`, `legal_document_versions` |
| Terms of Service | Static legal page. | any | `/terms` → `TermsPage.tsx` | live | — |
| Privacy Policy | Static legal page. | any | `/privacy` → `PrivacyPage.tsx` | live | — |
| Community Guidelines | Static guidelines page. | any | `/community-guidelines` → `CommunityGuidelinesPage.tsx` | live | — |

---

## 5. My Account (`/account`)

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| Profile Header | Avatar/initials, display name, email. | authenticated | `ProfileHeader.tsx` | live | `profiles` |
| Streaks & Badges | Current/longest streak, total acts, badge grid (earned vs locked). | authenticated | `StreaksBadges.tsx` | live | RPC `user_streak`, `badges`, `user_badges` |
| Inspiration Card | Quick link to today's daily acts. | authenticated | `InspirationCard.tsx` | live | `/inspiration` |
| Your Acts | Tabbed list (All/Given/Received/Seen) with delete and per-act Share-PNG generation; empty acts shown as "I saw/did/received an act". | authenticated | `YourActs.tsx` | live | `acts_of_kindness`, `act_reactions`, `ShareGraphic` |
| Your Commitment | View/edit active personal pledge, progress bar, history, create new. | individual | `YourCommitment.tsx` | live | `commitments`, `submit-commitment` |
| Your Group | Shows org membership if any. | authenticated | `YourGroup.tsx` | live | `org_members`, `organizations` |
| Reminders | Channel (email/SMS), frequency (daily/weekdays/weekly), send time. | authenticated | `RemindersCard.tsx` | beta | `reminders`, `process-email-queue` |
| SMS Reminders | Phone capture + opt-in microcopy. | authenticated | `RemindersCard.tsx` (SMS branch) | coming-soon | `profiles.phone` |
| Set Password Card | Adds password to magic-link-only account. | authenticated | `SetPasswordCard.tsx` | live | Supabase auth |
| Committed Toast | `?committed=1` query flashes thank-you after pledge magic-link landing. | authenticated | `AccountPage.tsx` | live | sessionStorage flush |

---

## 6. Inspiration

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| Daily Acts | 5 AI-generated acts per day, cached per (date, language); mark-done persists in localStorage. | any | `/inspiration#ideas` → `DailyActs.tsx` | live | `daily-acts` edge fn, `daily_suggestions`, Lovable AI |
| Mark-Did → Share | "Mark did" opens Share flow pre-filled with the suggestion as performed. | any | `DailyActs.tsx` → `ShareActFlow` | live | `submit-act` |
| Kindness Ideas | Curated static ideas list. | any | `/inspiration` → `KindnessIdeas.tsx` | live | static data |
| Wall of Kindness | Tabbed (Given/Received/Seen) top-12 published acts from last 30 days, sorted by reactions; modal detail. | any | `/inspiration#wall` → `WallOfKindness.tsx` | live | `acts_of_kindness`, RPCs `reaction_counts`/`my_reactions` |
| Heart Reactions | Authenticated users react once per act; counts shown live. | authenticated (to react) | Wall + detail modal | live | `act_reactions` |
| Volunteer Directory | Cards linking to external volunteer platforms. | any | `/inspiration#volunteer` → `VolunteerDirectory.tsx` | live | `data/volunteerDirectories` |

---

## 7. Donations

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| Donate Page | Hero copy + payment strip. | any | `/donate` → `DonatePage.tsx` | live | — |
| PayPal Buttons | Direct links to official PayPal donation URLs. | any | `DonateStrip.tsx` | live | external PayPal |
| Alternative Payment Methods | Zelle / ATH Móvil / wire instructions with disclaimers. | any | `DonateStrip.tsx` | live | — |
| Tax-Deductible Disclosure | Notice that donations are routed via Te Amo PR (501c3). | any | `DonateStrip.tsx` | live | — |

---

## 8. Backend & Infrastructure

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| `submit-act` | Validates, AI-moderates, persists acts; returns rejection reasons. | system | edge function | live | `acts_of_kindness`, `moderation_logs`, Lovable AI |
| `submit-commitment` | Persists individual/org pledges, dedupes by email. | system | edge function | live | `commitments`, `organizations`, `pledge_totals` |
| `sign-photo-upload` | Issues signed PUT URL for direct upload to `kindness-photos`. | system | edge function | live | Storage bucket |
| `daily-acts` | Returns/caches 5 daily acts per (date, language). | system | edge function | live | `daily_suggestions`, Lovable AI Gateway |
| `auth-email-hook` | Renders branded transactional auth emails. | system | edge function | live | React Email, `@lovable.dev/email-js` |
| `process-email-queue` | Worker that drains queued emails with retries + DLQ. | system | edge function | live | `email_send_log`, `email_send_state`, `suppressed_emails` |
| Database Tables | `profiles`, `acts_of_kindness`, `act_reactions`, `commitments`, `organizations`, `org_members`, `pledge_totals`, `reminders`, `badges`, `user_badges`, `daily_suggestions`, `moderation_logs`, `legal_document_versions`, `user_consents`, `user_roles`, `email_*`, `suppressed_emails`. | system | Supabase | live | RLS enforced |
| Storage Buckets | `kindness-photos` (public read, no list), `email-assets` (public read, no list). | system | Supabase Storage | live | — |
| `user_roles` + `has_role()` | Separate roles table with security-definer check; no client-side admin flags. | system | DB | live | — |

---

## 9. Polish & UX

| Feature | Description | User Type | Route / Screen | Status | Dependencies |
|---|---|---|---|---|---|
| Bilingual i18n (EN/ES) | Full translation system across all surfaces. | any | `LanguageContext.tsx`, `i18n/translations.ts` | live | — |
| Language Switcher | Floating fixed bottom-right toggle. | any | `LanguageSwitcher.tsx` | live | — |
| Navbar | Sticky header with scroll-aware behavior and anchor links. | any | `Navbar.tsx` | live | — |
| Footer / Minimal Footer | Full footer with socials; minimal variant on flow pages. | any | `Footer.tsx`, `MinimalFooter.tsx` | live | — |
| Scroll-to-Top Button | Appears after 30% scroll, sits above language switcher. | any | `ScrollToTop.tsx` | live | — |
| Scroll-to-Top on Route | Resets scroll on navigation. | any | `ScrollToTopOnRouteChange.tsx` | live | — |
| Cursor Ripple Trail | Pointer-following ripple effect on marketing pages. | any | global | live | — |
| Toast Notifications | Success/error toasts via Sonner + shadcn toaster. | any | global | live | `sonner` |
| 404 Page | Friendly not-found fallback. | any | `*` → `NotFound.tsx` | live | — |

---

## Maintenance

- After any major feature addition, removal, or behavior change, the agent will **ask before updating this file**.
- Keep rows atomic — one capability per row.
- Use the Status column to track lifecycle (`planned` → `beta` → `live` → `deprecated`).
- Cross-link new features to the tables/edge functions they depend on so the dependency column stays useful.
