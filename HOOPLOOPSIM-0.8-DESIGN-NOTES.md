# HoopLoopSim Alpha 0.8 Design Notes

## Progression
Alpha 0.8 does not add a potential rating. Development remains performance, age, durability, injury, playstyle, and variance driven. First-year starters receive a higher chance of a genuine breakout event, especially when their production supports it. The event is probabilistic rather than guaranteed.

## Generated names
The original generated-name arrays remain unchanged. A secondary international pool is mixed in occasionally. The previously supplied easter-egg names are still rare, but their chance is modestly increased at initial-league generation and during future roster replenishment.

## Height distribution
Generated-player height still starts from position-specific norms. Alpha 0.8 adds low-probability tail events so a league can occasionally contain unusually tall bigs and unusually short guards. Height remains bounded to plausible basketball extremes.

## League History
Detailed League History is stored as snapshots rather than live references. That keeps a champion or award winner readable even if the player later changes teams or retires. Existing saves cannot always reconstruct old league-wide award winners because previous versions did not preserve those snapshots.

## International medal flow
The knockout sequence is now Round of 12 → Quarterfinals → Semifinals → Bronze Medal Game → Gold Medal Game. The Bronze participants are the two semifinal losers. The Gold participants are the two semifinal winners.
