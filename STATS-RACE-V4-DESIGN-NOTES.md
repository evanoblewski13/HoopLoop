# Stats Race v4 design notes

## Goal
The 90-second report should feel intentionally overstuffed. A knowledgeable player should still have another useful answer to type when time expires.

## Résumé scoring
Counts such as championships, MVPs, Finals MVPs, ROTY, DPOY, All-Star selections, All-NBA selections, and retired seasons played use:

| Error | Points |
|---:|---:|
| exact | 100 |
| 1 away | 80 |
| 2 away | 50 |
| 3 away | 25 |
| 4+ away | 0 |

This fixes the overly generous v3 case where a two-off All-NBA guess could still score in the 70s.

## New dossier depth
- Shooting hand
- Rookie of the Year (replaces All-Rookie)
- Defensive Player of the Year
- SPG / BPG / TPG
- Career FG%
- Regular-season triple-doubles
- Retired NBA seasons played
- Current NBA salary earnings through the completed 2025-26 season when audited

## Accuracy behavior
Optional data is allowed to be absent. The engine calculates the maximum from the fields actually available on that player. This is preferable to inserting guessed values, especially for early-era defensive statistics and salary-history data still awaiting audit.

## Backend
No v4 SQL. The v3 backend already permits max scores through 3,000 and v4 stays inside that limit.
