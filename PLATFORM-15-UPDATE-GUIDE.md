# HoopLoop Platform 15 / Stats Race v1 — Update Guide

## What this update adds
- Stats Race as HoopLoop Game 04
- 17-field scouting reports
- partial-credit numeric scoring
- 90-second timer
- Daily / Practice / Race modes
- CPU race
- friend and random online race framework
- founding 16-player profile database
- Stats Race navigation link on Name Rush, Start Bench Cut, Cash Grab, and HoopLoopSim
- Stats Race homepage card

## 1. Back up the repository
Commit or export the current working HoopLoop repo before replacing files.

## 2. Run the Supabase migration
Open Supabase → SQL Editor → New query.

Copy all of:
`supabase/stats-race-v1.sql`

Paste and Run.

The final result should include:
`stats_race_daily_scores + stats_race_matches v1`

This migration is additive. It does not delete Name Rush, SBC, Cash Grab, profiles, friends, or HoopLoopSim data.

## 3. Copy files into the HoopLoop repository
Copy the contents of `hooploop-stats-race-v1-update` into the repository root and replace matching files.

Do **not** delete or replace your existing:
- `config.js`
- `players-data.js`
- `sbc-player-data.js`
- `cash-grab-data.js`
- `cash-grab.js`
- `cash-grab.css`
- HoopLoopSim JS/CSS files

This package contains `cash-grab.html` only to add the new navigation link; it does not replace the v6 Cash Grab engine.

## 4. Commit and push
Suggested commit:
`Add Stats Race scouting game`

Then Push origin.

## 5. Verify
After GitHub Pages deploys, open:
`https://YOUR-USERNAME.github.io/hooploop/verify.html`

Hard refresh with Ctrl + Shift + R.

The page should say **Platform 15 Check**.

## 6. First tests
1. Open Stats Race.
2. Run Practice.
3. Confirm the clock begins at 90 seconds.
4. Enter a mix of exact, close, wrong, and blank answers.
5. Confirm wrong answers never subtract points.
6. Confirm each reveal row shows your answer, the correct answer, and points earned.
7. Run today's Daily while logged in.
8. Confirm a second official Daily attempt is blocked.
9. Test CPU Race.
10. Use two accounts to test friend/random online Race.
