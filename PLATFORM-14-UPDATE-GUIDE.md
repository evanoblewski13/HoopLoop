# HoopLoop Platform 14 / Cash Grab v6 Update Guide

## What this patch changes
- Cash Grab matchup weighting: **50% Fit / 25% Talent / 25% Versatility**.
- Natural-position duplication is only a small fit penalty. Skill fit matters much more.
- Assists, steals, blocks, turnovers and rebounds receive wider player-level variance.
- Rebounds are distributed more toward strong frontcourt rebounders while still allowing guard rebounds.
- Online snake-draft clock is made large and visible, including whose clock is running.
- Paul George receives a small performance nudge in both Current and All-Time Cash Grab data.
- Nikola Jokic receives a small performance reduction in both Current and All-Time Cash Grab data.

## Database
**No new Supabase SQL is required for Platform 14.** Cash Grab v6 continues to use the v5 online-draft database functions.

## Install
1. Back up or commit your current HoopLoop repository.
2. Extract `hooploop-platform-14-cash-grab-v6.zip`.
3. Copy the contents of `hooploop-cash-grab-v6-update` into your repository root.
4. Replace matching Cash Grab files. Do not delete `config.js` or the other HoopLoop games.
5. Commit, for example: `Balance Cash Grab stats and improve draft clock`.
6. Push origin and wait for GitHub Pages to deploy.
7. Open `/verify.html` and hard-refresh with **Ctrl + Shift + R**.
8. Open `cash-grab.html` and test several Bot/Gauntlet games plus one two-account Draft Battle.
