# HoopLoop Platform 23 / Pack, Pull, Play v2 — Update Guide

## What changes
- Pack, Pull, Play v2.0.0
- 0–3 user-selected boosts instead of exactly three
- boost styling follows the selected card after roster swaps
- normal pulls have a much wider floor and can produce genuinely bad teams
- 1,249 card versions: 534 Current + 715 real team-era versions
- historical cards use a player's combined production for that NBA team stint, not one cherry-picked season
- bench slots have no position lock; only the starting five must remain G-G-F-F-C
- bench order controls minutes (6th through 10th man), with two zero-minute reserves
- season results include simulated MIN / PPG / RPG / APG adjusted for the built roster and roles
- History saves the boost count beside the record
- `Perfect Season` replaces `Perfection Season`

## Database
**No new SQL is required if Pack, Pull, Play v1 is already installed.**

PPP v2 continues to use the existing:
`supabase/pack-pull-play-v1.sql`

The v1 backend stores the 12-card roster as JSON, so the new boost-count and boosted-card fields remain compatible.

If PPP v1 was never installed, run `supabase/pack-pull-play-v1.sql` once.

Keep the existing Stats Race v4.1 and Cash Grab v5 backends.

## Install
1. Back up or commit the current HoopLoop repository.
2. Extract `hooploop-platform-23-pack-pull-play-v2.zip`.
3. Copy the contents of `hooploop-platform-23-update` into the repository root.
4. Replace matching files.
5. Do **not** delete or replace `config.js`, the main Name Rush player database, SBC data, or unrelated HoopLoopSim files not included here.
6. Commit, for example: `Upgrade Pack Pull Play to v2`.
7. Push origin and wait for GitHub Pages to deploy.
8. Open `/verify.html` and hard-refresh with **Ctrl + Shift + R**.

## First checks
- Try a 0-boost build and a 3-boost build.
- Swap a boosted player to another roster slot and confirm the boost color follows the player.
- Confirm bench slots show no required position.
- Confirm starters still require G-G-F-F-C.
- Sim a season and confirm the record, boost count and player season-stat table appear.
- Save the team and confirm History preserves its boost count and season record.
