# Stats Race v1 — Founding Profile Pool

The first build intentionally uses retired players with completed NBA careers so career totals do not change while the scoring system is being tested.

## Founding 16

1. Magic Johnson
2. Michael Jordan
3. Larry Bird
4. Kobe Bryant
5. Tim Duncan
6. Shaquille O'Neal
7. Kareem Abdul-Jabbar
8. Hakeem Olajuwon
9. Dirk Nowitzki
10. Dwyane Wade
11. Allen Iverson
12. Kevin Garnett
13. Steve Nash
14. Charles Barkley
15. John Stockton
16. Scottie Pippen

## The 17 scoring fields

### Bio — 6 fields
- Height
- Weight
- Primary position
- College / route to NBA
- Hometown / birthplace
- Jersey number

### Draft & résumé — 6 fields
- Draft year
- Draft pick
- NBA championships
- Regular-season MVPs
- Finals MVPs
- All-Star selections

### Career statistics — 5 fields
- Games played
- Career points
- PPG
- RPG
- APG

Every field is worth up to 100 points, for a maximum score of 1,700.

## Data philosophy

- Text fields accept useful aliases such as `MSU` for Michigan State.
- Players who skipped college accept answers such as `No college`, `High school`, or the relevant route.
- A few players with multiple iconic NBA jersey numbers accept more than one number for full credit.
- `Hometown / birthplace` currently uses birthplace/city as the canonical answer. A city-only response can receive full credit.
- Career statistics are regular-season NBA career figures.

The player pool is kept in `stats-race-data.js`, separate from the scoring engine, so adding hundreds of profiles later does not require rewriting the game.
