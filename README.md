# HoopLoop Version 8 — Start, Bench, Cut

Version 8 adds HoopLoop's second complete game while preserving the working Name Rush accounts, friends, leaderboards, practice records, and races from Version 7.1.

## What is new

- `start-bench-cut.html` — the complete second game
- Daily Start, Bench, Cut with a permanent archive
- Anonymous community role percentages and exact-lineup percentage
- One official saved lineup per account and date
- Unlimited Playground generation
- Modern, All-Stars, and Random player pools
- All Positions, Guards, Forwards, and Bigs filters
- Player cards with headshots, position, career span, games, PPG, RPG, APG, active status, and All-Star selections
- Homepage navigation and a live Game 02 card
- Version 8 deployment verification

## Player-pool rules

### Modern
Players marked active in the HoopLoop player source used for this release.

### All-Stars
Players verified as having been selected to at least one NBA All-Star Game.

### Random
Every active player plus retired players with at least 100 NBA games.

### Position filters
- Guards: records containing a guard designation
- Forwards: records containing a forward designation
- Bigs: records containing a center designation
- Hybrid players can appear in more than one position filter
- Players without trustworthy position data remain available in All Positions only

Read `SBC-DATA-AUDIT.md` for counts and known limitations.

## Required installation order

1. Run `supabase/sbc-v8.sql` in the same Supabase project already used by HoopLoop.
2. Copy the Version 8 update files into the root of the existing GitHub repository.
3. Preserve the working `config.js` and `players-data.js` files already in the repository.
4. Commit and push with GitHub Desktop.
5. Open `verify.html`; Version 8 should show seven green checks.

Detailed instructions are in `V8-UPDATE-GUIDE.md`.

## Important files

- `sbc-player-data.js` — Start, Bench, Cut player cards and pool metadata
- `sbc.js` — game generation, assignments, voting, results, archive, and authentication integration
- `sbc.css` — dedicated responsive design
- `supabase/sbc-v8.sql` — secure Daily vote table and aggregate-result functions
- `verify.html` — deployment and backend verification

## Data and image note

This is an unofficial fan project. Player data should be periodically refreshed and audited. The prototype attempts to load player headshots from NBA-hosted image URLs and falls back to a clean initials card when an image is unavailable. Review the applicable data, trademark, and image-use terms before a commercial public launch.
