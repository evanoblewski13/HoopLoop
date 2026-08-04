# HoopSim Alpha 0.2 update guide

## What to copy

Copy these files into the root of your existing HoopLoop repository:

- `hoopsim.html`
- `hoopsim.css`
- `hoopsim.js`
- `hoopsim-teams.js`
- `hoopsim-verify.html`
- `version.json`
- `README.md`
- `HOOPSIM-0.2-TEST-CHECKLIST.md`
- `HOOPSIM-0.2-DESIGN-NOTES.md`

This update does not require SQL and does not use Supabase. Do not delete `config.js`, `players-data.js`, SBC files, or the `supabase` folder.

## Publish

1. Back up your current repository folder.
2. Extract the ZIP.
3. In GitHub Desktop, choose **Repository → Show in Explorer**.
4. Copy the extracted files directly into that repository folder.
5. Replace matching HoopSim Alpha 0.1 files.
6. Commit with: `Upgrade HoopSim to multi-season Alpha 0.2`
7. Click **Push origin**.
8. Wait for GitHub Pages deployment to turn green.
9. Open `https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html`.
10. Hard-refresh with `Ctrl + Shift + R`.

## Existing saves

Alpha 0.2 keeps the same IndexedDB save location and migrates Alpha 0.1 careers when loaded. Make an exported backup first if an existing career matters to you.

An exported JSON file is simply a portable backup of one career. It can be imported later or moved to another browser/device manually.
