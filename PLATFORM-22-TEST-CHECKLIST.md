# Platform 22 test checklist

## Navigation
- [ ] Higher or Lower no longer appears in the shared game navigation.
- [ ] Pack, Pull, Play appears on Home, SBC, Cash Grab, Stats Race, and HoopLoopSim.
- [ ] Friends is gone from the top navigation.
- [ ] Open the Name Rush account/profile modal and confirm its existing **Friends** button still opens the Friends manager.

## Pack
- [ ] New roster shows 5 starter mystery cards and 7 bench/reserve mystery cards.
- [ ] Starter slots are G / G / F / F / C.
- [ ] Bench/reserve mystery slots receive randomized G/F/C pull positions.
- [ ] Exactly three slots can be chosen as boosts before locking.
- [ ] Boosted slots remain visibly purple after locking.
- [ ] Cards can be opened in any order.
- [ ] Every opened card shows exactly five choices.
- [ ] Boosted pulls contain only boost-eligible / borderline All-Star-or-better choices.
- [ ] The same real player cannot be selected twice, including different versions of that player.
- [ ] Peak variants show their team + season label when available.

## Pull / roster editing
- [ ] Selecting one of the five options permanently fills that slot.
- [ ] After all 12 are selected, click one filled slot then another to swap.
- [ ] Bench players can move into starter slots only when eligible for that G/F/C slot.
- [ ] Final starting five always remains G / G / F / F / C.
- [ ] Rotation shows 34/34/33/32/32 starter minutes, five 15-minute bench roles, and two 0-minute reserves (240 total minutes).
- [ ] Offensive options 1–5 remain unique after changes.

## Season
- [ ] Season sim runs all 82 games in one action.
- [ ] Result shows W–L record and one of: Abysmal / Trash / Wack / Mid / Decent / Good / Great / Amazing / Elite / Perfection.
- [ ] 82–0 is labeled Perfection.
- [ ] Season result is saved into team history.
- [ ] History keeps no more than five teams.
- [ ] A saved team can be loaded again.

## CPU game
- [ ] CPU gets a unique 12-player generated roster.
- [ ] Defensive assignments can cross nominal positions and remain one-to-one.
- [ ] Offensive order is independent from defense.
- [ ] Single game produces four quarter totals and a final score.
- [ ] Box score totals display MIN / PTS / REB / AST for all 12 players.
- [ ] Two reserves show 0 minutes.

## Friend / Random best-of-seven
- [ ] Run `supabase/pack-pull-play-v1.sql` first.
- [ ] Friend invite can be sent to an accepted HoopLoop friend.
- [ ] Incoming invite appears on the challenged user's Pack, Pull, Play page.
- [ ] Accepting starts one shared 5:00 build deadline.
- [ ] Both players build separate fresh teams.
- [ ] Submitting early does not reduce the other player's remaining time.
- [ ] At 0:00, an unfinished local roster auto-fills and submits.
- [ ] When both rosters are in, each player sees the other starting five and sets defensive assignments.
- [ ] Series does not begin until both gameplans are locked.
- [ ] Game 1 requires both players to click Simulate.
- [ ] Repeat for each game; series ends immediately when one side reaches four wins.
- [ ] Game 7 still displays before the final series result if required.

## Regression
- [ ] Cash Grab v7.2 still loads.
- [ ] Stats Race v4.1 still shows opponent answers after races.
- [ ] Start, Bench, Cut still loads.
- [ ] HoopLoopSim Alpha 0.9 still loads existing saves.
- [ ] Name Rush account/profile Friends button still works.
