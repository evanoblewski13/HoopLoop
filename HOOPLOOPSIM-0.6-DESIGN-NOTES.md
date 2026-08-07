# HoopLoopSim Alpha 0.6 — Design Notes

## Why standalone International Mode was removed

Alpha 0.5 added a second career architecture that duplicated too much of the domestic league flow and introduced a creator/draft regression. Alpha 0.6 returns to one stable career model. International basketball is an event inside that career rather than a separate universe.

## Tournament cadence

Each new career receives a hidden first-event year of 3, 4, or 5. After an event is completed or skipped, the next event is scheduled exactly three seasons later.

## Group schedule

The 48-team field uses the first 15 rounds of a shuffled round-robin rotation. This guarantees every country plays exactly 15 games against 15 different opponents while keeping schedules varied between tournaments.

## Knockout format

The top 12 records qualify. Seeds 1–4 receive byes. Seeds 5–12 play the Round of 12. The requested bronze setup is implemented by taking the two highest-seeded quarterfinal losers and placing them in the Bronze Medal Game. The Gold Medal Game determines Gold and Silver.

## Career integration

International games use the user's current ratings to influence both national-team strength and the user's event stat lines. International results do not count toward domestic regular-season or playoff career averages. Medals are permanent accolades and contribute modestly to Hall of Fame probability.
