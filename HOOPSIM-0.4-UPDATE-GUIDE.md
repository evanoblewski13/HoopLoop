# HoopSim Alpha 0.4 Update Guide

## Before installing

1. Open any important HoopSim career.
2. Use **Career menu → Export backup** if you want an extra portable JSON copy.
3. Make a normal backup copy of your local GitHub repository folder.

Alpha 0.4 uses the same IndexedDB save location as Alpha 0.3. Existing saves are migrated when loaded. The update does not change Supabase, Name Rush, Start Bench Cut, accounts, friends, or online scores.

## Install

1. Extract `hooploop-hoopsim-alpha-0.4.zip`.
2. Open GitHub Desktop.
3. Select the HoopLoop repository.
4. Choose **Repository → Show in Explorer**.
5. Copy all extracted files directly into the repository root.
6. Replace the matching HoopSim files.

Do not delete unrelated HoopLoop files such as:

```text
config.js
players-data.js
sbc-player-data.js
supabase/
```

## Publish

Use this commit message:

```text
Upgrade HoopSim to Alpha 0.4
```

Then click **Commit to main** and **Push origin**. Wait for the GitHub Pages Action to turn green.

## Verify

Open:

```text
https://YOUR-USERNAME.github.io/hooploop/hoopsim-verify.html
```

Then hard-refresh with `Ctrl + Shift + R`. The page should identify Alpha 0.4 and show green checks.

## Existing save migration

Alpha 0.4 automatically supplies reasonable defaults for older saves:

- User jersey number defaults to `1` if absent.
- Existing awards receive inferred team IDs for jersey-retirement checks.
- Existing playoff seeds are reconstructed when first-round data is available.
- Existing game results receive box-score IDs when the save is loaded.
- League News categories are inferred from older signing and retirement events.

Older recent-game entries may not have a direct **Box score** button if they were created before Alpha 0.4, but saved playoff game chips can still become inspectable after migration.
