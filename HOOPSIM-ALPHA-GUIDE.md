# Installing HoopSim Alpha 0.1

## What this update changes

This update adds HoopSim as a separate offline game and adds a HoopSim card to the HoopLoop homepage.

It does **not** change:

- `config.js`
- `players-data.js`
- `sbc-player-data.js`
- Supabase
- Name Rush scores
- Start, Bench, Cut votes
- Accounts, friends, or races

## Install through GitHub Desktop

1. Extract the HoopSim ZIP.
2. Open GitHub Desktop.
3. Select your HoopLoop repository.
4. Choose **Repository → Show in Explorer**.
5. Copy these files from the extracted package directly into the repository root:

```text
index.html
hoopsim.html
hoopsim.css
hoopsim.js
hoopsim-teams.js
hoopsim-verify.html
README.md
HOOPSIM-ALPHA-GUIDE.md
HOOPSIM-DESIGN-SPEC.md
HOOPSIM-TEST-CHECKLIST.md
```

6. Replace `index.html` when Windows asks. The supplied homepage is the Version 8 homepage with one additional HoopSim Alpha card.
7. Do not delete your existing files.
8. In GitHub Desktop, use the commit message:

```text
Add HoopSim Alpha career simulator
```

9. Click **Commit to main**.
10. Click **Push origin**.
11. Wait for the GitHub Pages deployment to receive a green checkmark.
12. Open:

```text
https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html
```

13. After all checks pass, open:

```text
https://YOUR-USERNAME.github.io/hooploop/hoopsim.html
```

14. Press `Ctrl + Shift + R` once after deployment.

## Offline saves

HoopSim saves live in IndexedDB on the device and browser where the career was created.

Use **Career Menu → Export backup** to download a JSON backup. That backup can be imported on another device through **Save files → Import save**.

Clearing browser site data can erase saves that were not exported.

## Alpha save limit

The first build allows up to five careers per browser. Export or delete an old career before creating a sixth.
