# HoopLoop Platform 16 / Stats Race v2 update

1. Back up/commit the current HoopLoop repo.
2. In Supabase SQL Editor, run `supabase/stats-race-v2.sql`. Run v1 first only if Stats Race v1 was never installed.
3. Copy the update folder contents into the HoopLoop repository root and replace matching files. Do not delete `config.js`.
4. Commit: `Expand Stats Race current retired pools and multi answers`.
5. Push origin and wait for GitHub Pages.
6. Hard-refresh `stats-race.html` and `verify.html`.

### Expected
- Retired pool: 40 profiles.
- Current pool: 16 profiles, snapshot through 2025-26.
- Jordan jersey field: `23, 45` = 100; `23` = 90.
- Retired max score = 1,800; Current max score = 1,700.
- One Daily attempt per pool per date.
