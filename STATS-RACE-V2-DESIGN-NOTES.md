# Stats Race v2 design notes

## Core change
Stats Race now has separate Retired and Current pools. Retired reports contain 18 fields (1,800 max). Current reports contain 17 fields (1,700 max) and use a career-high-points field instead of unfinished career totals.

## Multi-answer scoring
Jersey numbers and NBA teams are list fields. Full set = 100. A clean partial set gets strong partial credit: one of two correct answers = 90. Extra incorrect guesses reduce that field modestly, but no field can go below 0 and there are never negative total points.

## Data snapshot
Current profiles are a 2025-26 regular-season career snapshot. This intentionally avoids changing answers during the 2026 offseason before a player has appeared for a new club.
