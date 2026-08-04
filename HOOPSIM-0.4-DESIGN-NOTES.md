# HoopSim Alpha 0.4 Design Notes

## Playoff rotations

Playoff rotations tighten to roughly nine players when healthy. Starters receive approximately 36–40 minutes, with deeper bench minutes reduced. Total allocated team minutes remain 240.

## Box scores

Every newly simulated game stores player-level minutes, shooting, rebounds, assists, steals, blocks, turnovers, fouls, and points. All playoff games are accessible from the bracket. Games involving the user's team are also accessible from Recent Games and the postseason log.

## Rebounding and size

Rebounding now considers:

- Rebounding rating
- Position
- Height relative to the position
- Vertical
- Minutes
- Uber Athlete playstyle
- A nonlinear bonus for exceptionally tall elite rebounders

The nonlinear bonus is intentionally limited to rare combinations, such as a 7′8″ center with 90+ rebounding, so ordinary centers do not all produce extreme totals.

## Assists and teammate quality

Passing, dribbling, IQ, position, playstyle, and minutes still create the baseline. Teammate offensive skill now changes the result: elite playmakers generate more assists when surrounded by good finishers and shooters, while weak supporting casts suppress assist production.

## Free-agency interest

The user receives up to:

| Overall | Offers |
|---:|---:|
| 69 or lower | 3 |
| 70–74 | 4 |
| 75–79 | 5 |
| 80–84 | 6 |
| 85–89 | 7 |
| 90–94 | 8 |
| 95+ | 10 |

The current team may be included as a re-signing option. Undrafted rookies still receive exactly three initial roster offers.

## Trade request

The offseason trade request is available once per season while the user is under contract. It has a 33% denial chance. An approved request creates a simple one-for-one trade with a random other team, preserving roster sizes and the user's existing contract.

## Jersey retirement

At retirement, a team retires the user's jersey when at least one condition is met:

- The user won Finals MVP for that team.
- The user earned at least five recorded accolades while representing that team.
- The user played at least fifteen seasons for that team.

## League News

League News separates trades, signings, and retirements. Alpha 0.4 reports user trades, user free-agent decisions, generated veteran signings, and generated/player retirements. A broader CPU trade engine remains a later feature.
