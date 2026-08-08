# Cash Grab v4 Design Notes

## Game model
Cash Grab remains a 5v5, 40-minute game. All five players play the full game. Stamina and injuries are not simulated.

Team strength remains:
- 50% fit
- 30% talent
- 20% versatility/diversity

v4 changes how that strength becomes a box score.

## Shared possessions
Both teams now begin from the same game-level possession count. A team's field-goal attempts are then derived primarily from:

`FGA ≈ possessions + offensive rebounds - turnovers - 0.44 × FTA`

This prevents unexplained shot-attempt gaps. Small differences remain natural; larger differences should now have visible causes in ORB, turnovers, and free-throw volume.

## Positional matchup assignment
Every lineup is sorted into matchup slots:

PG → SG → SF → PF → C

The sort uses the player's listed natural position. If a roster contains duplicate positions, the five players are still ordered from smallest/most guard-like to biggest/most center-like and mapped across the five matchup slots.

The player in the opposing slot is the direct defender. Perimeter defense matters more at guard slots, while rim defense matters increasingly toward PF/C.

## Player variance
Shot volume uses usage, scoring skill, matchup quality, and a game-to-game volatility factor. Elite scorers have a small additional chance of a hot/explosion game. A favorable defender increases that chance; a difficult defender reduces it.

There is no forced 50-point event. It is simply possible within the normal simulation.

Rebounds, assists, steals, and blocks also receive more game-level distribution variance.

## Hall of Five
Each user keeps their five best unique Gauntlet lineups. Ranking is:
1. Rounds cleared
2. Point differential
3. Points scored

Repeating the same five-player lineup only replaces its stored result if the newer run is better.

Logged-in users sync through `cash_grab_hof`; guests retain a local-device version.
