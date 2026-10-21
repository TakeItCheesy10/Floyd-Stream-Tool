# Floyd Stream Tool — first development version

This is a standalone application, separate from Versari. Super Smash Bros. Ultimate and Street Fighter 6 have separate controls, layouts, and saved match data. The caster screen and caster controls have been removed.

## Run the controller

Install Node.js LTS. Open a terminal in `Interface Source Code` and run:

```sh
npm ci --omit=dev
npm run serve
```

Open http://127.0.0.1:1111. To launch the Electron desktop window instead, install full dependencies with `npm ci` and use `npm start`. The browser controller needs only the runtime dependencies above.

Names, characters, scores and event details edit a draft. Click **Publish live** (or press Enter) to publish. The header shows whether changes are published. Swap sides and Reset match change the draft; publish when ready. Discard edits reloads the currently published match.

The Game dropdown selects the live layout immediately. Publish or discard pending edits before switching. Each game keeps its own saved match.

### Street Fighter 6

The scoreboard adapts the user's existing Versari SF6 design: team set wins above, current player battle wins below, and Floyd's logo in the center. Blue/red health-bar-shaped panels, silver borders, and white type match the supplied Floyd logo. The bars are decorative; the app does not read the game or track actual HP.

The default team match is best of five sets, with best-of-three battles for the current players. Set wins, battle wins, current set, current battle, school/team names, gamertags and fighters are manually editable. F1/F2 increase battle wins. Character art appears in the controller and the versus screen. The game-specific score limits are validated on both controller and server.

### Smash Ultimate

Existing scoreboard and versus layouts remain available. The updated controller includes characters, skin selection, colors, pronouns, bracket side, intro, event and round controls. F1/F2 increase player scores. The Floyd logo replaces the previous general overlay logo; caster content stays hidden.

## OBS setup

Add a Browser source, turn **Local file off**, and use:

| Screen | Permanent URL |
| --- | --- |
| Scoreboard | http://127.0.0.1:1111/overlay/scoreboard |
| Versus | http://127.0.0.1:1111/overlay/versus |

Set width **1920**, height **1080**. Keep the app/server running while streaming. Use the controller's preview buttons to inspect these same live sources. The checkerboard belongs to the preview panel; the actual overlay is transparent.

Game selection changes the content of these sources. It does not change OBS scenes. The original local HTML files remain upstream references; use the URLs above for the new saved-state system. Plain text outputs are available as HTTP URLs under `/Resources/Texts/Simple%20Texts/` rather than updated disk files.

## Saved data and local access

Saved matches live in `Stream Tool/.floyd-state/state.json` and are excluded from Git. On first run, the original ScoreboardInfo.json is imported; subsequent runs use saved state. Back up the state folder to keep matches. A damaged saved file raises an error instead of silently resetting it.

The server listens only on this computer. Phone/LAN remote control is not enabled. No Versari services, login or Internet account is needed to run the controller after installation.

For development, `FLOYD_DATA_DIR` selects an alternate state folder, `FLOYD_RESOURCE_DIR` selects the assets folder, and `PORT` overrides 1111. Keep the default port for the URLs above.

## Development checks

```sh
npm test
```

Integration tests cover both real game profiles, SF6 fighters and score limits, caster removal, publishing, score normalization, invalid updates, stale-game rejection, layout routes, per-game isolation, restart persistence and local-only access. An additional test-only profile exercises generic switching.

Actual OBS capture and a packaged Windows build still require verification. Preserve the original credits and asset provenance documented in README.md and INITIAL_ANALYSIS.md.
