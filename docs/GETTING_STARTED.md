# Floyd Stream Tool — first development version

This is a standalone application, separate from Versari. Smash Ultimate is the first supported game. The game selector is backed by a profile registry; other games will be enabled as their controls and layouts are completed.

## Run the controller

Install Node.js LTS. Open a terminal in `Interface Source Code` and run:

```sh
npm ci --omit=dev
npm run serve
```

Open http://127.0.0.1:1111. To launch the Electron desktop window instead, install full dependencies with `npm ci` and use `npm start`. The browser controller needs only the runtime dependencies above.

Names, characters, colors, scores, event and caster controls edit a draft. Press UPDATE (or Enter) to publish. The header shows whether changes are saved or unpublished. F1/F2 increase the respective player's score. Swap and Clear change the draft; publish when ready.

The Game dropdown selects the live layout immediately. Publish pending edits before switching. Each game keeps its own saved match. Only Smash is enabled in this version.

## OBS setup

Add a Browser source, turn **Local file off**, and use:

| Screen | Permanent URL |
| --- | --- |
| Scoreboard | http://127.0.0.1:1111/overlay/scoreboard |
| Versus | http://127.0.0.1:1111/overlay/versus |
| Casters | http://127.0.0.1:1111/overlay/casters |

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

Integration tests cover publishing, score normalization, invalid updates, stale-game rejection, layout routes, per-game isolation, restart persistence and local-only access. A second profile exists only inside tests.

Actual OBS capture and a packaged Windows build still require verification. Preserve the original credits and asset provenance documented in README.md and INITIAL_ANALYSIS.md.
