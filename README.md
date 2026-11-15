# Pixel Adventure

A free pixel-art platformer for browsers and Windows. The 2.0 expansion has 30 stages across seven worlds, with keyboard and touch controls. Players can start without an account.

[Play online](https://pixel-adventure-phi.vercel.app/) · [Download for Windows x64](https://github.com/soulaiman125/pixel-adventure/releases/download/v1.0.0/Pixel-Adventure-Setup-1.0.0-x64.exe) · [Release notes](https://github.com/soulaiman125/pixel-adventure/releases/tag/v1.0.0)

The public game and Windows download are version 1.0.0 with 20 stages. Run this branch locally to play the expansion.

![Verdant Hills gameplay with the player, floating ledges, and coins](docs/verdant-hills.png)

| Stages | World | New challenges |
| --- | --- | --- |
| 1–4 | Green Valley | Slimes, ledges, and ground spikes |
| 5–8 | Dangerous Canyon | Sandstone gaps, moving platforms, and falling rocks |
| 9–12 | Frozen Kingdom | Low-friction ice, ice slimes, icicles, and vanishing ledges |
| 13–16 | Fire Kingdom | Lava, fireballs, flame vents, and crumbling ledges |
| 17–20 | Dark Castle | Sweeping spikes, flying enemies, shooters, and the Hollow Crown |
| 21–25 | Poison Jungle | Poison pools and clouds, armored guards, and the Poison Queen |
| 26–30 | Thunder Fortress | Moving lasers, rising lava, electric floors, crushers, and the Thunder Titan |

## Run the browser game locally

Use Node.js 20.19+ on the 20.x line, or Node.js 22.12 or later, with npm. From the project folder in PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). The browser version can also be served from the generated `dist/` folder on a static web server after running `npm.cmd run build`.

## Play on Windows

Download the setup executable from [GitHub Releases](https://github.com/soulaiman125/pixel-adventure/releases/tag/v1.0.0), run it on Windows x64, then open **Pixel Adventure** from the desktop or Start menu. The installer includes the runtime, game, and assets. It plays offline after installation and saves progress separately from the browser version.

To rebuild the installer on Windows, run `npm.cmd run package:win`. It writes the NSIS installer to `release/`. The installer is unsigned, so Windows SmartScreen may display a warning when it is opened. Distribute the setup executable as a single file. Building does not publish it.

To run the desktop edition from source, run `npm.cmd run build` followed by `npm.cmd run desktop`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or Left / Right | Hold an arrow |
| Jump | W, Up, or Space | Press Jump |
| Attack | X or J | Tap Attack |
| Drop through a ledge | S or Down | Walk off the edge |
| Pause | Esc or Pause | Tap Pause |
| Retry checkpoint | R | Pause → Retry Checkpoint |

Hold Jump for height. Stomp enemies or attack at close range while facing them. A frontal hit on an armored guard exposes it for a follow-up. Blinking ledges, outlined targets, and striped ground warn of incoming hazards. Green flags restore you to the last checkpoint with collected coins intact. A checkpoint retry counts as a death. Dodge boss attacks and strike when the health panel says **Attack now!** The finish flag opens when the boss is defeated.

## Progress

Finish a level to unlock the next. Each coin earns 100 points. A finish earns one star, at least half the coins earns two, and collecting every coin earns three. Level Select keeps the best coin count, star rating, and completion time for each stage. Clear a stage without dying to earn a **No deaths** badge. Active runs reset on restart, while saved records and access are retained.

Verdant Hills remains Level 1, Sunset Canyon is Level 5, and Crystal Peaks is Level 11. Earlier browser saves preserve access and records for those same stages. An existing Hollow Crown clear unlocks Level 21. A fresh adventure resets current campaign totals and preserves best records and unlocks. Final victory requires completing all 30 stages and defeating the Thunder Titan.

Settings stores separate music and effects volumes, mute, reduced motion, and extra danger outlines. Music starts after a player interaction. Reduced motion limits particles and camera shake. An operating system preference for reduced motion also applies. Extra danger outlines emphasize active hazards and show the travel area of moving lasers.

### Mobile controls

Hold an arrow with one thumb and tap Jump or Attack with the other. Slide directly between the arrows to change direction. Sliding off both arrows releases movement. Hold Jump for more height. Landscape gives you a wider view, and portrait remains playable.

Open **Settings** from the main menu or pause screen to change button size, opacity, or handedness. Haptics and fullscreen appear when the browser supports them. Preferences are saved per browser or app.

## Verification

```powershell
npm.cmd test
npm.cmd run test:browser
npm.cmd run test:touch
npm.cmd run build
npm.cmd run test:desktop
```

Run the browser suites with the development server running and Microsoft Edge installed. The campaign smoke test verifies scene loads and completion triggers with controlled player placement, plus real input for selected movement, combat, and touch checks. The touch suite uses browser emulation for simultaneous input, cancellation, pause and restart, focus changes, and phone layouts. The Node suite checks jump routes, save migration, unlocks, hazard collisions, enemy and boss behavior, and the audio mixer. The desktop suite uses a temporary profile, samples offline audio, opens all 30 stages with networking disabled, and checks save persistence after relaunch. Pass the candidate executable path after `npm.cmd run test:desktop --`. Pass a v1.0.0 executable as the second path to also verify save migration in the same temporary profile.

## Credits

The characters, scenery, sound effects, and seven original music themes are generated by the project's Canvas and Web Audio code. [Phaser](https://phaser.io/) powers the game. [Vite](https://vite.dev/) builds the web edition, and [Electron](https://www.electronjs.org/) powers the Windows edition. The interface uses [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) and [DM Sans](https://github.com/googlefonts/dm-fonts) via Fontsource.
