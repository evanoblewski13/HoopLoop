# HoopLoop Version 7.1 update guide

This is a safe front-end polish update. It does **not** change the Supabase database and you do not need to rerun `setup.sql`.

## Preserve your working Supabase connection

Do not replace your current `config.js`. It contains the Project URL and publishable key that already passed all five checks.

## Replace these files only

Copy these files from the Version 7.1 update into the root of your GitHub repository and choose Replace:

- `index.html`
- `styles.css`
- `script.js`
- `verify.html`
- `version.json`
- `README.md`
- `TEST-CHECKLIST.md`

Leave these current files untouched:

- `config.js`
- `players-data.js`
- the `supabase` folder

## Publish

1. Open GitHub Desktop.
2. Review the changed files. `config.js` should not be listed.
3. Commit with: `Polish Name Rush hints and answer reviews`
4. Click **Push origin**.
5. Wait for the GitHub Pages deployment to show a green check.
6. Open the live site and press `Ctrl + Shift + R`.

## Test

- Daily and Practice: hint button should unlock at 20 seconds.
- Race: a new hint level should become available every 20 seconds.
- Daily, saved Daily, Practice, and Race results should show expandable accepted-answer lists for every round.
- Your submitted answer should be orange in the review when it was completed in the current browser session.

## Rollback

If needed, GitHub Desktop can revert the Version 7.1 commit, returning the site to Version 7 without changing accounts or scores.
