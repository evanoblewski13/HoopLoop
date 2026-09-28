# HoopLoop Platform 26 — Full Cohesion Update

## What this is
A frontend-only platform overhaul focused on cohesion, simplicity, and removing excess copy. Existing game logic and Supabase backends are preserved.

## Install
1. Commit/back up the working repo.
2. Copy the contents of `hooploop-platform-26-update` into the repo root.
3. Replace matching files.
4. **Do not delete or replace `config.js`, `players-data.js`, existing game JS/CSS files that are not included, or your Supabase folder.**
5. No SQL migration is required.
6. Commit, push, and hard-refresh `/verify.html`.

Suggested commit: `Unify HoopLoop design and navigation`

## New shared files
- `hooploop-ui.css`
- `hooploop-ui.js`
- `HOOPLOOP-DESIGN-SYSTEM.md`

These sit on top of the existing game styles so future games can share one platform shell without rewriting working game logic.
