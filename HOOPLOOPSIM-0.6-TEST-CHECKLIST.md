# HoopLoopSim Alpha 0.6 — Test Checklist

## Deployment
- [ ] `hoopsim-verify.html` shows all green checks.
- [ ] `hooploopsim.html` opens normally.
- [ ] Visiting `hoopsim.html` redirects to `hooploopsim.html`.

## Fresh creator and draft — critical repair
- [ ] Create a normal league.
- [ ] Continue to Player Creator.
- [ ] Click Generate league and enter draft.
- [ ] Draft screen loads instead of freezing.
- [ ] Manual Draft works.
- [ ] Simulate Every Pick works.
- [ ] Undrafted path still gives exactly three offers.
- [ ] Continue to career dashboard works.

## Existing saves
- [ ] Existing domestic Alpha 0.4/0.5 saves load.
- [ ] Regular season, playoffs, offseason, free agency, trade requests, and saves still work.

## International Basketball Tournament
The first event is randomized to Season 3, 4, or 5, so test with a career until the event appears.

- [ ] Offseason shows an International Basketball Tournament panel when scheduled.
- [ ] Skip Tournament works and schedules the next event three seasons later.
- [ ] Enter Tournament opens the country selector the first time.
- [ ] Country list contains 48 teams.
- [ ] Madagascar is absent.
- [ ] New Zealand is absent.
- [ ] Once a nation is selected, it stays selected for later events.
- [ ] Sim 1 Round advances all countries by one group game.
- [ ] Sim 5 Rounds works.
- [ ] Sim Group Stage ends with every country at 15 games.
- [ ] Top 12 qualify for the knockout stage.
- [ ] Top four have Round-of-12 byes.
- [ ] Knockout stage reaches quarterfinals, semifinals, Gold Medal Game, and Bronze Medal Game.
- [ ] Gold/Silver/Bronze result is displayed.
- [ ] If the user's nation medals, the medal appears in the career trophy case.
- [ ] Finish Tournament returns to the normal offseason.
- [ ] The next international event is scheduled three seasons later.

## Regression checks
- [ ] League Stats filters still work.
- [ ] Randomize Player still works.
- [ ] Trade Request confirmation still appears.
- [ ] Mobile season input stays between 14 and 99.
- [ ] Playoff bracket and box scores still work.
