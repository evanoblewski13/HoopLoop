# Stats Race v1 — Design Notes

## Core idea
Stats Race should feel like an NBA scouting desk, not a normal trivia quiz. The game gives the player name first, then asks the user to complete a dossier before the clock expires.

## Standard rules
- 90-second report
- 17 fields
- 100 maximum points per field
- 1,700 maximum score
- no negative points
- blanks are allowed
- numeric answers earn less as they get farther from the correct answer
- Daily and head-to-head ties use completion time only as a tiebreaker; there is no speed bonus

## Approximate numeric scoring
The falloff is deliberately category-specific.

- Height: -25 points per inch away
- Weight: -5 points per pound away
- Jersey number: -20 points per number away, unless it is another accepted iconic number
- Draft year: -25 points per year away
- Draft pick: -10 points per pick away
- Championships / MVPs / Finals MVPs: -30 points per award away
- All-Star selections: -12 points per selection away
- Games played: gradual decline to zero at roughly 250 games away
- Career points: gradual decline to zero at roughly 5,000 points away
- PPG / RPG / APG: -20 points per 1.0 away

All scores floor at 0. Nothing can subtract from the total.

## Modes
### Daily Scout
Same profile for everyone, resetting at midnight Central Time. Logged-in users receive one official attempt. Highest score wins; filing time breaks ties.

### Practice Scout
Unlimited random profiles. Best local practice score is saved on the device.

### Race
- CPU Scout: immediate solo opponent
- Friend Race: invite an accepted HoopLoop friend
- Random Race: match with another logged-in user
- both online players get the same profile and a synchronized five-second countdown followed by 90 seconds

## First-pool philosophy
The founding pool is deliberately small and retirement-only. The next content pass can expand into current players using a clearly labeled statistical snapshot (for example, "through the 2025-26 regular season") so active-player answers remain deterministic.
