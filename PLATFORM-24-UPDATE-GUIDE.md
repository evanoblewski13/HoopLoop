# HoopLoop Platform 24 / Pack, Pull, Play v3 — Update Guide

## Summary

Pack, Pull, Play v3 is a cleanup/clarity update built on top of PPP v2.

### Headline changes
- Curated pre-1990 pool
- Team-era / modern-era card presentation
- Playstyle labels on all cards
- Cleaner season report wording
- No new Supabase migration

## Install
1. Back up the working repository.
2. Extract the ZIP.
3. Copy the contents of `hooploop-platform-24-update` into the repository root.
4. Replace matching files, but **do not overwrite `config.js`**.
5. Commit and push.
6. Wait for GitHub Pages to deploy.
7. Open `/verify.html` and hard-refresh.

## SQL
No new migration is required. Continue using:
`supabase/pack-pull-play-v1.sql`
