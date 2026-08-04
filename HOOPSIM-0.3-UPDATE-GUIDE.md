# HoopSim Alpha 0.3 update guide

## Before updating

Export any career you care about from the Career menu. Alpha 0.3 uses the same offline save database and migrates Alpha 0.2 saves when they are loaded, but an exported JSON file is a useful portable backup.

## Files to copy

Copy these files into the root of your existing HoopLoop repository and replace matching files:

- `hoopsim.html`
- `hoopsim.css`
- `hoopsim.js`
- `hoopsim-teams.js`
- `hoopsim-verify.html`
- `version.json`
- `README.md`
- `HOOPSIM-0.3-UPDATE-GUIDE.md`
- `HOOPSIM-0.3-TEST-CHECKLIST.md`
- `HOOPSIM-0.3-DESIGN-NOTES.md`

Do not delete or replace HoopLoop's `config.js`, Supabase folder, Name Rush files, or Start Bench Cut database.

## Publish

1. Open GitHub Desktop.
2. Select the HoopLoop repository.
3. Choose **Repository → Show in Explorer**.
4. Paste the Alpha 0.3 files into that root folder.
5. Commit with `Upgrade HoopSim to Alpha 0.3`.
6. Click **Push origin**.
7. Wait for the GitHub Pages deployment to turn green.
8. Open `https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html`.
9. Hard-refresh HoopSim with `Ctrl + Shift + R`.

The HoopSim header should display **Alpha 0.3**.
