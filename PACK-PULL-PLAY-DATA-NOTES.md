# Pack, Pull, Play v1 data notes

## Identity pool
The base identity layer is the existing HoopLoop Start, Bench, Cut active snapshot generated August 2, 2026:
- 534 current player identities after the August 12 Russell Westbrook retirement correction
- NBA player IDs
- position labels / groups
- NBA career PPG, RPG, APG snapshots
- All-Star selection metadata
- NBA-hosted headshot URLs

## Real-stat enrichment
The existing Cash Grab v7.2 real-data file provides richer profiles for 184 of those active identities and the shared-game H2H layer used by game simulations.

## Historical versions
Forty identities have an audited real peak-season Cash Grab profile. Three explicit team-era cards are also included at launch: Miami 2012–13 LeBron James, Lakers 2021–22 Russell Westbrook, and Kings 2025–26 Russell Westbrook. A historical version shares the same `baseId` as every other version of that player, so duplicate protection blocks selecting two versions of the same real person.

Examples include peak-season versions of LeBron James, Stephen Curry, Kevin Durant, Russell Westbrook, James Harden, Chris Paul, Anthony Davis, Nikola Jokić, Giannis Antetokounmpo, and others. Russell Westbrook's August 12, 2026 retirement is reflected by removing his Current card while retaining real historical team-season versions.

The card system is data-driven. More real team-season versions can be appended later without rewriting the pack, roster, season, or PvP engines.

## Season opponents
The v1 season opponent-strength snapshot uses final 2025–26 NBA regular-season records. It does not pretend to replay every exact 2025–26 lineup or injury state.

## Boost eligibility
Boosts are evaluated at the **card-version** level, not by career reputation. A late-career version of a former star does not become boosted just because that player made All-Star teams years earlier. The launch threshold uses actual version production (20+ PPG or an all-around production threshold).

## Position coverage
Cards with an unaudited position label remain eligible for random bench pulls but are not guessed into a G/F/C starter slot. This keeps the identity pool broad without inventing a position.
