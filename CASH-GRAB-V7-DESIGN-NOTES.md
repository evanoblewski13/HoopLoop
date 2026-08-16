# Cash Grab v7 design notes

## Game

- Build five players under the $15 virtual roster cap.
- All five play 40 minutes.
- Set one-to-one defensive assignments manually. Position does not restrict assignments.
- Rank offensive options #1 through #5.
- Simulate the game over four visible quarters instead of receiving an instant final score.
- One real second advances 2.5 simulated minutes; a normal game presentation lasts about 16 seconds.

## Removed

Cash Grab no longer uses or displays Fit, Talent, Versatility, Team Grade, archetypes, hidden shooting ratings, hidden defensive ratings, or the old weighted team-power formula.

## Result model

A player's expected PTS/REB/AST begins with a real NBA baseline. When the assigned defender has a qualifying real shared-game H2H sample, that sample is blended into the expectation. Larger H2H samples receive more weight, capped at 60%. Offensive option order makes a modest volume adjustment. Game-to-game variance is then sampled around those real statistical expectations.

The final team score is the sum of the five simulated player point totals. Quarter totals always reconcile exactly to the final score.

## Matchups

Defensive assignments are independent of listed position. A PG can guard an opposing SG, SF, PF, or C. Each defender and each offensive player may be assigned exactly once.
