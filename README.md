# HoopLoop Platform 13 — Cash Grab v5

Cash Grab v5 focuses on lineup control and live drafting.

## What changed
- Online snake drafts stay live on one screen through Supabase Realtime.
- Every online pick has a shared 60-second deadline.
- When the clock expires, the timed-out side receives an available legal $1 player automatically; if no $1 can legally complete both rosters, the cheapest legal fallback is used.
- After building or drafting five players, users assign PG / SG / SF / PF / C matchup slots.
- Users also rank 1st through 5th offensive options.
- Offensive options change shot-volume preference, not shooting ratings.
- Direct defensive matchups still influence efficiency and explosion-game probability.
- Box scores now show each player's offensive-option rank.

## Database
Run `supabase/cash-grab-v5.sql` once after your existing Cash Grab v3/v4 migrations.

No Name Rush, SBC, HoopLoopSim, account, friend, Daily, draft-history, or Hall of Five data is deleted.
