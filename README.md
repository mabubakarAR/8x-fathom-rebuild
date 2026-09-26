# Noted

An AI meeting notetaker that listens without joining. Sign in with Google, connect your calendar, press one button inside Google Meet, and read notes where every claim links to the second it was said.

Live: **https://ainoted.vercel.app** · Built for the 8x take-home (the brief's reference product was Fathom; the interface here is my own).

**Agent capture proof:** [CAPTURE-TEST.md](./CAPTURE-TEST.md) · **The brief, line by line:** [BRIEF-CHECK.md](./BRIEF-CHECK.md) · **Product reasoning and cuts:** [PRODUCT-NOTES.md](./PRODUCT-NOTES.md) · **What's real vs not:** `/about` in the app

> **Naming.** The repository, package and log `project` field are `8x-fathom-rebuild` because that is what the assignment was called. The product is **Noted**. There is no third name.

---

## What it is, in one screen

| You do | It does |
|---|---|
| Sign in with Google | Creates your workspace. Identity only — no calendar permission yet |
| Connect Google Calendar | Shows the next seven days with a **record / skip** decision per meeting, and says which rule decided |
| Join a Meet | The Chrome extension opens the recorder by itself with your calendar rule applied (record / skip, and why), and puts **Record with Noted** in the call bar. Chrome's share dialog is the one click left; nothing joins the meeting |
| Stop | Transcribed with speakers, chaptered, summarised. Every summary bullet cites a transcript line, and the ones that could not be anchored are shown struck through, not hidden |
| Fix one speaker | Fixed across every meeting that person is in |
| Ask anything | One answer across your whole history, each claim naming the meeting, speaker and second |
| Share a clip | A signed-out link carrying only that clip |
| ··· on any meeting | Share, copy link, download the audio, delete — one cascade, no trash |

No bot. No desktop agent. No mock data: every page reads from Postgres and every edit writes back.

## Decisions

The changed brief asked for an interface of my own design and a real backend. These are the product calls, with the reasoning:

- **No bot, ever.** A bot in the participant list is the thing people dislike most about notetakers, and it needs a fleet of dial-in workers. Recording from the browser that is already in the call works on Meet, Zoom and Teams today, with the share dialog everyone can see as consent. The Chrome extension makes that as automatic as a browser allows: the recorder opens itself when you join, and the share dialog is the only click. Fully hands-off capture needs a bot or a desktop app, and `/about` says so.
- **Two consents, not one.** Sign-in asks for identity only, so it is two clicks with no warning. Calendar is a separate button because it is a Google "sensitive" scope and an unverified app asking for it shows a full-page warning — that cost belongs behind a button the user chose to press.
- **Citations are structural, not decorative.** The model never emits a timestamp. It cites numbered lines; every index is checked against the real transcript; an index that does not resolve is dropped and *shown as dropped*. `npm test` proves the drop path without an API call.
- **People, not speakers.** A voice fixed once becomes a person with a `person_key` shared across meetings. The action-item board and the commitment tracker are per-person because of it.
- **Sample workspace as an import, not a default.** Nine written-for-purpose meetings with threads running between them, importable and removable from Settings, marked as sample everywhere they appear. An empty list tells a reviewer nothing; a fake list that pretends to be theirs is worse.
- **A temporary guest door.** The OAuth client is unverified. A reviewer on a locked-down Workspace domain may be unable to grant even the identity scope, so the landing page has a guest sign-in with a tooltip that says exactly what it is: a throw-away workspace with the sample loaded, no Google data, not a feature.
- **Left out on purpose:** Zoom/Teams sign-in (marketplace review), a desktop app, billing, admin, mobile. `/about` says so in the product.

## Stack

| Layer | What | Why |
|---|---|---|
| Framework | **Next.js 16** App Router, React Server Components | Every page is server-rendered from the database; the client bundle is the interactive parts only |
| UI | **React 19**, React Compiler lint rules on, **Tailwind v4** with OKLCH tokens | No component library. Perceptual lightness stays even across the eight speaker hues |
| Auth | **Auth.js v5** (NextAuth), Google provider, JWT sessions | Identity scope at sign-in; `calendar.readonly` as a second, offline consent that yields a refresh token |
| Calendar | Google Calendar API v3 | Refresh-token exchange server-side; a deterministic rule decides record/skip per event and the UI states the rule |
| Database | **Postgres** (Neon) via `postgres` | Users, meetings, segments, speakers, chapters, summaries, actions, highlights, settings. One `sql.begin` per save; idempotent migrations |
| Audio | **Vercel Blob**, falling back to a Postgres `bytea` column | Served by `/api/calls/<id>/audio` with HTTP range support so seeking works in Safari |
| Capture | `getDisplayMedia` + `getUserMedia` mixed via Web Audio, `MediaRecorder` | Tab audio is the far side of the call; mic is you; echo-cancelled so nobody is recorded twice |
| Extension | Chrome Manifest V3, ~170 lines | Runs on `meet.google.com` only; `storage` for its one switch. Deliberately not `tabCapture` |
| Transcription | **Deepgram `nova-3`**, `diarize=true` | Whisper has no diarization; speaker attribution is the thesis |
| AI | **`@anthropic-ai/sdk`** → `claude-sonnet-4-5` | Summaries, templates, Ask, workspace Ask, contradiction judging — all index-cited and validated |
| Search | Hand-written BM25 + TF-IDF cosine, query expansion | ~200 lines, in-process, per-user index; doubles as the retriever for Ask and commitments |
| Hosting | **Vercel** | |

Seven runtime dependencies: `next`, `react`, `react-dom`, `next-auth`, `@anthropic-ai/sdk`, `@vercel/blob`, `postgres`. No ORM, no state manager, no vector database, no test framework.

## How data moves

```
Google sign-in ─► users row (id = Google sub)
Calendar consent ─► users.google_refresh_token ─► /  (next 7 days, record/skip per event)
Meet ─► extension button ─► /record?join=…&title=… ─► share dialog ─► MediaRecorder
     ─► /api/transcribe (Deepgram) ─► /api/analyse (Claude, index-cited, validated)
     ─► one transaction: meetings, segments, speakers, chapters, summaries, actions, highlights
Every page ─► loadWorkspace(ownerId): 7 bulk queries, 300 ms cache, per user
Every edit ─► POST /api/meetings/<id>/mutate ─► router.refresh()
```

Ownership is enforced in the queries, not the UI: a meeting id you do not own is a 404.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
npm test           # the citation validator's drop path, no API key needed
```

| Variable | Without it |
|---|---|
| `DATABASE_URL` | Nothing works past the landing page — this build is database-first by design |
| `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No sign-in. Guest sign-in still needs `AUTH_SECRET` |
| `ANTHROPIC_API_KEY` | Recording, import and Ask return 503 and say so |
| `DEEPGRAM_API_KEY` | A recorded call is transcribed from your microphone only, and the page says so mid-call |
| `BLOB_READ_WRITE_TOKEN` | Audio goes into Postgres instead. Nothing else changes |

Names, no values, in [`.env.example`](./.env.example). `/api/setup` reports what a deployment has, by shape, never by value.

## Try it in five minutes

1. Landing page → **Sign in with Google** (or **Guest** if your domain blocks it).
2. Home is empty → **Import sample workspace**. Nine meetings appear; open *Q4 Roadmap Lock* — 54 minutes, 8 speakers, 12 chapters.
3. Tick an action item, reload: it stayed. Fix a speaker: the count under their name changes in every meeting.
4. Press **?** → ask *"what did we promise Brightwater?"* — the answer cites four meetings.
5. **Connect Google Calendar** on the home page → your next meetings with a record/skip decision each.
6. Install the extension (`chrome://extensions` → Load unpacked → `extension/`), join any Meet, press **Record with Noted**.

## Layout

```
src/
  app/                    /, /m/<id>, /record, /import, /upload, /search, /commitments,
                          /actions, /clips, /live, /settings, /about, /s/<token>
                          api/: auth, analyse, transcribe, calls, ask, commitments,
                                meetings/<id>/mutate, workspace/sample, settings, setup
  auth.ts                 Auth.js config: Google + the guest door
  proxy.ts                route protection (Next 16 middleware)
  components/             shell (expandable rail, Ask dock), landing-page/, meeting/, settings
  lib/
    data/workspace.ts     per-user workspace in 7 queries; people collapsed by person_key
    db/                   schema, migrations, sample import, settings
    google/calendar.ts    refresh-token exchange, upcoming events, the record/skip rule
    pipeline/             parse → transcribe → analyse → ask; validate.ts is the citation check
    search/               BM25 + cosine engine and the per-owner workspace index
    recorder.ts           tab audio + mic, mixed and recorded in the browser
    overlay.tsx           write-through mutations with router.refresh()
extension/                the Chrome extension (also zipped at public/extension/)
.agent-logs/              every prompt and response from the build, committed as it went
.claude/hooks/            the capture hooks + the transcript backfill safety net
scripts/test-validation.mjs   proves the citation validator drops what it should
```
