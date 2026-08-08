# Cash Grab v3 design notes

## Core game
- Virtual $15 roster budget; no real-money or wagering features.
- Five-player, five-on-five games.
- 40 minutes per game; all five players play all 40 minutes.
- Stamina and injuries are intentionally not simulated.
- Team model: 50% fit, 30% talent, 20% versatility/diversity.
- Full quarter line score and player box scores are generated for every v3 game.

## Boards
- Current and All-Time only; Mixed was removed.
- Current ratings represent current ability; All-Time ratings represent peak versions.
- Every $1-$5 column is generated as G-G-F-F-C.
- Users are not required to draft a positional shape; all five centers or all five guards are legal if the board/budget permits it.

## Daily
- Daily boards are deterministic by Chicago date and player pool.
- One official Daily Gauntlet attempt per logged-in account, date, and pool.
- Past Daily boards remain available as practice.
- Official standings rank: rounds cleared → point differential → points scored → earliest completion.
- Gauntlet game seeds are deterministic for the date/round/selected lineup, preventing refresh rerolls.

## Opponents
- Bot and Gauntlet opponents cannot duplicate a player within their own five.
- They cannot use any player already on the user's team.
- Gauntlet price compositions remain the original ten-round ladder.

## Snake Draft
- First picker is randomized.
- Pick order: P1, P2, P2, P1, P1, P2, P2, P1, P1, P2.
- Both sides share one 25-player board.
- Drafted players are unavailable to the other side.
- Each side has its own $15 cap and may finish under budget.
- Client validation prevents a pick that would leave too little money to complete five players.
- CPU and realtime friend/random-player versions use the same draft rules.
