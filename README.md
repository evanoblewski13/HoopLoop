# HoopLoopSim Alpha 0.7

Alpha 0.7 introduces a new displayed-overall model and rebuilds the International Basketball Tournament.

## Rating model

Displayed OVR is now the rounded average of the 15 attributes plus 5, capped at 99. Generated players still target the same displayed OVR bands as earlier builds, so the league should look familiar while underlying attributes — and therefore production — are slightly lower.

Existing Alpha 0.6 careers migrate once: displayed OVR is preserved while current attributes are recalibrated to the new model.

## International Basketball Tournament

- First event still begins after a randomly selected Season 3, 4, or 5.
- Repeats every three seasons.
- 48 nations.
- 15 unique group-stage opponents per nation.
- Top 12 qualify; top four receive byes.
- Round of 12 → Quarterfinals → Semifinals → medal games.
- Gold/Silver come from the championship game.
- Bronze is now played by the two semifinal losers.
- Dedicated full-screen navy/white/gold tournament interface.
- Overview, standings, schedule, bracket, and personal tournament-stat tabs.
- Full box scores for every user group-stage game and every knockout game.

No Supabase or SQL changes are required.

See `HOOPLOOPSIM-0.7-UPDATE-GUIDE.md` and `HOOPLOOPSIM-0.7-TEST-CHECKLIST.md`.
