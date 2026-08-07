# HoopLoopSim Alpha 0.5 — Design Notes

## Rebrand

Public-facing name: **HoopLoopSim**

Description: **A customizable basketball career simulator.**

The original `hoopsim.*` filenames and internal save-database names are partly retained for backward compatibility. `hooploopsim.html` is now the preferred public URL and `hoopsim.html` redirects to it.

## Statistical model pass

Alpha 0.4 over-rewarded vertical and the Uber Athlete playstyle in rebounding. Alpha 0.5 changes the model so rebounding relies much more on:

1. Rebounding attribute
2. Position
3. Absolute height
4. Weight
5. Extreme-size bonus
6. Vertical as a smaller secondary factor

Assists now require passing/dribbling/role plus teammate offensive quality. Very strong teammates make converted assists more likely; poor offensive rosters suppress them.

Steals and blocks have lower normal rates, while season-level variance preserves the chance of rare defensive outliers. A separate rare scoring variance allows unusual monster scoring seasons without making them routine.

The simulator does not force a predetermined number of 10-RPG / 10-APG players. Those counts are balancing references, not quotas.

## International HoopLoop League

The new mode is intentionally different from the fictional US franchise league:

- 16–36 teams, even-numbered
- Default 24 teams
- User chooses their country team
- One standings table
- No East / West conferences
- Fixed 12-team postseason
- Seeds 1–4 receive byes
- Seeds 5–12 play an opening round
- National-team rosters do not use normal domestic free agency
- Team strength and generated player pools differ every career
- Aging/declining generated selections can be replaced by younger rising players in the offseason

The player's created character remains attached to their chosen country team in this initial international implementation.

## International naming audit

No supplied name was identified as a direct slur. For cleaner public branding, Alpha 0.5 uses conservative substitutes for a handful of names with strong celebrity/IP or unwanted slang associations:

- Greece Freaks → Greece Aegeans
- South Korea Poppers → South Korea Pulse
- Australia Reefers → Australia Reefs
- New Zealand Hobbits → New Zealand Peaks
- Jamaica Bolt → Jamaica Sprint

`Madagascar` remains exactly as supplied even though it does not have a second mascot word.

These are data labels and can be changed later without modifying the simulation engine.
