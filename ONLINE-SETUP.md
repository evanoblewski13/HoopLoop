# HoopLoop Version 7 Online Setup

This is the one external setup step that cannot be completed inside the website files because the Supabase project belongs to your account.

## Part 1 — Create the Supabase project

1. Sign in to Supabase and create a new project.
2. Give it a recognizable name such as `HoopLoop`.
3. Save the database password somewhere secure. It does not go into the website code.
4. Wait until the project dashboard opens.

## Part 2 — Create the HoopLoop database

1. In Supabase, open **SQL Editor**.
2. Choose **New query**.
3. Open `supabase/setup.sql` from this package.
4. Copy the entire file and paste it into the SQL Editor.
5. Click **Run**.
6. The last query should list these six tables:
   - `daily_scores`
   - `friendships`
   - `practice_sessions`
   - `profiles`
   - `race_matches`
   - `race_progress`

The SQL also enables Row Level Security, creates account/profile automation, creates secure database functions, and adds the race/score tables to Supabase Realtime.

## Part 3 — Configure authentication URLs

In the Supabase dashboard, open **Authentication → URL Configuration**.

Set **Site URL** to your real GitHub Pages address. Example:

```text
https://YOUR-GITHUB-USERNAME.github.io/hooploop/
```

Add the same address under **Redirect URLs**. You may also add a localhost address while testing with a local web server, such as:

```text
http://localhost:8000/
```

Email confirmation can remain enabled. New users will need to click the confirmation email before logging in.

## Part 4 — Copy the browser connection values

Open your Supabase project's **Connect** dialog or **Settings → API Keys**.

Copy:

1. Project URL
2. Publishable key — or the legacy `anon` key if that is what your project displays

Open `config.js` and replace only these placeholders:

```js
SUPABASE_URL: 'PASTE_YOUR_SUPABASE_PROJECT_URL',
SUPABASE_ANON_KEY: 'PASTE_YOUR_SUPABASE_ANON_KEY',
```

Example format:

```js
SUPABASE_URL: 'https://abcdefghijk.supabase.co',
SUPABASE_ANON_KEY: 'sb_publishable_example',
```

Never place a secret key or `service_role` key in `config.js`. The browser key is designed for client applications and is restricted by the Row Level Security policies from `setup.sql`.

## Part 5 — Replace the GitHub repository files

Make a backup of the current Version 4 repository first.

Then place the Version 7 files directly in the repository root:

```text
hooploop/
├── index.html
├── styles.css
├── script.js
├── players-data.js
├── config.js
├── verify.html
├── version.json
├── README.md
├── ONLINE-SETUP.md
├── TEST-CHECKLIST.md
├── DATABASE-AUDIT.md
└── supabase/
    └── setup.sql
```

Do not create another `hooploop-v7-online` folder inside the repository.

In GitHub Desktop:

1. Commit message: `Add HoopLoop online accounts practice friends and races`
2. Click **Commit to main**.
3. Click **Push origin**.
4. Confirm the GitHub Pages deployment has a green checkmark.
5. Hard refresh the live page with `Ctrl + Shift + R`.

## Part 6 — Verify the deployment

Open:

```text
https://YOUR-GITHUB-USERNAME.github.io/hooploop/verify.html
```

Expected checks:

- Player database: green
- Supabase configuration: green
- Authentication service: green
- Public tables and RLS reads: green
- Realtime channel: green

If a check is red, its message identifies the missing step.

## Part 7 — Test with two accounts

Follow `TEST-CHECKLIST.md`. Use two different browsers, an Incognito window, or two devices so both users can be signed in simultaneously.

## Updating later

For ordinary design or JavaScript changes, replace the changed files and push a new commit. Do not rerun `setup.sql` unless a future release specifically changes the database schema.
