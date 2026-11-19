# Pixel Adventure 4.1.0 for Windows x64

This package is the private Windows release candidate for Legends of Shadows. It includes the Hybrid UI, the 60-stage campaign, twelve worlds, all five heroes, Ninja Village and the RPG and challenge systems. The package runs as a native game window with the Electron runtime and all game assets bundled.

## Install and play

1. Close Pixel Adventure if it is running.
2. Run `Pixel-Adventure-4.1.0-Setup-x64.exe`. The installer is unsigned and Windows SmartScreen may display a warning. Verify the accompanying SHA-256 checksum before running it.
3. Choose the current-user install, confirm the destination, and finish. Keep the wizard’s launch option selected to start the game immediately. You can also open **Pixel Adventure** from Start.
4. Choose **Enter Adventure**, then **Continue Adventure** to use a saved campaign. **New Adventure** explains which active totals it resets before asking for confirmation.

Setup creates Start Menu and Desktop shortcuts by default. To skip the Desktop shortcut, run the same installer with `--no-desktop-shortcut`. Settings has an **Enter Fullscreen** toggle.

The game saves progress in its per-user application data. Setup retains those saves when upgrading or reinstalling. The Windows uninstaller retains saves by default.

## Build and verify from this branch

Run `npm ci`, `npm test`, and `npm run package:win` on Windows. The installer output is `release/windows/v4.1.0/Pixel-Adventure-4.1.0-Setup-x64.exe`. Maintainers can pass the installed executable and, optionally, a legacy executable to `node test/desktop-smoke.cjs`. This test uses temporary save data and verifies fullscreen, offline launch, audio, all 60 stage loads and saved hero preferences.

The desktop app serves the production assets from its own `pixel://game/` origin. Electron grants user-initiated fullscreen to the packaged entry page’s top-level frame. Automatic fullscreen and the other permissions remain denied. The renderer uses context isolation and sandboxing, with Node integration disabled. Remote network requests and window opens are blocked.
