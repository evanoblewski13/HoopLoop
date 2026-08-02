# Supabase folder

Run `setup.sql` once in a fresh HoopLoop Supabase project.

The file creates:

- public player profiles connected to Supabase Auth users
- daily scores and one-score-per-date uniqueness
- practice sessions
- friend requests and accepted friendships
- race matches and player progress
- Row Level Security policies
- authenticated RPC functions for scores, friend actions, matchmaking, race invitations, and winner assignment
- Realtime publication entries for live updates

Do not put the database password, secret key, or service role key in the website repository.
