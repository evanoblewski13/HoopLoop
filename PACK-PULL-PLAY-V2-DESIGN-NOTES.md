# Pack, Pull, Play v2 — Design Notes

## Core loop
1. Start a fresh twelve-player build.
2. Choose 0–3 boosted mystery slots.
3. Open each slot in any order and pick one of five card versions.
4. Rearrange the final roster.
5. Keep G-G-F-F-C in the starting five.
6. Order the bench and set offensive options / defensive assignments.
7. Simulate a season, CPU game or online best-of-seven.

## Boost philosophy
A boost is optional. It guarantees that the five-card choice set is drawn from high-end **versions**, not high-reputation names. Boost status transfers to the chosen card and visually follows it after roster swaps.

The exact-version rule matters. Prime/team-era Russell Westbrook can qualify while weaker later-team Westbrook versions do not automatically inherit that status.

## Normal-pack philosophy
Normal packs are intentionally volatile. Most packs are cold or standard, so five weak or ordinary choices are possible. Rare hot/jackpot packs can still produce stars without a boost.

The engine samples real player identities before picking a version. A player with six historical versions is therefore not six times more likely to appear than a player with one version.

## Positions
Only the five starter slots are positional:
- G
- G
- F
- F
- C

All seven bench/reserve slots are position-free. Player cards retain their own eligible position groups, and a player can move into the starting five only when that card can fill the destination starter group.

## Rotation
Starter minutes are attached to offensive hierarchy:
- Option 1: 36
- Option 2: 35
- Option 3: 33
- Option 4: 31
- Option 5: 30

Bench order matters:
- 6th man: 21
- 7th man: 19
- 8th man: 15
- 9th man: 11
- 10th man: 9
- Reserves: 0 / 0

Total: 240 team minutes.

## Historical cards
Historical cards represent **team-tenure versions**. A multi-season stint is combined into one version using that player's real games for that franchise. This avoids a fake overall and avoids choosing one peak year to stand in for an entire team era.

Examples include Cleveland / Miami / Lakers LeBron, Oklahoma City / Golden State / Brooklyn / Phoenix Durant, multiple Shaq stops, multiple Wade stops, and Orlando / Houston Tracy McGrady.

## Season result
The 82-game season returns:
- final record
- season label
- boost count
- simulated player MIN / PPG / RPG / APG

The player-stat table begins from the card's real statistical baseline, then adjusts it for PPP minutes, starter offensive option, bench role and small season-to-season variance.

## Season labels
- 0–10: Abysmal
- 11–20: Trash
- 21–30: Wack
- 31–41: Mid
- 42–50: Decent
- 51–59: Good
- 60–67: Great
- 68–73: Amazing
- 74–81: Elite
- 82–0: Perfect
