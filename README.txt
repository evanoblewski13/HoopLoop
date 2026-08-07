HoopLoopSim Alpha 0.6 - Verification Page Patch

This patch fixes a false red X on the Tournament schedule verification check.
The simulator tournament code itself does not need to be replaced.

Install:
1. Copy hoopsim-verify.html into the root of your HoopLoop GitHub repository.
2. Replace the existing hoopsim-verify.html.
3. Commit and Push origin in GitHub Desktop.
4. Wait for GitHub Pages deployment.
5. Hard refresh the verification page (Ctrl+Shift+R).

The corrected verifier accepts the actual object syntax used by Alpha 0.6 and checks:
- 15 group-stage games
- next tournament after 3 seasons
- top-12 knockout initialization
- Gold and Bronze medal games
