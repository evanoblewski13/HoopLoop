# HoopLoop Platform 13 / Cash Grab v5 — Update Guide

## 1. Back up the working site
In GitHub Desktop, make sure your current HoopLoop changes are committed before replacing files.

## 2. Run the v5 Supabase migration
Open Supabase → SQL Editor → New query.

Copy all of:

`supabase/cash-grab-v5.sql`

Paste it into Supabase and click **Run**.

This updates the existing `cash_grab_drafts` system with:
- `turn_deadline`
- `host_lineup`
- `opponent_lineup`
- 60-second timeout-pick logic
- lineup submission logic
- server-side shared-budget feasibility checks

The final query returns:

`cash_grab_drafts v5 timer + lineup config`

## 3. Replace the website files
Copy the contents of `hooploop-cash-grab-v5-update` into the root of the HoopLoop repository and replace matching files.

Do **not** delete your existing `config.js`.

## 4. Commit and push
Suggested commit:

`Upgrade Cash Grab live drafts and lineup controls`

Then click **Push origin**.

## 5. Verify
After GitHub Pages finishes deploying, open:

`/verify.html`

Hard refresh with **Ctrl + Shift + R**.

The Platform 13 checks should confirm:
- Cash Grab v5 browser engine
- `cash-grab-v5` database version
- `turn_deadline`, `host_lineup`, and `opponent_lineup`
- Supabase Realtime

## 6. Live two-account test
Use two accounts or two browsers:
1. Start/accept a Draft Battle.
2. Leave both players on the draft screen.
3. Confirm the same 60-second clock is visible.
4. Make a pick on one device and confirm the other updates without leaving the page.
5. Let one turn expire and confirm an available legal $1 player is assigned automatically.
6. Finish the draft.
7. On both accounts, set PG/SG/SF/PF/C and offensive options 1–5.
8. Lock both lineups and confirm one shared result/box score appears.
