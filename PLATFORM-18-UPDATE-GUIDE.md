# HoopLoop Platform 18 / Stats Race v4 update

## Backend
**No new SQL migration is required.** Stats Race v4 deliberately stays within the v3 backend's 3,000-point ceiling and continues using the installed v3 RPCs.

If Stats Race v3 is already working, do not run any SQL for this update.

## Install
1. Back up or commit the current HoopLoop repository.
2. Copy this update folder into the repository root and replace matching files.
3. Keep your existing `config.js`.
4. Commit: `Expand Stats Race dossier and tighten scoring`.
5. Push and wait for GitHub Pages.
6. Hard-refresh `stats-race.html` and `verify.html`.

## What to test first
- Donovan Mitchell All-NBA answer: correct `3` = 100; `4` = 80; `5` = 50; `6` = 25; `7+` = 0.
- ROTY appears; All-Rookie does not.
- Shooting hand, DPOY, SPG, BPG, TPG, FG%, triple-doubles appear when audited.
- Current profiles with audited salary data show NBA salary earned through 2025-26.
- Untimed Practice still works.
- Daily / CPU / online races remain 90 seconds.
