# HoopLoop Version 7 Test Checklist

Use two separate browser sessions. Label them Player A and Player B.

## 1. Account system

- [ ] Player A creates an account with email, password, and username.
- [ ] Player A confirms the email if confirmation is enabled.
- [ ] Player A logs in and sees the username in the header.
- [ ] Player A logs out and logs back in.
- [ ] A password reset email can be requested.
- [ ] Player B creates a different account.
- [ ] A duplicate username is rejected.

## 2. Online daily leaderboard

- [ ] Player A completes today's Daily Name Rush.
- [ ] The score appears on the global leaderboard after completion.
- [ ] Refreshing the page keeps the score.
- [ ] Another official score for the same date is rejected.
- [ ] Player B completes the same puzzle and sees both scores.
- [ ] The lower time ranks first.
- [ ] An archive day opens a different deterministic puzzle and leaderboard.

## 3. Practice Mode

- [ ] Rookie with three rounds starts a randomized session.
- [ ] Starter, All-Star, and MVP use different pools.
- [ ] Five, ten, and twenty-five round sessions end at the correct length.
- [ ] Endless Mode continues beyond the original set of rounds.
- [ ] Hints unlock after 30 seconds when enabled.
- [ ] Hints remain hidden when disabled.
- [ ] Skip Round moves forward without ending a fixed session.
- [ ] Practice results appear in Practice Records.
- [ ] Logged-in practice results remain after changing devices or browsers.

## 4. Friends

- [ ] Player A searches Player B's username.
- [ ] Player A sends a friend request.
- [ ] Player B sees the incoming request.
- [ ] Player B accepts it.
- [ ] Both accounts show each other as friends.
- [ ] Friends leaderboard shows only the user and accepted friends.
- [ ] Removing the friendship removes friend-only access.

## 5. Friend race

- [ ] Player A challenges Player B.
- [ ] Player B sees the race invitation count.
- [ ] Player B accepts the invitation.
- [ ] Both screens show the same five-second countdown.
- [ ] Both screens show the same three initials.
- [ ] Correct names advance only the player who submitted them.
- [ ] Opponent progress pips update live.
- [ ] Give Up is not available.
- [ ] First hint becomes usable after 30 seconds in the current round.
- [ ] More letters become available after another 30 seconds.
- [ ] The first player to finish all three is recorded as the winner.
- [ ] Leaving an active race awards the win to the opponent.

## 6. Random matchmaking

- [ ] Player A selects Find Quick Match and enters a waiting room.
- [ ] Player B selects Find Quick Match.
- [ ] Both are placed into the same room.
- [ ] The countdown and race function like a friend race.

## 7. Mobile

- [ ] Daily, practice, account modal, friends, and race interfaces fit the screen.
- [ ] The keyboard does not hide the answer input or Submit button.
- [ ] Closing a race asks before forfeiting.
