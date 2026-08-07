# HoopLoopSim Alpha 0.6

Alpha 0.6 repairs the creator-to-draft transition that broke in Alpha 0.5 and removes the standalone International League mode. International basketball now appears as an optional offseason tournament inside a normal HoopLoopSim career.

## Major changes

- Fixed the missing `draft-stage-eyebrow` element that caused the game to crash after player creation.
- Domestic HoopLoopSim league creation is again the only career setup mode.
- Added an optional International Basketball Tournament:
  - first scheduled after Season 3, 4, or 5 (random per career)
  - returns every three seasons
  - 48 country teams
  - each country plays exactly 15 different group-stage opponents
  - top 12 advance
  - seeds 1–4 receive byes
  - single-game knockout rounds
  - Gold, Silver, and Bronze medals can be added to the user's trophy case
- Removed Madagascar and New Zealand from the international team pool.
- `hoopsim.html` now redirects to `hooploopsim.html` so an older duplicate interface cannot be loaded accidentally.
- Keeps the Alpha 0.5 stat rebalance, random player generator, stat filters, trade confirmation, and other domestic improvements.

No Supabase or SQL changes are required.

See `HOOPLOOPSIM-0.6-UPDATE-GUIDE.md` and `HOOPLOOPSIM-0.6-TEST-CHECKLIST.md`.
