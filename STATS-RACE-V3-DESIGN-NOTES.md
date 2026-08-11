# Stats Race v3 design notes

## Scoring philosophy
Every report field is worth 100. Exact text aliases and exact numeric answers earn 100; close numeric guesses fade down; multi-answer fields reward completeness without going negative.

## Country vs. route
Country is deliberately separate from college/route. International players should not force a user to type a compound answer such as `No college (Serbia)`. A correct country stands on its own for 100.

## Team-history rule
`NBA teams played for` means a player actually appeared in an NBA game for that franchise. A completed offseason trade/signing does not enter the answer set until the player appears for the new team.

## Team aliases
The engine combines stored aliases with generic team-name parsing. For a team like `Cleveland Cavaliers`, accepted forms include the full name, city, nickname, and stored short forms such as `Cavs` and `CLE`.

## Practice timing
Timed Practice preserves the original 90-second pressure. Untimed Practice removes expiration entirely so a player can chase a perfect scouting report. Untimed mode is Practice-only and never changes Daily or head-to-head timing.

## Profile expansion
Accuracy wins over a misleading player count. v3 adds the schema and validator needed for larger content drops, but only fully audited profiles should enter official pools. This makes it safe to add role players and young players even when their award totals are zero.
