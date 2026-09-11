# Thrive VAP — Assignment Portal (Student-Facing, Phase 1)

Student-facing assignment portal for the Thrive Volunteer & Ambassador
Program. This is a **new, separate repo** — it does not touch the
existing Thrive IWD website or its Google Sheets/Stripe registration
flow. Today's build runs entirely on **mock data**; nothing here calls
a real Firebase project yet.

## Running it

```bash
npm install
npm run dev
```

No `.env.local` is required to run today's build — the app reads from
`src/mock/` for everything. See `.env.example` for what a real Firebase
project's credentials would look like once you're ready to go live.

## What's built (Phase 1 — today's scope)

- Email-based login, validated against a mock student record
- Dashboard showing Weeks 1–4, each in one of four states: locked,
  awaiting submission, pending review, or graded
- Week unlock timing based on `cohort.startDate + (week-1) × 7 days`
- File upload (PDF/DOCX only) for unlocked, unsubmitted weeks
- Certificate screen, rendered as HTML, exportable as a PNG

## What's explicitly NOT built (by design, today)

- **Admin panel** — phase 2
- **Real AI grading** — every submission is graded via a "[Demo only]
  Simulate grading" button in the pending-review state
  (`mockGradeSubmission` in `src/mock/mockReader.js`). This exists
  solely so the full flow is clickable end-to-end today; delete it
  once real grading exists.
- **Real Firebase Auth / Firestore** — see "Swapping to real Firebase"
  below
- **Any change to the existing Thrive IWD website repo or its Sheets/
  Stripe flow**

## Data model

Mirrors what the eventual Firestore collections should look like —
see `src/mock/mockData.js` for full shape and comments.

- `students/{id}` — includes a `participantId` field (e.g.
  `VAP-2026-00001`) matching the existing VAP registration's key, even
  though today's auth is email-only. This field is unused by any logic
  today; it's reserved for linking a portal account to its Sheets row
  once that integration happens.
- `cohorts/{id}` — separate collection (not a free-text field on the
  student), with a real `startDate` for unlock math
- `assignments/{id}` — scoped by `cohortId` + `weekNumber`
- `submissions/{id}` — one per student per assignment; **absence of a
  submission doc IS the "not yet submitted" state** — there's no
  submission doc with a "not submitted" status

## Swapping to real Firebase

1. Create a Firebase project, enable Firestore + Authentication
   (Email Link provider)
2. Fill in `.env.local` per `.env.example`
3. In `src/firebase/config.js`, uncomment the `initializeApp` /
   `getAuth` / `getFirestore` block
4. Replace the function bodies in `src/mock/mockReader.js` with real
   Firestore calls (`getDoc`, `getDocs`, `addDoc`, etc.) — every
   function's signature and return shape already matches what a real
   Firestore call would return, so no calling component (pages/,
   components/, hooks/) should need to change
5. Replace `useAuth.js`'s email-match check with real
   `sendSignInLinkToEmail` / `isSignInWithEmailLink` calls — today's
   check (does a student record exist for this email?) still matters
   as a post-auth lookup, but it is not itself a security boundary the
   way a real magic-link token is

## Known gaps to resolve before wiring up the real VAP registration flow

- The existing Apps Script keys participant records by **Participant
  ID** (with email as fallback), and cohort is stored as a free-text
  string (e.g. `"September 2026 Cohort"`) rather than a structured
  date. This portal's model already anticipates both — a real
  `participantId` field and a structured `cohort.startDate` — but the
  actual bridge (how a portal account gets linked to its Sheets row)
  hasn't been designed yet.
- Tier differences beyond week content (e.g. Live's synchronous
  sessions, Connect/Live's WhatsApp step from the existing welcome
  email) aren't modeled in the portal yet — today's assignments are
  identical in shape across tiers, differing only in brief content.

## Design notes

- Palette: teal-green (`tailwind.config.js`, `thrive.*` tokens) — a
  quick steer, not exact brand hex values. Every component references
  `thrive-ink` / `thrive-accent` / etc., never raw hex, so adjusting
  the actual shades is a one-file change.
- Certificate PNG export uses `html-to-image` rather than
  `html2canvas` — more faithful with modern CSS (shadows, gradients,
  web fonts) and outputs PNG natively.
