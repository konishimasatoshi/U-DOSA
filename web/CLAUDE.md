# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Overview

U-DOSA is a browser app for viewing records from a "poop alarm" (a Raspberry Pi Pico 2 W + SGP30 gas sensor in the parent directory `../`). The device's `../uploader.py` POSTs rows directly to Supabase's REST API (`poop_events`, `source: "sensor"`); this Next.js app (in `web/`) reads them and lets users add manual records, mark false alarms, and view stats. There is no login and no server-side code — everything runs in the browser with the Supabase anon key.

Stack: Next.js 16 (App Router) / React 19 / Tailwind CSS v4 / shadcn/ui (`components/ui/`) / Recharts / Supabase JS / date-fns(-tz). UI text and code comments are in Japanese; keep new ones in Japanese.

## Commands

- `npm run dev` — dev server (if port 3000 is busy: `npx next dev -p 3100`)
- Verify changes in this order: `npm run format` → `npm run lint` → `npm run build`
- There is no test suite.

Setup requires `.env.local` (copy `.env.local.example`) with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Vercel deploys with Root Directory = `web`.

## Architecture

- **Pages are thin server components** (`app/page.tsx`, `app/dashboard/page.tsx`) that render a single client component (`components/events/event-board.tsx`, `components/dashboard-panel.tsx`). All data access is client-side.
- **Data layer (`lib/`)**:
  - `supabase/client.ts` — singleton browser client, `persistSession: false`.
  - `events-api.ts` — all `poop_events` CRUD + Realtime subscription; throws `Error` with a user-facing Japanese message on failure.
  - `use-events.ts` — `useEvents()` loads the last `MAX_RANGE_DAYS` (90) days and re-fetches on any Realtime change (from the device or other browsers); local mutations are applied optimistically via `upsert`/`remove`. `useNow()` ticks every 30s for "N分前" displays.
  - `events.ts` — pure domain logic (false-alarm filtering, constipation check, manual-input validation).
  - `stats.ts` — `buildStats()` computes all dashboard aggregates; false alarms are excluded from counts/intervals and only counted separately.
  - `settings.ts` — reads the single-row `u_dosa_settings` table (constipation alert hours); falls back to `DEFAULT_CONSTIPATION_ALERT_HOURS` on error.
- **Time zone**: all dates are handled in `Asia/Tokyo` (`TIME_ZONE` in `lib/constants.ts`). Use the helpers in `lib/format.ts` (`toDateKey`, `toHour`, …) and `fromZonedTime` rather than local `Date` methods. Day ranges are JST-midnight boundaries.

## Database (Supabase)

- Schema lives in `supabase/migrations/`, applied **manually** via the Supabase Dashboard SQL Editor (no Supabase CLI). The project is shared with another app ("kakeiboo", whose `expenses` table and `set_updated_at()` function live there too).
- `types/database.types.ts` is **hand-written** (not `supabase gen types`, which would pull in kakeiboo's tables). Update it whenever a migration changes.
- Values duplicated between DB and code must stay in sync: note max length 200 (`NOTE_MAX_LENGTH`), default alert hours 48 (`DEFAULT_CONSTIPATION_ALERT_HOURS`).
- RLS grants the `anon` role select/insert/update on `poop_events`, but delete only for `source = 'manual'` — sensor rows are never deleted, only flagged `is_false_alarm` (reversible). `u_dosa_settings` is read-only from the app; it is edited in the Dashboard.
- `supabase/test-data/` has a seed script (test rows have notes starting with `[テスト]`) and a matching delete script.
