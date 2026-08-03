# HoopSim Alpha 0.1 Test Checklist

## Deployment

- [ ] `hoopsim-verify.html` shows four green checks
- [ ] HoopLoop homepage displays the HoopSim Alpha card
- [ ] HoopSim opens on desktop and mobile

## League creator

- [ ] League sizes only show even numbers from 8–50
- [ ] Exactly the selected number of teams is required
- [ ] Team search works
- [ ] Auto-select fills the league
- [ ] East and West receive equal team counts
- [ ] Season games reject values below 14 and above 99
- [ ] Invalid playoff sizes are hidden
- [ ] Every series-length option works
- [ ] Injuries can be turned off

## Player creator

- [ ] Every playstyle template displays 60 OVR
- [ ] All 15 attributes accept values from 10–99
- [ ] Overall equals the rounded true average
- [ ] Draft projection changes as attributes change
- [ ] Draft projection can be hidden
- [ ] A player below 50 OVR cannot enter the draft
- [ ] A player above 80 OVR is allowed

## Draft and roster

- [ ] Draft board fills one pick at a time
- [ ] Team need can affect selection order
- [ ] A low-rated player can go undrafted
- [ ] Undrafted player receives five offers
- [ ] Chosen team finishes with 12 players
- [ ] High-rated rookie receives an appropriate role
- [ ] Generated rookie ratings never exceed 75

## Regular season

- [ ] Sim 1 advances one game round
- [ ] Sim 5 advances five rounds
- [ ] Sim to halfway stops at the midpoint
- [ ] Sim season completes every team schedule
- [ ] Standings update correctly
- [ ] User game logs display stats or injury DNPs
- [ ] League leaders populate
- [ ] Roster roles and minutes update after injuries
- [ ] No team has more than two concurrent injured players

## Awards and playoffs

- [ ] Five major awards are selected
- [ ] All-HoopLoop teams contain position-balanced groups
- [ ] Playoff bracket contains the selected number of teams
- [ ] Best-of series ends at the correct win total
- [ ] Sim game, round, and all playoffs work
- [ ] Champion and Finals MVP are displayed

## Saves

- [ ] Career autosaves after draft and simulation
- [ ] Manual save works
- [ ] Save remains after refreshing
- [ ] Export downloads a JSON file
- [ ] Imported career loads correctly
- [ ] Delete removes only the selected career
- [ ] A sixth career is blocked until a save is removed
