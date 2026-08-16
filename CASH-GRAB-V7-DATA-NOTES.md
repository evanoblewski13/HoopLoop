# Cash Grab v7 data notes

## Selection data

`cash-grab-data.js` now stores only board/game identity information: player ID, display name, price, listed position, broad position group, and Current/All-Time era. The old synthetic skill ratings are gone.

## Real player baselines

`cash-grab-real-data.js` contains 422 real player production baselines. Current players use a verified NBA production snapshot available in the bundled source work. All-Time players use an actual high-production NBA season rather than a made-up peak rating. The All-Time season selection requires at least 30 games and selects the season maximizing PPG + RPG + APG.

## H2H layer

The build contains 33,124 regular-season shared-game H2H samples generated from real NBA box scores covering 2010-11 through 2023-24, with a small audited overlay for notable pairings. Each sample stores games, PPG, RPG, and APG for the offensive player in games where both players appeared for opposing teams.

**Important:** shared-game H2H is not claimed to be possession-level defender tracking. The manual guard assignment tells the simulator which opponent's empirical H2H sample to consult. If no qualifying sample exists, the engine stays on the real player baseline rather than inventing a defender rating.

Modern NBA Advanced Stats does provide possession-level matchup tracking, but equivalent coverage is not consistent across every historical era represented by All-Time Cash Grab. V7 therefore labels its bundled H2H data honestly instead of presenting cross-era estimates as tracked defense.

## Sources used in the build process

- NBA-Data-2010-2024: regular-season player box scores, MIT licensed.
- TheNBACSV: historical season-level player production through 2017.
- HoopLoop's previously audited player-card/current data for name matching and coverage.
- Selected current-season public stat checks for recent players not covered by older historical snapshots.
