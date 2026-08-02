# HoopLoop Version 8 Update Guide

This update is designed to install on top of your working Version 7.1 repository. It does not require a new Supabase project.

## Part 1 — Back up the working repository

Before changing anything:

1. Open the HoopLoop repository folder in File Explorer.
2. Copy the entire folder.
3. Rename the copy `hooploop-v7.1-backup`.

Do not change the backup.

## Part 2 — Run the Version 8 SQL migration

1. Open the same Supabase project used by Name Rush.
2. Select **SQL Editor**.
3. Select **New query**.
4. Open the downloaded file:

```text
supabase/sbc-v8.sql
```

5. Press `Ctrl + A`, then `Ctrl + C` inside that file.
6. Paste the entire contents into the Supabase query editor.
7. Press **Run**.

A successful run ends with one result row:

```text
sbc_daily_votes
```

The migration creates only the Start, Bench, Cut voting system. It does not erase or replace Name Rush data.

## Part 3 — Copy the website update

In GitHub Desktop, select:

```text
Repository → Show in Explorer
```

Copy the Version 8 files directly into that repository folder. Replace matching files when Windows asks.

The repository root should then contain at least:

```text
index.html
styles.css
script.js
players-data.js
config.js
start-bench-cut.html
sbc.css
sbc.js
sbc-player-data.js
verify.html
version.json
supabase/
```

### Preserve these two working files

Do not delete or replace:

```text
config.js
players-data.js
```

The Version 8 update ZIP intentionally does not contain either file.

Do not create an extra nested folder such as:

```text
hooploop/hooploop-v8/start-bench-cut.html
```

`start-bench-cut.html` must sit directly beside `index.html`.

## Part 4 — Commit and publish

In GitHub Desktop:

1. Review the changed files.
2. Confirm that `config.js` is not listed as deleted or replaced.
3. Use this summary:

```text
Add Start Bench Cut Version 8
```

4. Select **Commit to main**.
5. Select **Push origin**.
6. Open the GitHub repository in a browser.
7. Wait for the newest Pages deployment under **Actions** to show a green checkmark.

## Part 5 — Verify the deployment

Open:

```text
https://YOUR-USERNAME.github.io/hooploop/verify.html
```

Version 8 should show seven green checks:

1. Name Rush player database
2. Start, Bench, Cut player pools
3. Supabase configuration
4. Authentication service
5. HoopLoop core tables
6. Start, Bench, Cut voting RPC
7. Realtime channel

Then open:

```text
https://YOUR-USERNAME.github.io/hooploop/start-bench-cut.html
```

Use `Ctrl + Shift + R` once if the browser shows an older build.

## Part 6 — Test the Daily game

1. Log in with your existing HoopLoop account.
2. Assign one player to Start, one to Bench, and one to Cut.
3. Lock in the lineup.
4. Confirm that community percentages appear.
5. Refresh the page.
6. Confirm that the original lineup remains locked.
7. Open the archive and choose an older date.
8. Confirm that the archived Daily uses its own saved result.

## Part 7 — Test the Playground

Test all three modes:

```text
Modern
All-Stars
Random
```

Test all four position filters:

```text
All Positions
Guards
Forwards
Bigs
```

Generate several matchups, assign all three roles, lock the lineup, copy the matchup, and generate the next trio.

## Troubleshooting

### Start, Bench, Cut page shows offline voting
Run `supabase/sbc-v8.sql` and confirm the final `sbc_daily_votes` row appears.

### Verification says the player pool is missing
Confirm `sbc-player-data.js` is in the repository root and is visible on GitHub.

### Headshot does not appear
This is not a game failure. The card automatically switches to the player's initials when a hosted image is unavailable.

### Old homepage still appears
Wait for GitHub Pages deployment, then press `Ctrl + Shift + R` or open the site in a private window.
