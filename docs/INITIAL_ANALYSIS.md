# Floyd Stream Tool: Initial Analysis

## Scope and baseline
Standalone multi-game scoreboard and OBS controller, separate from Versari. Start with Smash Ultimate, then add other games. Madden is outside the initial expansion scope. Forked from pokerobybeto/Ultimate-Stream-Tool at 899769805ca8a2d26fe1f447d2df1624e02549bc. Original program and assets are unchanged. Static source review only: the executable and OBS integration have not been tested.

## Architecture
- Interface Source Code/package.json: Electron 40, Electron Forge, Express 5 and portable Windows packaging.
- src/index.js: starts the server and opens a fixed 890 x 340 controller window.
- src/gui.js: names, tags, pronouns, numeric scores, characters, skins, colors, best-of, round, event and caster controls; updates /api/scoreboard.
- src/server.js: port 1111; serves controller/resources; reads JSON and writes ScoreboardInfo.json plus individual OBS text outputs.
- Stream Tool/Game Scoreboard.html, VS Screen.html and Caster Screen.html: separate OBS overlays.
- Resources/Scripts: JavaScript and GSAP animation. Scoreboard refreshes match data every 500ms.
- Resources/Texts: shared state, character metadata and simple text exports. Other resources include images, fonts and transitions.

## Findings before expansion
1. No game selector, profile registry or overlay router exists. State and controls assume Smash.
2. GUI writes p1NScore/p2NScore, while overlay also reads p1Score/p2Score for ticks. Normalize score fields.
3. Best-of and intro behavior assume Bo3/Bo5 and Smash finals conventions.
4. Server uses synchronous multi-file writes without schema validation or atomic state publication.
5. JSON route resolves user-supplied paths without containment checks.
6. Server does not explicitly bind localhost; CORS is unrestricted and writes are unauthenticated. Restrict local access before expansion.
7. Electron enables Node integration and disables context isolation. Use a narrow preload/IPC interface.
8. Verify source and portable-build resource paths separately.
9. Fixed window needs adjustment for team/roster/map controls.
10. Package declares MIT, but no standalone LICENSE exists. Preserve upstream credits; bundled artwork/fonts have separate provenance.

## Game selector design (proposed, not implemented)
Add a Game dropdown above shared controls, initially enabling only Smash Ultimate. Each game profile defines scoring, controls, defaults, assets and layouts.

Use one stable OBS browser-source URL such as /overlay/scoreboard. Selecting a game changes its displayed layout without editing the OBS source path. Equivalent routes can serve versus and caster layouts. This changes source content, not OBS scenes.

Keep separate saved match state for each game. Switching back restores that game without carrying over scores or characters. Publish active game and match state together; distinguish editing from live output.

Share event, round, names, team logos/colors, casters and series wins. Namespace game-specific fields (Smash characters, Splatoon map/mode, etc.). Preserve legacy Smash exports during migration.

## Implementation order
1. Run and verify original Smash source: update, persistence, swap/reset, characters/skins and all overlays.
2. Fix baseline server/state issues and verify packaged paths.
3. Add game registry, dropdown, per-game persistence and permanent overlay router with Smash first.
4. Customize Smash for Floyd match workflow and visuals.
5. Add other games individually.
6. Package and verify a separate Windows app in OBS.

## Selector acceptance checks
Correct live layout through one OBS source; selection survives restart; state remains separate per game; score/swap/reset work; invalid game IDs/missing assets produce clear errors; development and portable paths both work.
