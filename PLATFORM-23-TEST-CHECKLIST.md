# Platform 23 / Pack, Pull, Play v2 Test Checklist

## Deployment
- [ ] `verify.html` says Platform 23.
- [ ] PPP reports 1,249 card versions.
- [ ] No new PPP SQL is requested when the v1 backend is already installed.

## Boosts
- [ ] A build can lock 0 boosts.
- [ ] A build can lock 1, 2, or 3 boosts.
- [ ] More than 3 cannot be selected.
- [ ] Boosted pulls contain a genuinely high-end version.
- [ ] A boosted player's purple styling follows that player after a roster swap.
- [ ] History displays the number of boosts used.

## Pull variance
- [ ] Normal pulls can contain five role/fringe choices.
- [ ] Normal pulls are not guaranteed an All-Star-level option.
- [ ] Closing and reopening an unopened slot preserves the same five choices.
- [ ] Two versions of the same real player cannot coexist on one roster.

## Team-era versions
- [ ] LeBron has Cleveland, Miami, Lakers and Current versions.
- [ ] Kevin Durant has an Oklahoma City team-era version rather than only 2013–14.
- [ ] Dwyane Wade has Miami / Chicago / Cleveland versions.
- [ ] Shaq has multiple team versions including Orlando, Lakers, Miami and late-career stops.
- [ ] Tracy McGrady includes Orlando and Houston versions.
- [ ] Lakers Russell Westbrook is not treated as a boosted premium card; OKC Westbrook can be.

## Roster and minutes
- [ ] Starters remain G-G-F-F-C.
- [ ] Bench slots have no position requirement.
- [ ] Any player still displays his own real position.
- [ ] Swapping a bench player into a starter slot is blocked if his position groups cannot fill that starter requirement.
- [ ] Starter offensive options produce 36 / 35 / 33 / 31 / 30 minutes.
- [ ] Bench order produces 21 / 19 / 15 / 11 / 9 minutes.
- [ ] Two reserves receive 0 minutes.
- [ ] Total rotation minutes equal 240.

## Season
- [ ] `Perfect Season` is used for 82–0.
- [ ] A 0-boost team can finish with a poor losing record.
- [ ] A strong three-boost team can still fail to reach 60 wins.
- [ ] Season results show MIN / PPG / RPG / APG for the roster.
- [ ] Simulated player production reacts to minutes and offensive role.
- [ ] History stores season record, label and boost count.

## Online / regression
- [ ] Existing friend PPP rooms still use a 5:00 build timer.
- [ ] Existing random matchmaking still works.
- [ ] Both players can submit the richer v2 roster JSON.
- [ ] Best-of-seven still waits for both users to simulate each game.
- [ ] Cash Grab v7.2 still loads.
- [ ] Stats Race v4.1 still loads and shows opponent answers after a completed race.
- [ ] Name Rush, SBC and HoopLoopSim navigation still load.
