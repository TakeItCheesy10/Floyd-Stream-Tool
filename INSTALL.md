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

In Interface Source Code, run npm ci and npm test, increase the version with npm version patch --no-git-tag-version, then run npm run dist on Windows. Publish the generated Setup executable, blockmap, and latest.yml together in a stable GitHub Release tagged v<version>. No GitHub token is embedded in the app.
