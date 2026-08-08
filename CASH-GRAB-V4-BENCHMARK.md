# Cash Grab v4 Simulation Benchmark

These are development checks, not hard-coded quotas.

A 5,000-game Current-player CPU sample produced:
- Average absolute team FGA gap: ~3.94 attempts
- 90th percentile FGA gap: 8
- 99th percentile FGA gap: 13
- Median leading scorer: 32 points
- 90th percentile leading scorer: 41 points
- 99th percentile leading scorer: 50 points
- Games with a 50+ scorer: 58 / 5,000 (~1.16%)
- Games with a 60+ scorer: 7 / 5,000 (~0.14%)
- Median team score: 90 in the 40-minute format
- 10th–90th percentile team score range: 76–104
- Opponent/player duplicate overlaps in sample: 0

Direct-matchup check using the same star and the same 1,500 random seeds:
- Against an elite same-slot defender: ~25.7 PPG
- Against a weak same-slot defender: ~31.6 PPG
- 50-point games against elite defender: 3 / 1,500
- 50-point games against weak defender: 17 / 1,500

The purpose is not to force those exact outputs. The checks confirm that matchup defense has a meaningful effect and explosive games remain possible.
