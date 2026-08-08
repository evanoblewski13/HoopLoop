# HoopLoop Platform 9 / Cash Grab v1 — Update Guide

This update adds Cash Grab, shared game navigation, and account accent colors. It preserves Name Rush, Start Bench Cut, and HoopLoopSim Alpha 0.9.

## Before copying files

Back up the current HoopLoop repository folder or make sure the latest version is committed in GitHub Desktop.

Do **not** delete these existing files:

- `config.js`
- `players-data.js`
- `sbc-player-data.js`
- the existing `supabase/` files

The update ZIP intentionally does not contain your private `config.js`.

## 1. Run the accent-color SQL migration

In the existing Supabase project:

1. Open SQL Editor.
2. Create a New Query.
3. Open `supabase/platform-v9-accent.sql` from this update.
4. Copy the entire file into Supabase.
5. Click Run.

Success should return one row for `accent_color`.

This does **not** delete accounts, scores, friends, races, or SBC votes.

## 2. Copy the update

Copy all files from this update folder into the root of the existing HoopLoop GitHub repository and replace matching files.

Important new files include:

- `cash-grab.html`
- `cash-grab.css`
- `cash-grab.js`
- `cash-grab-data.js`
- `theme.js`
- `theme-account-sync.js`

The update also replaces the existing:

- `index.html`
- `styles.css`
- `script.js`
- `start-bench-cut.html`
- `sbc.css`
- `sbc.js`
- HoopLoopSim HTML/CSS/JS files so the navigation/theme stays consistent
- `verify.html`

## 3. Commit and push

Suggested commit message:

`Add Cash Grab and HoopLoop Platform 9 navigation`

Then:

1. Commit to main.
2. Push origin.
3. Wait for the GitHub Pages deployment green check.

## 4. Verify

Open:

`https://YOUR-USERNAME.github.io/hooploop/verify.html`

The Platform 9 verifier checks Cash Grab and the new profile color column in addition to the previous platform systems.

HoopLoopSim still has its own:

`https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html`

Hard refresh with Ctrl + Shift + R after deployment.
