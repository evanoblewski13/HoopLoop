# Start, Bench, Cut Data Audit

Generated: August 2, 2026  
Build: 8.0.0

## Pool counts in this release

| Pool | Players |
|---|---:|
| Player-card database | 2,857 |
| Modern / marked active | 535 |
| Verified NBA All-Stars | 466 |
| Random eligible | 2,836 |

Random eligibility follows the agreed rule:

```text
Active player OR at least 100 NBA games
```

## Information stored per player

- NBA player ID
- Display name
- Active status
- Position and position groups
- NBA games played
- Career PPG, RPG, and APG
- Career start and end years
- NBA All-Star selections
- Random-mode eligibility
- NBA-hosted headshot URL with initials fallback

## Position grouping

- `G` records enter Guards
- `F` records enter Forwards
- `C` records enter Bigs
- Hybrid records such as `G-F` or `F-C` enter every matching group
- Records without trustworthy position data are included only in All Positions

In this snapshot, 181 players marked active lack a trustworthy position in the available historical source. They remain playable in Modern → All Positions but are not guessed into a specific position group.

## All-Star verification

The source list contained 466 unique NBA All-Stars through the 2026 event. Every source name was matched to a HoopLoop player record. Duplicate-name cases were manually resolved by NBA player ID, including Patrick Ewing, Bobby Jones, Glen Rice, Eddie Johnson, Larry Johnson, Jim Paxson, and Steve Smith.

## Recognition weighting

The generator does not treat every eligible player as equally recognizable.

- Modern and All-Stars give more weight to games played, All-Star selections, scoring, and active status.
- Random reduces that popularity weighting so historical variety remains meaningful.
- Daily puzzles use deterministic weighted selection, giving every visitor the same trio for a date.
- All Positions Daily matchups try to include a guard, forward, and big when the pool permits.

## Known limitations

1. The NBA's active roster changes frequently during the offseason. Modern mode uses the stable active flags available when this release was generated and should receive periodic roster refreshes.
2. Career statistics are based on the combined historical data snapshots available to HoopLoop. Recently active players may not include every game from the latest season.
3. Historical positional labels are broad and can differ across sources or eras.
4. Headshot availability is controlled by the external image host. Missing images use the built-in fallback.
5. All-Star selections represent selection to the event, including recognized replacements where present in the source list.

These limitations are displayed honestly rather than filling uncertain fields with guesses.
