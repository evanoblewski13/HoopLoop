# HoopLoop Version 8 Test Checklist

## Deployment

- [ ] Latest GitHub Pages Action is green
- [ ] `verify.html` shows Version 8
- [ ] All seven verification checks are green
- [ ] Homepage opens without console errors
- [ ] Start, Bench, Cut opens from the homepage and top navigation

## Daily game

- [ ] Three player cards appear
- [ ] Each card shows a name and image or initials fallback
- [ ] Position, career years, games, PPG, RPG, APG, and All-Star badge display correctly
- [ ] Start, Bench, and Cut can each be assigned once
- [ ] Selecting an occupied role swaps the assignment cleanly
- [ ] Lock button stays disabled until all roles are filled
- [ ] Logged-in vote saves successfully
- [ ] Community percentages appear after submission
- [ ] Exact-lineup percentage appears
- [ ] Refresh preserves the first official lineup
- [ ] A second submission does not replace the original vote
- [ ] Guest vote saves locally but is labeled unofficial

## Archive

- [ ] Previous-day arrow works
- [ ] Future-day arrow is disabled
- [ ] Archive opens
- [ ] Archived dates show Daily number, mode, and position pool
- [ ] An archived vote saves separately from today's vote
- [ ] Returning to an already-played date restores the saved lineup

## Playground

- [ ] Modern generates a trio
- [ ] All-Stars generates a trio
- [ ] Random generates a trio
- [ ] Guards generates three guards
- [ ] Forwards generates three forwards
- [ ] Bigs generates three centers/bigs
- [ ] All Positions generates a trio
- [ ] Pool count updates when filters change
- [ ] Shuffle creates a new matchup
- [ ] Locking a lineup displays the decision summary
- [ ] Copy matchup places text on the clipboard
- [ ] Next matchup resets all roles

## Responsive design

- [ ] Desktop layout displays three cards side by side
- [ ] Phone layout stacks cards cleanly
- [ ] Role buttons remain easy to tap
- [ ] Long player names do not overlap other information
- [ ] Modal and archive can be closed on phone and desktop

## Existing HoopLoop systems

- [ ] Name Rush Daily still works
- [ ] Name Rush Practice still works
- [ ] Name Rush race still works
- [ ] Existing accounts still log in
- [ ] Friends and leaderboards still load
- [ ] `config.js` still contains the correct Supabase URL and publishable key
