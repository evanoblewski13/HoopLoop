# HoopLoop Platform 10 / Cash Grab v2 Update Guide

This update expands Cash Grab and adds real-player Cash Grab challenges. It does **not** replace your Supabase project or existing HoopLoop tables.

## 1. Back up your working repository
In GitHub Desktop, make sure your current working version is committed before copying the update.

## 2. Run the Cash Grab v2 migration
In your existing Supabase project:
1. Open **SQL Editor**.
2. Create a **New query**.
3. Open `supabase/cash-grab-v2.sql` from this update.
4. Copy the entire file and paste it into Supabase.
5. Click **Run**.

The final query should show:

`cash_grab_matches`

This migration adds only the Cash Grab matchmaking table/functions and Realtime publication. It does not delete Name Rush, friends, SBC votes, account colors, or races.

## 3. Copy the update files
Copy these files into the root of the existing HoopLoop GitHub repository and replace matching files:
- `cash-grab.html`
- `cash-grab.css`
- `cash-grab.js`
- `cash-grab-data.js`
- `verify.html`
- `version.json`

You may also copy the documentation files.

**Do not replace or delete:**
- `config.js`
- `players-data.js`
- `sbc-player-data.js`
- your existing `supabase/setup.sql`

The update ZIP intentionally does not include `config.js`.

## 4. Commit and publish
Suggested commit:

`Expand Cash Grab and add real player matchups`

Then **Push origin** and wait for GitHub Pages to deploy.

## 5. Verify
Open:

`https://YOUR-USERNAME.github.io/hooploop/verify.html`

The Cash Grab checks should report:
- 192 Current players
- 25 All-Time starter players
- v2 engine with Daily/Random boards
- `cash-grab-v2` real-player migration

Hard-refresh with `Ctrl + Shift + R` if an older Cash Grab page is cached.
