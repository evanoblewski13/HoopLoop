# Stats Race v1 — Data Source Notes

The founding profile pool uses completed NBA regular-season career information so answers remain stable.

Primary reference used during the v1 data pass:
- Basketball-Reference player profile pages for listed height/weight, birthplace, college, draft information, games, and career per-game statistics.

Additional cross-checks were made against NBA.com / Hall of Fame or widely established career records where useful.

The data is intentionally isolated in `stats-race-data.js`. If a profile answer needs correction, the profile data can be updated without touching the scoring engine.
