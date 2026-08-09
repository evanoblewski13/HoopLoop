# Cash Grab v5 — Design Notes

## Lineup positions
Cash Grab still allows any five-player roster. After the five are chosen, the user assigns one player to each game slot: PG, SG, SF, PF, C.

The slot is a matchup assignment, not a restriction on who can be drafted. A natural center can be assigned PG if the user wants that matchup. The opposing lineup is matched slot-for-slot.

## Offensive options
Each lineup must also have a unique 1st, 2nd, 3rd, 4th, and 5th option.

The shot-volume multipliers are intentionally separate from shooting efficiency:
- 1st: 1.35× opportunity preference
- 2nd: 1.16×
- 3rd: 1.00×
- 4th: 0.87×
- 5th: 0.74×

The simulation still uses player scoring/shooting/finishing ratings and direct defender quality to decide efficiency. This allows a defensive specialist to be intentionally placed 5th without reducing their defensive value.

## Online pick clock
The database stores an absolute `turn_deadline` for every online pick. The browser displays time remaining from that shared deadline, so both players are looking at the same clock.

After a legal pick, the database advances the snake order and creates a new deadline 60 seconds later.

When the deadline expires, either connected participant can invoke the timeout resolver. The resolver prefers a $1 player and also verifies that both five-player rosters can still be completed under $15. If no legal $1 remains, it takes the cheapest legal fallback rather than breaking the draft.

## Live room behavior
Realtime draft updates now mutate the open draft room directly instead of tearing down and reopening the room after each opponent pick. The intended experience is to enter the draft once and remain there through all ten selections and lineup setup.
