# HoopLoopSim Alpha 0.6 — Update Guide

## Before updating

Export any HoopLoopSim career you care about as a JSON backup. Alpha 0.6 keeps the same IndexedDB/local-storage save identifiers, so existing domestic saves should remain available, but a backup is still recommended.

## Install

1. Extract the Alpha 0.6 ZIP.
2. Open GitHub Desktop and select your HoopLoop repository.
3. Choose **Repository → Show in Explorer**.
4. Copy the Alpha 0.6 files directly into the repository root.
5. Replace the matching HoopLoopSim files when prompted.
6. Do **not** delete or replace unrelated HoopLoop files such as `config.js`, `players-data.js`, `sbc-player-data.js`, or the `supabase` folder.
7. In GitHub Desktop, commit with: `Repair HoopLoopSim and add offseason international tournament`.
8. Click **Push origin**.
9. Wait for the GitHub Pages deployment to turn green.
10. Open `https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html`.
11. Hard-refresh with `Ctrl + Shift + R`.
12. Open `https://YOUR-USERNAME.github.io/hooploop/hooploopsim.html`.

## Important change from Alpha 0.5

There is no longer a standalone International League option in the League Creator. Every career begins with the normal fictional US-city HoopLoopSim league and draft.

International basketball appears later as an optional offseason event. The first tournament is scheduled after Season 3, 4, or 5, selected randomly for each career. After that it returns every three seasons.

## International tournament format

- 48 countries
- choose your nation the first time you participate; that nation remains your national team
- 15 group-stage games for every country
- every group opponent is different
- one combined standings table
- top 12 qualify
- seeds 1–4 receive byes
- seeds 5–12 play the Round of 12
- quarterfinals and semifinals are single elimination
- championship game awards Gold and Silver
- the two highest-seeded quarterfinal losers play the Bronze Medal Game, matching the requested consolation rule
- medals are stored in the user's trophy case

The international event does not replace, reset, or alter the user's domestic team contract.
