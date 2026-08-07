# HoopLoopSim Alpha 0.5 — Update Guide

Alpha 0.5 is the first release under the **HoopLoopSim** name. It is a HoopLoop-only static update: **no Supabase changes and no SQL are required**.

## Before updating

1. Open your current simulator.
2. Export any career you would be upset to lose. Export creates a portable JSON backup.
3. In GitHub Desktop choose **Repository → Show in Explorer**.
4. Make a quick copy of the current repository folder if you want an extra backup.

## Install

Copy these Alpha 0.5 files directly into the root of your existing HoopLoop repository:

- `hooploopsim.html`
- `hoopsim.html` (backward-compatible redirect)
- `hoopsim.css`
- `hoopsim.js`
- `hoopsim-teams.js`
- `hoopsim-verify.html`
- `version.json`
- the Alpha 0.5 documentation files

Replace matching HoopLoopSim/HoopSim files when prompted.

Do **not** delete or replace unrelated HoopLoop files such as:

- `config.js`
- `players-data.js`
- `sbc-player-data.js`
- `supabase/`

## Homepage rebrand

Your main HoopLoop homepage is not included because it may contain newer Name Rush / Start, Bench, Cut changes than the simulator package.

Open your live repository `index.html` and change the simulator card manually:

- `HoopSim` → `HoopLoopSim`
- link target → `hooploopsim.html`
- button text → `PLAY ALPHA 0.5 →`

Suggested description:

> A customizable basketball career simulator built around player creativity and choice.

## Commit and deploy

Suggested GitHub Desktop commit message:

`Rebrand HoopSim and add International HoopLoop League`

Then:

1. **Commit to main**
2. **Push origin**
3. Wait for GitHub Pages deployment to receive a green check
4. Open `https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html`
5. Confirm every check is green
6. Open `https://YOUR-USERNAME.github.io/hooploop/hooploopsim.html`
7. Hard refresh with `Ctrl + Shift + R`

The old `/hoopsim.html` URL remains as a redirect so old links/bookmarks continue to work.

## Save compatibility

Alpha 0.5 intentionally preserves the older IndexedDB/local-storage identifiers internally. This is not visible branding; it prevents existing Alpha 0.4 careers from disappearing just because the public game name changed.
