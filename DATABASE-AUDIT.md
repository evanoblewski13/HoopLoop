# HoopLoop Version 4 — Player Database Audit

## Coverage

- Base NBA-listed records: **5,103**
- Verified 2025–26 late-debut supplements: **5**
- Total player records: **5,108**
- Official former playing-name aliases: **14**
- Initial combinations with at least 3 accepted names: **369**
- Initial combinations with at least 5 accepted names: **299**

## Late 2025–26 players added

- Jahmai Mashack — NBA player ID 1642942
- Tyler Burton — NBA player ID 1631174
- Lucas Williamson — NBA player ID 1631351
- Toby Okani — NBA player ID 1643253
- Bez Mbeng — NBA player ID 1643016

These players debuted after the base static list's November 13, 2025 update and were checked against NBA.com player pages and 2025–26 statistics.

## Spelling and validation rules

- The displayed names come from the NBA-listed source records.
- Leading and trailing whitespace was checked.
- The game ignores capitalization, punctuation, spacing, and keyboard accent marks.
- The letters and full official name still must match.
- Common misspellings are not accepted. For example, `Dwayne Wade` does not match `Dwyane Wade`.
- Nicknames are not accepted unless the nickname is the NBA-listed playing name.
- Curated former names are accepted only when they were official playing/legal names associated with the NBA career.

## Automated audit results

- Structural issues found: **0**
- Normalized duplicate-name groups: **38**

Duplicate-name groups are retained because two different players can legitimately share the same name, and Name Rush only needs the typed name to be valid.

## Honest limitation

No public historical player list is guaranteed to be perfect forever. This is the most complete version assembled for this prototype from the NBA API static player index, verified NBA.com supplements, and a conservative former-name list. Future debuts should be added as supplemental records or through a backend update process.
