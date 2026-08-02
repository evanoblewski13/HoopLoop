# HoopLoop Version 7 — Online Platform Build

This package combines the planned Versions 5, 6, and 7 into one foundation build:

- Version 5: real email/password accounts and online daily leaderboards
- Version 6: a separate, configurable Name Rush Practice Mode
- Version 7: friends, friend-only leaderboards, direct challenges, random matchmaking, and live head-to-head races

## Important

GitHub Pages can host the website files, but it cannot provide accounts or a shared database by itself. This build uses Supabase for authentication, Postgres data, Row Level Security, and Realtime updates.

Complete `ONLINE-SETUP.md` once before publishing. Until `config.js` contains your Supabase Project URL and publishable/anon key, the site intentionally displays an Online Setup Required banner. Daily and practice play still work locally, but online saves and races remain disabled.

## Main files

- `index.html` — site structure and all Version 7 interfaces
- `styles.css` — responsive visual design
- `script.js` — game, account, leaderboard, friends, practice, and race logic
- `players-data.js` — 5,108-player database plus official former names
- `config.js` — your Supabase browser connection values
- `verify.html` — live deployment verification page
- `supabase/setup.sql` — database schema, Row Level Security, functions, and Realtime setup
- `ONLINE-SETUP.md` — exact installation instructions
- `TEST-CHECKLIST.md` — two-account test plan

## Name Rush Daily

- Three deterministic initial combinations per date
- Same puzzle for every user
- All combinations contain at least five accepted NBA names
- One official score per account and date
- Shared global and friends-only leaderboards
- Archive generated from the August 1, 2026 launch date
- One standard hint after 30 seconds
- Give Up ends the run without a ranked score

## Practice Mode

- Rookie, Starter, All-Star, and MVP pools
- 3, 5, 10, 25, or Endless sessions
- Hints can be enabled or disabled
- Skipping a round does not end a fixed-length practice session
- Endless Mode tracks solved names until the player ends the session
- Local guest records and online account records

Difficulty is currently estimated using the number of valid answers and the number of active-player answers for an initials combination. It can be upgraded later with hand-curated player popularity ratings.

## Head-to-head Race Mode

- Random quick matchmaking
- Direct friend challenges and invitations
- Same three initials for both competitors
- First database-confirmed completion wins
- No Give Up button
- An additional hint level becomes available every 30 seconds
- Leaving an active race forfeits to the opponent
- Realtime opponent progress bars

## Current anti-cheat level

The database enforces account ownership, one daily score per user/date, friendship access, race participation, and first-finish winner assignment. Player-name checking and displayed timing still occur in browser code. This is appropriate for an early public beta, but it is not tournament-grade anti-cheat. A later version should move answer validation and attempt timing into an Edge Function or server endpoint.

## Version

7.0.0
