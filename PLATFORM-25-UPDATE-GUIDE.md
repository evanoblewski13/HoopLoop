# Platform 25 Corrected Update Guide

## What was fixed
The original Platform 25 card rebuild accidentally inherited a source cutoff at 2022-23. This corrected package rebuilds player/team stints with Basketball-Reference season and per-game data through 2025-26.

## Install
1. Back up the repository.
2. Extract the corrected ZIP.
3. Copy the contents into the HoopLoop repository root.
4. Replace matching files but preserve `config.js`.
5. Push to GitHub Pages.
6. Hard-refresh `verify.html`.

## SQL
No new SQL is required.
