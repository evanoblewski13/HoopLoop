# HoopLoop Platform 17 — Stats Race v3 update

## Install
1. Back up the current HoopLoop repository.
2. In Supabase SQL Editor, run `supabase/stats-race-v3.sql`.
3. Copy this folder into the HoopLoop repository root and replace matching files.
4. Do **not** replace `config.js`.
5. Commit and push. Suggested commit: `Upgrade Stats Race to v3 deeper reports and untimed practice`.
6. Hard-refresh the deployed site (`Ctrl + Shift + R`).
7. Open `verify.html`; Platform 17 checks should be green.

## What changed
- Country/nationality is now independent of college/route. `Serbia` earns 100 for Nikola Jokić.
- Common team forms are accepted: full team, city, nickname, plus stored abbreviations (for example Cleveland Cavaliers / Cleveland / Cavaliers / Cavs / CLE).
- Added All-NBA and All-Rookie selection counts.
- Current reports now include career-high points, rebounds, and assists.
- Practice has 90-second and Untimed ∞ options. Daily and races remain 90 seconds.
- Score ceilings rise to 2,100 retired / 2,200 current, so the v3 SQL migration raises database score constraints.

## Accuracy policy
This release does **not** auto-fill unverified players. The audited core remains 40 retired + 16 current profiles while the engine is now ready for larger verified data drops. Add a profile to Daily/Race only after every displayed field has been checked.
