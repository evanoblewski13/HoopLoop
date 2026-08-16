# Pack, Pull, Play v1 design notes

## Core loop
1. New team creates 12 mystery roster slots.
2. Starters are fixed to G / G / F / F / C pull slots.
3. The seven bench/reserve pull slots receive randomized G/F/C requirements.
4. Before opening, the user chooses exactly three boosted slots.
5. Every opened slot offers five cards and the user keeps one.
6. No real NBA player can appear twice on one roster even if multiple versions of that player exist.
7. After all 12 pulls, players can be swapped between slots while starter legality remains G / G / F / F / C.

## Rotation
Pack, Pull, Play uses 48-minute NBA-style games because the requested rotation fits a 240-minute team total:
- starters: 34 / 34 / 33 / 32 / 32
- rotation bench: 15 / 15 / 15 / 15 / 15
- reserves: 0 / 0

## Card philosophy
There are no displayed overalls. Cards use real statistical production.

Launch pool:
- 534 current-player identities after the August 2026 retirement correction
- 534 Current cards
- 40 additional audited peak-season variants
- 577 total card versions

The 40 peak cards use real peak-season profiles already audited for Cash Grab. Three explicit team-era cards were also added for the launch examples: 2012-13 Miami LeBron and 2021-22 / 2025-26 Westbrook. Current LeBron is labeled Philadelphia and uses his 2025-26 current-form statistical baseline.

Boosted slots do not use a fake rating or career reputation. Eligibility is recalculated for each specific card version from its real production: 20+ PPG or a strong all-around production threshold. This keeps weak late-career variants out of boosted pulls.

## Gameplay data
Where a card has a detailed Cash Grab profile, Pack, Pull, Play uses that detailed NBA baseline. Other active players still use their real stored NBA PPG/RPG/APG snapshot rather than an invented overall.

Direct starter-vs-starter game simulations reuse the Cash Grab real H2H layer when a matchup sample exists. Current versions prefer the recency-weighted H2H sample; peak versions use the broader historical shared-game sample.

## Season mode
Season mode simulates 82 games against the 30-team 2025–26 NBA standings snapshot. Each team appears at least twice; 22 opponents appear a third time to create 82 total games.

Labels:
- 0–10 wins: Abysmal
- 11–20: Trash
- 21–30: Wack
- 31–41: Mid
- 42–50: Decent
- 51–59: Good
- 60–67: Great
- 68–73: Amazing
- 74–81: Elite
- 82: Perfection

## Development balance benchmark
2,000 randomly generated legal teams with three random boosted slots:
- median team power landed near the calibration center
- median season: 41 wins
- 10th percentile: about 9 wins
- 90th percentile: about 74 wins
- observed test range: 0 to 82 wins

This benchmark is not a forced live result distribution. It is a guardrail against every random team becoming either dominant or terrible.
