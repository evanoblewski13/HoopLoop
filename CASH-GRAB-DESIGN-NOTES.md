# Cash Grab v2 — Design Notes

## Core loop
- 5×5 board: five players at each $1–$5 price tier.
- Build any five-player roster with a maximum virtual budget of $15.
- User rosters have no forced positions.
- Generated board columns use 2–3 guards among their five options to preserve useful variety.

## Board types
### Daily Board
- Same board for every player on the same Chicago-calendar date and player pool.
- Available in Current, All-Time, and Mixed.
- Useful for friends/community comparison.

### Random Board
- Reroll infinitely.
- Same Current / All-Time / Mixed choices.
- Current pool contains 192 players in v2.

## Matchup model
- 50% Fit
- 30% Talent
- 20% Versatility / diversity

Fit considers lineup shape, spacing, creation, perimeter defense, rim protection, rebounding, off-ball value, and ball-dominance conflicts.

## Opponents
### Bots
Immediate generated opponent from the same player-pool mode.

### Real players
Requires the existing HoopLoop account/Supabase connection plus `supabase/cash-grab-v2.sql`.
- Invite Friend: friend receives the inviter's exact board and builds a five-player response.
- Face Random Player: submits the current roster to matchmaking. Players are paired by board type and player-pool mode.
- Daily players naturally share the same board. Random-board opponents may have different random boards, but both retain the same $15 cap.

## Gauntlet
The exact ten-round player-price ladder from v1 is preserved internally, but the interface is intentionally just a 1–10 checklist. Completed rounds receive ✓ and the failed round receives ×.

## Player card cleanup
The four unexplained mini ability bars from v1 were removed. The archetype text (e.g. `Stretch Big`, `Two-Way Wing`) is now the quick scouting preview.
