# Clean Reset Guide — HoopLoop Version 4

This is the recommended way to start over without mixing old files with Version 4.

## Part A — Preserve the old project safely

1. Open your current HoopLoop repository on GitHub.
2. Open **Settings → General**.
3. Under **Repository name**, rename `hooploop` to `hooploop-old`.
4. This keeps the old work as a backup instead of permanently deleting it.

## Part B — Create a completely new local repository

1. Extract `hooploop-version-4.zip` into a normal folder.
2. Open GitHub Desktop.
3. Choose **File → New repository**.
4. Set the name to `hooploop`.
5. Choose a local path such as `Documents\GitHub`.
6. Click **Create repository**.
7. Open the new local `hooploop` repository folder.
8. Copy only these Version 4 items into its root:

```text
index.html
styles.css
script.js
players-data.js
verify.html
README.md
RESET-GUIDE.md
DATABASE-AUDIT.md
```

The files must sit directly in the repository root. Do not put them inside another `hooploop-v4` folder.

## Part C — Publish the clean repository

1. In GitHub Desktop, confirm all Version 4 files appear under **Changes**.
2. Commit with: `Fresh HoopLoop Version 4`.
3. Click **Publish repository**.
4. Leave **Keep this code private** unchecked if using GitHub Pages on the free plan.
5. On GitHub, open **Settings → Pages**.
6. Select **Deploy from a branch**.
7. Select branch **main** and folder **/ (root)**.
8. Save.

## Part D — Verify the correct version is live

Open:

```text
https://YOUR-USERNAME.github.io/hooploop/verify.html
```

Every check should be green. Then open the normal site.

## Part E — Clear old browser data

Version 4 uses new storage keys, so old Version 2/3 scores will not interfere. To fully clear the site anyway:

### Chrome or Edge

1. Open the live HoopLoop site.
2. Press `F12`.
3. Open **Application**.
4. Open **Storage**.
5. Click **Clear site data**.
6. Close DevTools and press `Ctrl + Shift + R`.

You can also log into the local Version 4 prototype, open your profile, and select **Reset all local Version 4 data**.

## Emergency check

If the live site still looks old, directly open:

```text
https://YOUR-USERNAME.github.io/hooploop/players-data.js?v=4.0.0
```

The beginning should mention `HoopLoop Version 4`, and `verify.html` should report at least 5,108 players.
