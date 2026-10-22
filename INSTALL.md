# Floyd Stream Tool for Windows

Download the Setup executable from GitHub Releases and run it. Open Floyd Stream Tool from its desktop shortcut or Start menu entry. Quit the temporary preview app before launching the installed version: both use the same OBS port.

Closing the app window keeps it running in the system tray. Use the tray's Quit command to stop the broadcast server.

## Updates

Click **Check for updates** in the app or tray menu. Download the update, then choose **Restart and update** after the broadcast. Updates do not install silently when you quit.

Installed match data lives in your Windows user-data folder, separate from the program files, so later releases keep your saves. Development can continue on GitHub; only published desktop releases are offered to installed users. The initial preview's unpublished edits are not installed as default data.

## OBS

Use Browser sources at 1920 by 1080:

- Scoreboard: http://127.0.0.1:1111/overlay/scoreboard
- Smash VS: http://127.0.0.1:1111/overlay/versus?game=smash-ultimate
- Street Fighter VS: http://127.0.0.1:1111/overlay/versus?game=street-fighter-6

## Publishing a later version

In Interface Source Code, run npm ci and npm test, then increase the version with npm version patch --no-git-tag-version. Commit the source and lockfile, create a matching v<version> tag, and push that tag. The Windows desktop release workflow builds and publishes the Setup executable, blockmap, and latest.yml together. GitHub Actions must be enabled for this repository. No GitHub token is embedded in the app.

For a local build, run npm run dist on Windows and publish those same three generated files together in a stable GitHub Release.

## Stream Deck shortcuts

Open Stream Deck / custom score shortcuts in the controller. Fill suggested keys or enter combinations, then Save shortcuts. Leave an action blank to disable it. In Elgato Stream Deck use System > Hotkey and assign the same combination. Each press immediately publishes only that score change for the current live game; unfinished names and character edits remain drafts. Keys work while the app is in the tray. Keep the desktop app running. Shortcut settings survive app updates.

