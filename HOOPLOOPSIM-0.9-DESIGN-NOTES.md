# HoopLoopSim Alpha 0.9 — Balance Notes

## Rating model
Displayed overall is now `round(true 15-attribute average + 10)`, capped at 99. A displayed 90 OVR therefore represents roughly an 80-point underlying attribute average. Generated leagues keep the familiar visible OVR distribution while the underlying ratings are less inflated.

Existing +5-model saves migrate once. Their visible OVR is preserved while the underlying ratings are lowered by the five-point difference between the old and new display boosts.

## Elite attributes
User-created players may still freely set any attribute to 99. Natural generation and offseason progression are different: generated players use softer elite ceilings, and positive development receives increasingly heavy diminishing returns at 80+, 85+, 90+, 95+, and 98+. A natural 99 remains possible but should be exceptional; stacking several natural 99s should be extraordinarily uncommon.

## Development variance
The normal age curve remains the baseline, but each offseason now has a season-level development swing in addition to attribute-specific variance. Young players can stagnate or regress, prime players can unexpectedly jump or dip, and veterans have rare renaissance seasons. First-year starters still receive extra breakout opportunity.

## Game scoring / pace
The scoring formulas were not broadly nerfed a second time. Instead, Alpha 0.9 combines the weaker underlying attribute model with a game-level pace factor. Most games run slightly slower than Alpha 0.8, a small number become true grind-it-out games, and a small number become track meets. The intended center of gravity is roughly 115–140 points per team, with occasional sub-100 scores and rare high-end shootouts.
