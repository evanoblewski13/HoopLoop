# HoopLoop Platform 22 — Pack, Pull, Play v1

## 1. Run one new SQL migration
In the existing HoopLoop Supabase project, open **SQL Editor → New query** and run:

`supabase/pack-pull-play-v1.sql`

This is additive. It creates only the Pack, Pull, Play live-series table/functions and Realtime publication support. It does not delete or replace Name Rush, Start/Bench/Cut, Cash Grab, Stats Race, or HoopLoopSim data.

If Platform 21's Stats Race answer comparison migration has not been run yet, also run `supabase/stats-race-v4.1.sql` once.

## 2. Copy the website update
Copy the contents of this update folder directly into the HoopLoop repository root and replace matching files.

New files:
- `pack-pull-play.html`
- `pack-pull-play.css`
- `pack-pull-play.js`
- `pack-pull-play-data.js`
- `supabase/pack-pull-play-v1.sql`

Updated shared pages:
- `index.html`
- `start-bench-cut.html`
- `cash-grab.html`
- `stats-race.html`
- `hooploopsim.html`
- `verify.html`
- `version.json`

Current Platform 21 Cash Grab / Stats Race engine files are included so this ZIP can safely sit on top of the current build.

Do **not** delete or replace your existing `config.js`, Name Rush player database, Start/Bench/Cut player database, theme files, or HoopLoopSim save data.

## 3. Publish
Suggested commit:

`Add Pack Pull Play and clean HoopLoop navigation`

Push origin and wait for GitHub Pages to deploy.

## 4. Verify
Open `/verify.html` and hard-refresh with **Ctrl + Shift + R**.

Platform 22 should confirm:
- 534 current identities
- 577 card versions
- 40 audited peak-season variants
- Pack, Pull, Play engine markers
- Pack, Pull, Play link across shared navigation
- `pack-pull-play-v1` backend
- `ppp_matches` live-series fields
- existing Cash Grab v7.2 + Stats Race v4.1 checks

## 5. First live test
Use the Platform 22 checklist. For Friend Series, use two authenticated accounts/browsers.
