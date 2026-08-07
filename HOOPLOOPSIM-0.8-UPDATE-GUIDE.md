# HoopLoopSim Alpha 0.8 Update Guide

## Before updating
Export any HoopLoopSim career you especially care about as a JSON backup. Alpha 0.8 is designed to load Alpha 0.7 saves, but a portable backup is still recommended before replacing game files.

## Install
1. Extract the Alpha 0.8 ZIP.
2. Open GitHub Desktop and select your HoopLoop repository.
3. Choose **Repository → Show in Explorer**.
4. Copy the contents of the extracted `hooploopsim-alpha-0.8-update` folder directly into the repository root.
5. Replace the matching HoopLoopSim files.
6. Do not delete unrelated HoopLoop files such as `config.js`, Name Rush files, Start Bench Cut files, or the `supabase` folder.
7. In GitHub Desktop, commit with `Upgrade HoopLoopSim to Alpha 0.8`.
8. Click **Push origin**.
9. Wait for the GitHub Pages deployment to show a green check.
10. Open `https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html`.
11. Hard-refresh with **Ctrl + Shift + R**.
12. Open `https://YOUR-USERNAME.github.io/hooploop/hooploopsim.html`.

## No backend change
This update is still local-first and requires no new Supabase table or SQL migration.

## Save compatibility
Alpha 0.7 saves should continue to load. League History begins preserving detailed league-wide winners when seasons are completed under Alpha 0.8. Older saves may not have enough stored information to reconstruct every past Finals MVP or award winner from seasons completed before this feature existed.
