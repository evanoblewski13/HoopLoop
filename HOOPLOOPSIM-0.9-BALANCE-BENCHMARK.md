# HoopLoopSim Alpha 0.9 — Internal Balance Benchmark

These are synthetic development checks used before packaging. They are not hard-coded league targets; real careers will vary by roster construction, injuries, minutes, playstyles and random season variance.

- 1,000 generated 90 OVR players averaged about **79.7** across their 15 underlying attributes, as intended by the +10 display model.
- In that generated 90 OVR sample, no player began with a 99 attribute. Higher displayed tiers can still very rarely create one.
- Representative team-score simulation centered around roughly **118 points**, with a median around **118**, a 95th percentile around **140**, and sub-100 team scores appearing in a single-digit percentage of results.
- A first-year-starter development sample still produced large +5 OVR jumps in a minority of careers, while a small number regressed.
- A requested +4 natural attribute gain is increasingly suppressed at elite ratings: approximately +1.7 around 92, +0.8 around 96, and +0.3 around 98 before randomness.

The simulator does not force a particular number of 100-point, 140-point, or breakout seasons. These checks are only guardrails against the inflation seen in earlier alpha builds.
