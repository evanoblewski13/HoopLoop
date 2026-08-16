# Pack, Pull, Play v2 — Data Notes

## Pool
Platform 23 contains:
- 534 Current cards
- 715 historical team-era cards
- 1,249 total card versions

The 715 historical versions cover 230 established players from the existing HoopLoop all-time pool across their qualifying NBA team stints.

## Team-era construction
Historical production is aggregated by player + franchise rather than by one hand-selected season.

For older seasons, the build uses season-level NBA player statistics. For modern seasons, it uses player game logs and combines the real games from a player's stint with that franchise. Overlapping source years are not double-counted.

A team stint must have enough NBA games to be useful as a playable version; tiny cameo stints are filtered out.

## Identity rule
Every version has its own card ID, but versions of the same person share a base identity. Pulling one LeBron prevents every other LeBron version from joining that same twelve-player roster.

## Boost eligibility
Boost eligibility is calculated for the exact version. It is intentionally stricter than simply being tagged `strong` in the broad pack-quality bands. Elite versions qualify; strong versions require borderline All-Star-level production for that exact stint.

## Hidden quality bands
PPP v2 uses hidden production bands only to determine pack luck:
- fringe
- role
- solid
- strong
- elite

They are not displayed as player ratings or overalls and are not the Cash Grab game simulation formula. Actual game/stat production starts from real player statistical baselines and the existing matchup layer.

## Normal pack mix
Normal pack quality is selected per pull from four pack temperatures. Cold and standard pulls are most common; hot and jackpot pulls are rare. This allows real bad luck without making stars impossible in an unboosted run.

## Balance benchmark
A 1,500-build test was run for each boost count with an intentionally strong test user who always selected the highest-valued option from every five-card choice set.

Approximate season results:
- 0 boosts: mean 38 wins, median 37, 10th percentile 16, 90th percentile 62
- 1 boost: mean 46 wins, median 47, 10th percentile 24, 90th percentile 69
- 2 boosts: mean 55 wins, median 56, 10th percentile 32, 90th percentile 74
- 3 boosts: mean 61 wins, median 64, 10th percentile 43, 90th percentile 77

These are validation distributions, not hard-coded records.
