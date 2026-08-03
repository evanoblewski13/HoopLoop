# HoopSim Alpha 0.1

HoopSim is HoopLoop's customizable, offline basketball career simulator.

This alpha is a complete one-season vertical slice. It is intended to test the league creator, player creator, draft logic, simulation balance, awards, playoffs, injuries, progression, and save system before multi-season careers are enabled.

## Included files

- `hoopsim.html` — HoopSim game page
- `hoopsim.css` — HoopSim visual design
- `hoopsim.js` — career, draft, game, award, playoff, injury, and save logic
- `hoopsim-teams.js` — the 80 fictional teams supplied for HoopSim
- `index.html` — HoopLoop Version 8 homepage with a HoopSim Alpha game card added
- `hoopsim-verify.html` — deployment check
- `HOOPSIM-ALPHA-GUIDE.md` — installation and use
- `HOOPSIM-DESIGN-SPEC.md` — locked rules and formulas
- `HOOPSIM-TEST-CHECKLIST.md` — structured testing plan

## Important

HoopSim does not need Supabase. It is local-first and stores saves in IndexedDB in the player's browser. Existing HoopLoop accounts, scores, friends, Name Rush data, Start/Bench/Cut data, and Supabase tables are not changed.

## Alpha limitations

- One full season plus an offseason development preview
- No trades yet
- No multi-season free agency yet
- No public career pages yet
- No custom draft-class editor yet
- Simulation values will need balancing based on real playtesting
