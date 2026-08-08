# Cash Grab v1 — Design Notes

## Core rules

- Virtual roster budget: $15
- Draft exactly five players
- The board is 5 columns ($1–$5) × 5 players per column
- Modes: Current, All-Time, Mixed
- No forced positional restrictions
- Poor lineup construction is handled by the fit model rather than blocking the user's choices

## Matchup model

The first tuning model intentionally makes team construction more important than just buying the five most expensive names.

Approximate team power weights:

- Fit: 60%
- Talent: 31%
- Versatility: 9%

Fit examines:

- guard / forward / big balance
- shooting and number of non-shooters
- primary and secondary playmaking
- perimeter defense
- rim protection
- rebounding
- off-ball value
- high-usage redundancy

After both teams are rated, a smaller matchup adjustment compares shooting/finishing against perimeter/rim defense. Normal basketball variance is then added so the favored team is not guaranteed to win.

## Quick Match

- CPU opponent comes from the same Current / All-Time / Mixed mode.
- CPU must have five unique players.
- CPU budget cannot exceed $15.
- Generator strongly prefers spending the full $15.
- Wins and losses are saved locally in the browser.

## Gauntlet

One loss ends the run.

1. 5 × $1
2. 3 × $1 + 2 × $2
3. 5 × $2
4. 3 × $2 + 2 × $3
5. 1 × $2 + 4 × $3
6. 5 × $3
7. 3 × $3 + 2 × $4
8. 5 × $4
9. 3 × $4 + 2 × $5
10. 5 × $5

Best cleared round is stored locally.

## Future additions intentionally postponed

- online PvP rosters
- daily Cash Grab board
- shared lineup percentages
- friend challenges
- historical win/loss profile stats
- player headshots
- deeper position-specific matchup logic

Those should wait until the user approves the price tiers and first fit-engine playtests.
