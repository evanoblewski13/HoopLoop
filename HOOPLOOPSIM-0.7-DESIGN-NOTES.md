# HoopLoopSim Alpha 0.7 Design Notes

## Displayed OVR vs performance ratings

Alpha 0.7 separates the familiar OVR scale from the raw average driving simulation outcomes:

`Displayed OVR = round(raw attribute average + 5)`

The displayed value is capped at 99.

This lets HoopLoopSim keep roughly the same visible league hierarchy while reducing the strength of the underlying ratings. Draft projection, minutes, free-agent interest, and visible player quality continue to use displayed OVR. Basketball outcomes continue to use the 15 individual attributes.

No additional scoring nerf was layered on top in this release. The goal is to observe the effect of the rating-model change first rather than changing two major variables simultaneously.

## International event identity

The tournament is intentionally visually distinct from the domestic league. It uses navy, white, and restrained gold accents while retaining HoopLoopSim's clean card-and-bracket language.

Full box-score generation is limited to user group-stage games and all knockout games. This adds immersion while avoiding thousands of unnecessary stored player lines from every group-stage game across all 48 nations.

## Medal logic

The two semifinal winners advance to the Gold Medal Game. The two semifinal losers play the Bronze Medal Game. The championship loser receives Silver and the Bronze-game winner receives Bronze.
