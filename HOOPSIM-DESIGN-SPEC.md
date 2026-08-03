# HoopSim Alpha 0.1 Design Specification

## Core identity

**HoopSim — A customizable basketball career simulator.**

The game gives guidance without forcing a specific career. Users may create an underdog, an ordinary prospect, or an immediate superstar.

## League creator

- Even league sizes from 8 to 50
- 80 available fictional teams
- User selects every participating team
- Teams are sorted geographically, with the westernmost half placed in the West and easternmost half in the East
- 14 to 99 regular-season games per team
- Playoff fields of 4, 8, 16, or 32, when the selected field does not exceed league size
- Best-of-1, 3, 5, 7, or 9 series
- No playoff byes
- Injuries may be disabled

## Rosters and league balance

- 12 players per team after the draft
- Five starters
- Normally a 9–10-player rotation
- Up to two concurrent Injury Reserve players per roster
- Teams are rebalanced and regenerated for every new career
- Approximate generated-player league average: low/mid 70s
- Generated stars generally peak around 90–92
- Generated rookies cannot exceed 75 OVR
- Most first-round generated rookies fall in the high 60s or low 70s

## Player creator

Attributes range from 10 to 99:

1. Lay-ups
2. Dunks
3. Mid-range
4. Free throw
5. 3PT
6. Post moves
7. Passing
8. Dribbling
9. Rebounding
10. Interior defense
11. Perimeter defense
12. Vertical
13. Speed
14. IQ
15. Durability

Overall is the true arithmetic average of all 15 attributes, rounded to the nearest whole number.

- Minimum entry rating: 50 OVR
- No maximum overall cap beyond the 99 rating limit
- Draft projection may be hidden
- Height range: 5′5″ to 7′8″
- Weight range: 140 to 400 pounds
- Traditional PG, SG, SF, PF, and C positions

## Playstyle templates

Every template begins at exactly 60 OVR and is optional.

- Pure Playmaker
- Pure Scorer
- Lockdown Defender
- Offensive Engine
- Uber Athlete
- All Around Hooper
- 3&D

Playstyles influence generated statistical behavior and suggested ratings, but never block future development in other areas.

## Draft

- One-round draft with one pick per selected team
- A larger prospect pool creates a genuine undrafted possibility
- Selection score combines overall, positional need, roster depth, scouting variance, and a strong generational-prospect bonus
- Drafted players receive a guaranteed four-year rookie contract
- Undrafted users choose from five roster offers
- Undrafted contracts begin as one-year deals

## Simulation

Every regular-season schedule uses a rotating round-robin structure. Every team plays exactly once per game round, allowing the user to simulate:

- One game
- Five games
- To the halfway point
- The rest of the regular season

Tracked statistics:

- Games and starts
- Minutes
- Points
- Rebounds
- Assists
- Steals
- Blocks
- Turnovers
- Field goals made and attempted
- Three-pointers made and attempted
- Free throws made and attempted
- Fouls

Calculated averages and percentages include PPG, RPG, APG, SPG, BPG, FG%, 3P%, and FT%.

## Awards

- MVP
- Rookie of the Year
- Defensive Player of the Year
- Sixth Man of the Year
- Coach of the Year
- All-HoopLoop First, Second, and Third Teams
- All-Defensive First and Second Teams
- Finals MVP

## Progression

There is no potential rating. The offseason development roll considers:

- Statistical performance against expectations
- Age
- Playstyle emphasis
- Durability
- Major injuries
- Random variance

Alpha 0.1 shows the first offseason development result but stops before Season 2.
