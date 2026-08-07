# HoopLoopSim Alpha 0.5 — Test Checklist

## Existing saves / rebrand
- [ ] Alpha 0.4 career appears in Save Files.
- [ ] Existing career loads normally.
- [ ] Main simulator displays `HoopLoopSim`.
- [ ] `/hoopsim.html` redirects to `/hooploopsim.html`.

## Domestic league regression
- [ ] Domestic sizes remain even-numbered 8–50.
- [ ] Domestic playoffs still allow 4 / 8 / 16 / 32 when league size permits.
- [ ] East and West standings still work.
- [ ] Draft, free agency and trade request still work.
- [ ] Trade request displays a confirmation before the 33% roll occurs.
- [ ] After a signing/trade, Roster automatically displays the user's new team.

## Player creator
- [ ] Existing Randomize Attributes button still works.
- [ ] New Randomize Player button changes identity/physical information/position/playstyle/number.
- [ ] Player attributes remain independently editable after randomizing.
- [ ] Season game input still clamps to 14–99.

## League Stats
- [ ] Clicking stat headings sorts the table.
- [ ] Entire League works.
- [ ] My Team works.
- [ ] My Conference works in domestic mode.
- [ ] Specific Team filter works.
- [ ] My Conference is not offered as a meaningful filter in international mode.

## Rebalanced statistics
Run several 30-team domestic seasons rather than judging one random season.
- [ ] Rebound leaders are primarily frontcourt/large players rather than Uber Athlete guards.
- [ ] 10+ RPG seasons are notable rather than routine across huge portions of the league.
- [ ] 10+ APG seasons are difficult, while elite playmakers on talented teams can still reach them.
- [ ] Steals/blocks are lower on average than Alpha 0.4.
- [ ] Rare defensive outlier seasons can still occur.
- [ ] Scoring generally resembles Alpha 0.4, with occasional rare extreme scoring seasons possible.

## Awards / mobile playoffs
- [ ] Trophy-case text wraps cleanly without overlapping.
- [ ] Desktop playoff rounds remain vertically centered.
- [ ] Mobile later rounds remain vertically centered rather than sticking to the top.
- [ ] Seeds persist through later rounds.

## International HoopLoop League
- [ ] Format selector includes International HoopLoop League.
- [ ] International sizes are even-numbered 16–36.
- [ ] Switching to International defaults to 24 teams when the current domestic size is invalid.
- [ ] User selects a country team from the chosen field.
- [ ] No East/West conferences are shown.
- [ ] There is one overall standings table.
- [ ] International career skips the draft and joins the chosen country roster.
- [ ] Regular season stats, injuries, awards, player profiles, box scores and career progression work normally.
- [ ] Postseason always selects 12 teams.
- [ ] Seeds 1–4 receive the opening-round bye.
- [ ] Seeds 5–12 play the opening four series.
- [ ] Quarterfinals do not begin until all four opening series are complete.
- [ ] The bracket proceeds to 8 → 4 → 2 → champion.
- [ ] International offseason does not show domestic free agency / Request Trade.
- [ ] Country rosters can refresh aging/weak generated players with younger selections.
- [ ] User remains with their chosen country team.

## Saves
- [ ] Save international career.
- [ ] Reload page.
- [ ] International mode, team, standings and player history remain intact.
- [ ] Export/import still works.
