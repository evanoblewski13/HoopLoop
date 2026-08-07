# HoopLoopSim Alpha 0.7 Update Guide

## Before updating

Export any career you especially care about as a backup. Alpha 0.7 is designed to migrate Alpha 0.6 careers automatically, but a portable JSON backup is still a good safety step before a simulation-model change.

## Install

1. Extract the Alpha 0.7 ZIP.
2. Open GitHub Desktop and select the HoopLoop repository.
3. Choose **Repository → Show in Explorer**.
4. Copy the contents of the extracted `hooploopsim-alpha-0.7-update` folder into the repository root.
5. Replace the matching HoopLoopSim files.
6. Do not delete `config.js`, Name Rush files, Start/Bench/Cut data, or the `supabase` folder.
7. Commit with: `Upgrade HoopLoopSim to Alpha 0.7`
8. Click **Push origin**.
9. Wait for GitHub Pages deployment to turn green.
10. Open `https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html`.
11. Hard-refresh with **Ctrl + Shift + R**.

No SQL migration is required.

## Existing-save migration

The first time an older save loads under Alpha 0.7:

- Its displayed OVR stays the same.
- Current underlying attributes are reduced/rebalanced into the new +5 display model.
- The migration is tagged in the save so it cannot apply twice.
- Historical season OVR entries are not rewritten.

Example: an Alpha 0.6 player displaying 80 OVR should still display 80 OVR after migration, but current attributes will average around 75 instead of around 80.

## Cache check

The live simulator title should say **Alpha 0.7**. If it does not, wait for deployment and hard-refresh again.
