# Cash Grab v5 — Internal Validation Notes

Static and simulation checks run before packaging:

- JavaScript syntax: passed with `node --check`.
- Cash Grab data: 192 Current players and 230 All-Time players retained.
- HTML/JavaScript DOM reference integration: no missing static element IDs.
- Auto lineup configuration: five unique matchup positions and five unique offensive-option ranks.
- Custom matchup test: assigning Stephen Curry to the C slot correctly matched him against the opponent's assigned center.
- Offensive-option comparison across 500 identical game seeds:
  - Stephen Curry as 1st option: ~18.97 FGA/game.
  - Stephen Curry as 5th option: ~12.32 FGA/game.
  - Player ratings and shooting-percentage formulas were unchanged between those two tests.
- v5 migration contains a 60-second database deadline, timeout-pick resolver, lineup submission RPC, and shared-budget feasibility check.

The Supabase Realtime/timer behavior must still be tested on the live project with two authenticated accounts after running the migration.
