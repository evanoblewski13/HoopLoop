# HoopLoop Platform 11 / Cash Grab v3 update guide

## 1. Back up the working site
Commit/push the currently working HoopLoop repository before replacing anything.

## 2. Run the new Supabase migration
Open the existing HoopLoop Supabase project → SQL Editor → New query. Open `supabase/cash-grab-v3.sql`, copy the entire file, paste it, and press **Run**.

The final output should contain two rows:
- `cash_grab_daily_runs`
- `cash_grab_drafts`

This migration does not delete the old Cash Grab v2 table or any Name Rush/SBC/account data.

## 3. Copy the files
Open GitHub Desktop → Repository → Show in Explorer. Copy the files in this update folder into the repository root and replace matching Cash Grab files.

Do **not** delete `config.js`, `players-data.js`, `sbc-player-data.js`, the HoopLoopSim files, or the existing `supabase` folder. Copy the new SQL file into the existing `supabase` folder.

## 4. Publish
Commit with something like:
`Upgrade Cash Grab to 5v5 box scores and snake drafts`

Push origin and wait for GitHub Pages to finish.

## 5. Verify
Open `/verify.html` and hard-refresh. Platform 11 should pass the Cash Grab v3 migration, Daily table, draft table, and Realtime checks.
