# HoopLoop Platform 26 — Design System

## North star
Clean. Fast. Basketball games. No marketing wall between the user and play.

## Brand
- Keep the original tiled HOOPLOOP logo.
- No real-player photography in the platform shell.
- No decorative hoops, basketballs, arena scenes, or court art in page backgrounds.
- Backgrounds use calm neutral gradients.

## Structure
- Homepage: logo first, then six game cards.
- Game pages: game name is the largest text.
- One short instruction line under the title.
- Rules/help moves behind a button instead of occupying the page.
- Friends remains part of the account experience, not the main navigation.

## Navigation
Games · Leaderboard · Account

## Themes
- Light and dark display modes.
- Existing user accent color remains the interactive accent.
- Display mode is stored locally and follows system preference on first visit.

## Shared UI
`hooploop-ui.css` and `hooploop-ui.js` provide the cross-game shell so future games inherit the same header, colors, typography, spacing, surfaces, and theme toggle.
