# HoopLoop Platform 25 Corrected / Pack, Pull, Play v3.1.1

This corrected build replaces the withdrawn Platform 25 package.

## Critical repair

The first Platform 25 rebuild used a historical source that stopped at 2022-23, causing ongoing stints such as SGA / Oklahoma City and Nikola Jokic / Denver to end in 2023.

This corrected package rebuilds matching PPP cards from Basketball-Reference player-season and per-game data **through the completed 2025-26 regular season**.

Examples:
- Shai Gilgeous-Alexander — Oklahoma City Thunder — **2019–2026**
- Nikola Jokic — Denver Nuggets — **2015–2026**
- Stephen Curry — Golden State Warriors — **2009–2026**
- Recent trades split into new stint cards rather than extending the wrong team.

Total corrected stint cards: **1,542**.

## Install
1. Do not install the withdrawn Platform 25 ZIP.
2. Back up the working HoopLoop repository.
3. Extract this corrected ZIP.
4. Copy the contents of `hooploop-platform-25-corrected-update` into the repository root.
5. Replace matching files, preserving `config.js`.
6. Push and hard-refresh `/verify.html`.

## SQL
No new SQL is required. PPP still uses the existing `supabase/pack-pull-play-v1.sql` backend.
