# Stats Race v3 data source policy

Snapshot: current career statistics and honors through the 2025-26 NBA season; roster/team metadata reviewed during the August 2026 offseason.

Primary references used for the v3 audit:
- NBA.com player pages: country, last attended, current bios, awards and honors.
- Basketball-Reference player pages: career averages and regular-season personal/career highs.
- Existing HoopLoop v2 profile history: historical teams, jersey numbers, draft and retired career totals.

Rules:
1. Never infer a missing career statistic from age, role, or reputation.
2. Zero is a real answer for award fields and should remain playable.
3. Country and college/route are separate answers.
4. City/nickname/abbreviation aliases may normalize wording but never change the underlying team history.
5. During offseason roster movement, distinguish career team history from a player's current team.
