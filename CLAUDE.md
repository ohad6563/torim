# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A Hebrew-only (RTL) appointment-booking app for one brow studio, "הגבות של הילה" (slug `hila-brows`). It is built with Expo SDK 58, expo-router, React Compiler and Reanimated 4, with Supabase as the backend. The same code ships to iOS (TestFlight/App Store, bundle `com.hilabrows.app`) and to the web on GitHub Pages (https://ohad6563.github.io/torim). The owner prefers short replies in Hebrew.

## Commands

```bash
npx tsc --noEmit          # typecheck (npm run typecheck)
npx eslint src            # lint (npm run lint); React Compiler rules are enforced
npx expo start --web      # dev server
```

There is no test suite. Verify changes with typecheck, lint and, for UI, a Playwright run against a web export. For that, use `require('playwright')` with the pre-installed Chromium, mock `https://demo.supabase.co/**`, and wait with `waitUntil: 'load'`. Do not use `networkidle`: the hero scene's animations keep running.

**Deploy the web build** to the `gh-pages` branch:

```bash
EXPO_BASE_URL=/torim EXPO_PUBLIC_APP_URL=https://ohad6563.github.io/torim npx expo export -p web
cp dist/index.html dist/404.html && touch dist/.nojekyll
```

Then replace the contents of `gh-pages` with `dist/` (for example through a `git worktree`) and push.

**iOS build** (EAS project owned by `ohad6563s-team`):
- Push to the `testflight` branch (`git push -f origin HEAD:testflight`) to trigger `.github/workflows/testflight.yml`, which runs `eas build --auto-submit` using the `EXPO_TOKEN` secret (verified working; the App Store Connect API key `5T26V6S36N` is assigned in EAS — it must not be revoked).
- Alternatively, follow `docs/TESTFLIGHT_UPDATE.md` by hand.
- Adding a native library requires a new build. JS-only changes still need a build too, because OTA updates are not set up.

## Architecture

**The database holds the business logic.** `supabase/migrations/0001`–`0006` are applied by hand in the Supabase SQL Editor; there is no CLI linkage.
- Every table has RLS, and most writes go through `SECURITY DEFINER` RPCs that check rules server-side:
  - `get_available_slots`
  - `book_appointment` (requires a profile phone, max 3 upcoming bookings, no overlap)
  - `cancel_my_appointment`, `delete_my_account`
  - `my_business`: returns the studio when the user is its owner or an admin
  - the waitlist functions
- Each new function needs explicit `revoke ... from public, anon` and `grant ... to authenticated`.
- A new migration must be idempotent. Ask the owner to run it, and deploy client code that depends on it only afterwards: the web build is live.

**Auth and roles:**
- Sign-in uses Google OAuth (PKCE) on all platforms and native Apple on iOS (`src/lib/social-auth.ts`). Email/password is disabled in Supabase.
- `src/context/auth.tsx` loads the session, the `profiles` row and `my_business()`. A user is an admin when `my_business()` returns a row.
- Admin rights come from `reserved_admin_emails`, and only for verified accounts with a Google or Apple identity (`is_social_user`, migration 0005).
- `src/app/index.tsx` routes users:
  - admins go to `(owner)` tabs;
  - customers without name, phone or `terms_accepted_at` go to `/complete-profile`;
  - everyone else goes to `(customer)` tabs.

**Routes** (`src/app`):
- Tab groups: `(owner)` (calendar, waitlist, customers, services, settings) and `(customer)` (home, appointments, profile).
- `book/[slug].tsx`: the customer booking flow (service → day strip + time wheel → details → confetti success). It also takes `?service=&day=` from push links.
- Public pages that need no login: `privacy`, `terms`, `accessibility`, `support`, `delete-account`. Their legal and contact details come from `EXPO_PUBLIC_STUDIO_*` through `src/lib/studio.ts`. Empty values are placeholders until the owner supplies them.

**Push notifications** (free, through Expo's push API):
- Triggers on `appointments` fill `notification_queue`: confirmation, a reminder 24 hours before and one 2 hours before.
- When a booked time frees up, people on the waitlist are notified.
- A `pg_cron` job runs `send_due_notifications()` every minute and posts through `pg_net`.
- The client registers tokens with `register_push_token` (`src/lib/push.ts`). `PushManager` opens the `data.url` of a notification when it is tapped.

**Config:**
- `.env` is committed on purpose: it holds only public keys plus `EXPO_PUBLIC_BUSINESS_SLUG`, `EXPO_PUBLIC_THEME` and the studio settings.
- `app.config.js` adds `EXPO_BASE_URL` for the web sub-path.
- Do not change `bundleIdentifier`, `scheme` (`hilabrows`) or the business slug without coordinating.

## UI conventions

- The hero background on home and sign-in is `src/components/brow-scene.tsx`: a live SVG brow (hairs generated once from a seeded RNG) in depth layers, driven by `useTilt` (accelerometer on phones, mouse on the web).

- Use the components in `src/components/ui.tsx` (`Txt`, `Button`, `Card`, `Screen`, `PressableScale`, `Chip`, `Skeleton`…). Colors, spacing and fonts come from `src/theme.ts`; the shipped palette is `porcelain`. Keep text at a contrast of at least 4.5:1, which the accessibility statement promises.
- **RTL pitfalls:**
  - Natively, the app is forced to RTL, and `start`/`left` flip.
  - On the web, RTL comes only from CSS `dir="rtl"`, so react-native-web does not map `start` to the right.
  - For anything positioned by coordinates (sliding pill, confetti), use a `direction: 'ltr'` layer or translateX based on index, and test on both platforms.
  - Wrap LTR fragments such as phone numbers and time ranges in `⁦…⁩`.
- **Reanimated 4:** write shared values with `.set()`, not `.value =`. Use `scheduleOnRN` from `react-native-worklets`. Respect Reduce Motion.
- Every pressable needs `accessibilityRole` or `accessibilityLabel` in Hebrew.

## Docs

- `docs/APP_STORE_HANDOFF.md`: the full store handoff (App Store Connect fields, privacy labels, test checklist).
- `docs/TESTFLIGHT_UPDATE.md`: the minimal steps for a TestFlight update.

## Open items (waiting on the owner)

Ask before assuming any of these; update this list when one is resolved.

- **Hila's admin email:** pending (owner is checking with Hila). Once known: `insert into reserved_admin_emails (email, business_slug) values ('<email>', 'hila-brows');` in the Supabase SQL Editor (account must sign in with Google/Apple).
- **Cancellation / no-show policy:** pending (owner is checking with Hila). Set `EXPO_PUBLIC_STUDIO_CANCEL_HOURS` (default 24) and `EXPO_PUBLIC_STUDIO_NO_SHOW_POLICY` in `.env`; shown in terms and support pages.
- **Before store submission (not before):**
  - Legal details in `.env`: `EXPO_PUBLIC_STUDIO_LEGAL_NAME`, `_BUSINESS_ID`, `_ADDRESS`, `_EMAIL`, `_PHONE`.
  - Apple Developer account in Hila's/the studio's name (guideline 4.2.6), then enable the Apple provider in Supabase with client ID `com.hilabrows.app`.
  - A lawyer's review of the terms / privacy texts.
