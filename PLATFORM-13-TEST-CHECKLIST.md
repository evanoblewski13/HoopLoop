# Cash Grab v5 / Platform 13 Test Checklist

## Normal lineup setup
- [ ] Build any legal five-player team.
- [ ] Five position selectors appear.
- [ ] PG, SG, SF, PF, and C each appear exactly once.
- [ ] Changing one position swaps the player who previously held that slot.
- [ ] Five offensive-option selectors appear.
- [ ] Options 1, 2, 3, 4, and 5 each appear exactly once.
- [ ] Changing one option swaps the conflicting option rather than creating duplicates.

## Game / box score
- [ ] Bot Game uses the assigned positions for direct matchups.
- [ ] Gauntlet keeps the lineup settings chosen at the start of the run.
- [ ] Box score rows display PG → SG → SF → PF → C.
- [ ] Box score displays `OPT` #1–#5.
- [ ] #1 option generally receives more shot volume than the same player set as #5, without an automatic shooting-percentage bonus.

## CPU draft
- [ ] Snake order is unchanged.
- [ ] CPU draft still cannot dead-end either $15 roster.
- [ ] After pick 10, the game waits for your position/offensive-option setup.
- [ ] Locking the lineup starts the 40-minute game.

## Online draft
- [ ] Friend invite can be accepted.
- [ ] Random-player matchmaking still works.
- [ ] Once drafting starts, both users remain on one live draft screen.
- [ ] Pick made by Player 1 appears on Player 2's board through Realtime without reopening the room.
- [ ] 60-second clock resets after every pick.
- [ ] Clock is synchronized from the database deadline, not a local 60-second guess.
- [ ] At 0, an available legal $1 player is assigned automatically.
- [ ] If no legal $1 remains, the cheapest legal fallback prevents a dead-end.
- [ ] After pick 10, both users independently set positions and offensive options.
- [ ] Game does not resolve until both lineups are locked.
- [ ] Both accounts see the same final score and box score.

## Regression
- [ ] Current and All-Time boards still work.
- [ ] Daily and Random boards still work.
- [ ] Daily Gauntlet attempt rules still work.
- [ ] Hall of Five still loads/saves.
- [ ] Accent color still applies.
- [ ] Name Rush, SBC, and HoopLoopSim links still work.
