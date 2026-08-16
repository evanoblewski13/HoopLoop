# HoopLoop Platform 21 — Cash Grab v7.2 + Stats Race v4.1

## 1. Run the one small SQL migration
In Supabase SQL Editor, run `supabase/stats-race-v4.1.sql`.

This only adds `host_answers` / `guest_answers` to Stats Race matches and a v4 submit RPC. Cash Grab requires no SQL change.

## 2. Copy files
Copy the update files into the HoopLoop repository root and replace matching files. Copy `supabase/stats-race-v4.1.sql` into the existing `supabase` folder.

Do **not** delete or replace `config.js`, `players-data.js`, SBC files, or HoopLoopSim files.

## 3. Publish
Suggested commit: `Polish Cash Grab and add Stats Race answer comparison`

Push origin, wait for GitHub Pages, then hard-refresh `verify.html`, `cash-grab.html`, and `stats-race.html`.

## Expected
- Cash Grab: no highlighted center row in box scores.
- YOU / opponent-or-round labels have an accent background.
- Current-mode veterans lean toward recent form and recent H2H; All-Time remains peak-season.
- Stats Race online results show FIELD / YOU / OPPONENT / ANSWER / YOU PTS / OPP PTS after both scouts finish.
