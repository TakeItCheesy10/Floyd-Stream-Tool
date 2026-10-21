# Street Fighter 6 adaptation

The user requested reusing the SF6 broadcast work from their separate Versari Esports project and restyling it for Floyd Esports. The original project was read only; it was not modified.

## Reused design and assets

- Versari `public/stream/sf6/overlay.css` and `overlay.js`: compact centered scorebug, two school/team sides, central brand mark, separate team set scores and player battle scores.
- Versari `public/stream/sf6/model.mjs`: existing character-to-art mapping.
- Versari `public/app/assets/sf6/character-selection/color_character*.png`: existing fighter art, copied unchanged into `Stream Tool/Resources/StreetFighter6/Characters`.
- The user's supplied `Logo (2).png`: copied unchanged into `Resources/Branding/floyd-esports.png` and used in the controller, SF6 scoreboard, SF6 versus screen, and shared Smash logo slot. Original Library identity: libfile_035398b9f07c8191b2af7c00e8b5146e.

The new CSS/JS rebuilds the presentation for local match controls. It does not copy Versari's live feed, approval, authentication, database, or deployment dependencies. The center logo, typography colors and panel treatment are Floyd-specific. Health-bar styling is visual rather than a claim of real-time game telemetry.

The fighter list follows the supplied project's existing mapping; this update is not a live roster sync. Preserve original artwork provenance when distributing the application.

## Validation

Automated integration tests exercise actual SF6 selection, fighter validation, set/battle scoring limits, separate match state, and disabled caster routes. Browser checks cover publication, both live layouts, switching to Smash and returning to SF6 through the same permanent OBS source. The desktop app was restarted against the saved state. Actual OBS capture and packaged Windows distribution remain unverified.
