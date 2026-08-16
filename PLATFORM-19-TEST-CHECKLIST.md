# Platform 19 / Cash Grab v7 test checklist

## Deploy
- [ ] `verify.html` says Platform 19.
- [ ] Cash Grab real-data checks are green.
- [ ] No new SQL was run.

## Builder
- [ ] Current and All-Time boards load.
- [ ] Player cards show name, price, and position without Fit/Talent/Versatility/archetype text.
- [ ] Build exactly five under $15.

## Manual matchups
- [ ] Start a Bot Game.
- [ ] Five GUARDS dropdowns appear.
- [ ] Assign a player across positions, e.g. a PG to guard an SG.
- [ ] A player cannot be assigned to two opponents; changing one assignment swaps the duplicate cleanly.
- [ ] OFF #1-#5 are each unique.

## Game presentation
- [ ] The game begins at READY instead of instantly showing a winner.
- [ ] Simulate Game advances the score once per second.
- [ ] Q1 through Q4 appear in order.
- [ ] Final score equals the four quarter totals.
- [ ] Box score appears only after FINAL.
- [ ] Box rows show PTS / REB / AST and H2H game count or BASE.

## Modes
- [ ] Bot record updates after FINAL.
- [ ] Gauntlet asks for matchups each round.
- [ ] Daily Gauntlet still saves through the existing backend.
- [ ] CPU snake draft works.
- [ ] Online friend/random snake draft still locks lineups and resolves one shared result.
- [ ] Hall of Five still updates.

## Regression
- [ ] Stats Race v4 still opens.
- [ ] Name Rush, SBC, HoopLoopSim, accounts, friends, and navigation still work.
