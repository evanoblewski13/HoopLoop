# HoopLoop Platform 12 / Cash Grab v4 — Update Guide

## 1. Back up the working repo
Commit/push the current working HoopLoop version before replacing files.

## 2. Run the v4 Supabase migration
In Supabase → SQL Editor → New query, copy and run:

`supabase/cash-grab-v4.sql`

This adds only the `cash_grab_hof` table, its recording function, and updates the Cash Grab version marker. It does not delete or replace Daily runs, drafts, accounts, friends, Name Rush, SBC, or HoopLoopSim data.

## 3. Copy the update files
Copy the contents of `hooploop-cash-grab-v4-update` into the root of your HoopLoop repository and replace matching files.

Do **not** delete `config.js` or any other existing game files.

## 4. Commit and push
Suggested commit message:

`Improve Cash Grab box scores matchups and Hall of Five`

Push origin and wait for GitHub Pages to finish deploying.

## 5. Verify
Open `/verify.html` and hard-refresh with **Ctrl + Shift + R**.

The new checks should include:
- Cash Grab v4 game engine
- Cash Grab v4 migration
- Hall of Five table
- Existing Daily and realtime draft tables

## 6. Test Cash Grab
Open `/cash-grab.html` and use the Platform 12 checklist.
