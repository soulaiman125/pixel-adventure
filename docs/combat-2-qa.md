# Shadow Ninja Combat 2.0 private QA

## Scope and build

The candidate branches from `ad87879` on `feature/v3-shadow-ninja-combat-2`. It keeps the 30 campaign maps, the seven worlds, three bosses, challenge records, and the campaign save format. The skill system has its own versioned save. First clears from existing records are credited when that save is opened. The private build, arena, and gallery listen on loopback.

- [Production preview](http://127.0.0.1:4200/)
- [Development training hall](http://127.0.0.1:5173/?shadow=arena)
- [Review gallery](http://127.0.0.1:4201/)

## Verification

| Suite | Method |
| --- | --- |
| Node regression | 33/33 passed, including combo timing, damage, one Air Dash per landing, Shuriken sweep and charges, hazard collision, boss guard and phase mechanics, campaign progress, and skill save and refund handling. |
| Browser smoke | Loaded all 30 levels and exercised menus, tutorials, pause, retry, restart, checkpoints, coin preservation, hazard collision, challenge records, and Victory. Controlled positioning isolates triggers in this suite. |
| Combat browser | Seven scenarios passed, including combo contact timing and training bounds, ranged charge exhaustion and regeneration, sprint braking, charge cancellation, Cyclone hit limits, Execution target and wall checks, all 18 purchases and refunds, three live upgraded behaviors, remapping, and live Level 1 combat. |
| Hazard probes | Dash and respawn were exercised against solid walls, spikes, lava, electric floors, an active laser grid, crushing walls, poison, and boss projectiles. Moving-platform jump and dash, world bounds, Shuriken line-of-sight, flying targets, boss guards, and a living boss blocking the finish also passed controlled tests. |
| Touch | Pointer transfer, cancellation, buffering, movement and attack, pause, rotation and six layouts passed. The separate combat suite sent four simultaneous touch contacts and verified sprint toggle, Cyclone and Execution buttons, left-handed layouts and 44 px targets. Chromium emulation on Windows. |
| Campaign | Fresh browser save, sequential unlocks and 30 keyboard-input clears through Victory. The automated player inspects the scene and sends keyboard events. It never writes coordinates, health, inventory, timers, or objectives during the run. |
| Boss Rush | A separate keyboard run cleared Hollow Crown, Poison Queen, and Thunder Titan. All three patterns for each boss appeared. Unlock data was seeded for mode access before the run. |
| Other challenges | Each of Hardcore, Nightmare, Time Trial, and No-Death cleared a Level 1 input-driven sample. Challenge records and outfits have separate smoke coverage. Upgrades are disabled in challenge runs to standardize loadouts. |
| Offline Windows | Electron from source played without networking, loaded all 30 stages, produced Web Audio, muted audio, and retained progress after relaunch. A public v2.0 executable and the candidate shared an isolated test profile for the legacy progress and settings migration case. |
| Build and audit | Production Vite build passed. npm's full and runtime-only dependency audits reported 0 known vulnerabilities at the time of testing. |
| Gallery | The animation viewer exposed all 33 clips and passed frame stepping, playback, pause, and speed selection. The eight WebM sources decoded. Desktop and 390 px layouts were checked. |

The run evidence includes per-stage timing, deaths, coins, abilities, checkpoints, platforms, enemy types and observed boss patterns. The gallery's training clips start from controlled positions and its campaign and Boss Rush clips start from natural spawn points. The captures are silent. The offline browser window separately verified audio output and mute.

## Fixes verified

- Shuriken had passed above short enemies on the ground. Lowering the release point by four game pixels aligned its collision with Verdant Hills slimes. The test approaches the first slime from spawn with regular inputs and confirms a hit.
- Dash never refreshes in midair, including after a ground dash carries the player off a ledge. Sprint retains its ground-speed advantage and gives up excess horizontal speed immediately on a jump or step off the ground. Its braking upgrade changes sprint transitions.
- Execution checks exposure, range, terrain and boss phase before spending Energy. Its approach uses ordinary horizontal physics on a continuous platform. Each strike has a separate contact window. A controlled Hollow Crown test verified that a guard rejects the move at no cost and the final strike respects the phase-health floor before the next attack pattern.
- Enemy stagger has a recovery interval. Confirmed damage and scoped projectile dodges award limited Energy. The training dummy cannot generate Energy.
- The weapons and cast effects are pooled or reused. Sword trails follow blade coordinates authored into the current and preceding frame. Touch cooldown indicators update only when their availability changes.

## Remaining verification limits

- Physical phones, iOS Safari multitouch, gamepads, human difficulty and exhaustive upgrade-by-encounter combinations remain untested. The current game has keyboard and touch input. No new gamepad mapping was added.
- The legitimate campaign exercises native movement, jumps, Dash, and Katana. Supplemental tests exercise Sprint jumping, Shuriken, Charged Slash, Cyclone, and Execution in Verdant Hills and isolated interactions. The run is one successful route across the campaign and does not cover every alternate route or collectible.
- The Electron verification uses a local source build. It includes no installer or installer upgrade test.
- The 129-frame, 33-clip hero atlas increases decoded memory from 2.73 MiB to 4.65 MiB per loaded costume. Short benchmark samples on one Windows system are indicators of frame pacing, without coverage of phone GPUs or thermal throttling.
- Sustained 60 FPS remains unverified under 4× CPU slowdown. The candidate showed roughly 30 FPS low-end intervals and one frame at or above 50 ms in the five-activation Execution test.

## Campaign evidence

Victory after 7:41.347 of level time. The runner collected 307/560 coins and recorded 22 deaths, 85 Dashes and 147 Katana cuts on the successful attempts. The supplemental live Level 1 probes cover Sprint, Shuriken, Charged Slash, Cyclone, and Execution.

| Stage | Level | Result | Time | Deaths | Coins | Dash | Katana | Attempt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Verdant Hills | Cleared | 0:11.963 | 0 | 2/18 | 6 | 5 | 1 |
| 2 | Fernbrook | Cleared | 0:06.098 | 0 | 5/12 | 3 | 3 | 1 |
| 3 | Thistle Trail | Cleared | 0:07.166 | 0 | 5/12 | 3 | 3 | 1 |
| 4 | Willow Crossing | Cleared | 0:09.583 | 0 | 7/16 | 3 | 4 | 1 |
| 5 | Sunset Canyon | Cleared | 0:13.779 | 0 | 4/20 | 6 | 6 | 1 |
| 6 | Copper Ferry | Cleared | 0:11.566 | 0 | 7/16 | 2 | 4 | 1 |
| 7 | Falling Mesa | Cleared | 0:11.499 | 0 | 8/17 | 3 | 4 | 1 |
| 8 | Sunbreak Gorge | Cleared | 0:24.281 | 2 | 10/20 | 2 | 6 | 1 |
| 9 | Frostwood | Cleared | 0:07.465 | 0 | 6/12 | 2 | 3 | 1 |
| 10 | Glacier Steps | Cleared | 0:12.099 | 0 | 8/17 | 2 | 4 | 1 |
| 11 | Crystal Peaks | Cleared | 0:23.066 | 2 | 14/22 | 4 | 8 | 1 |
| 12 | Whiteout Pass | Cleared | 0:17.116 | 1 | 13/24 | 2 | 5 | 1 |
| 13 | Ember Banks | Cleared | 0:09.148 | 2 | 8/13 | 1 | 3 | 1 |
| 14 | Cinder Lift | Cleared | 0:12.333 | 0 | 9/17 | 4 | 2 | 1 |
| 15 | The Furnace | Cleared | 0:12.783 | 0 | 14/20 | 1 | 2 | 1 |
| 16 | Molten Citadel | Cleared | 0:17.998 | 1 | 16/25 | 2 | 4 | 1 |
| 17 | The Gatehouse | Cleared | 0:11.156 | 0 | 9/17 | 4 | 3 | 1 |
| 18 | Bell Tower | Cleared | 0:13.329 | 0 | 11/19 | 1 | 2 | 1 |
| 19 | Obsidian Keep | Cleared | 0:16.716 | 0 | 14/25 | 2 | 1 | 1 |
| 20 | The Hollow Crown | Cleared | 0:27.529 | 2 | 12/18 | 5 | 8 | 1 |
| 21 | Toxic Entrance | Cleared | 0:08.676 | 1 | 8/13 | 2 | 2 | 1 |
| 22 | Venom Vines | Cleared | 0:13.129 | 0 | 12/19 | 2 | 11 | 1 |
| 23 | Forgotten Swamp | Cleared | 0:14.714 | 1 | 12/20 | 3 | 3 | 1 |
| 24 | The Poison Labyrinth | Cleared | 0:21.516 | 4 | 16/26 | 4 | 12 | 1 |
| 25 | Poison Queen | Cleared | 0:20.697 | 1 | 6/12 | 3 | 9 | 1 |
| 26 | Electric Gateway | Cleared | 0:14.314 | 2 | 12/19 | 2 | 3 | 1 |
| 27 | Laser Corridor | Cleared | 0:14.733 | 1 | 14/21 | 3 | 8 | 1 |
| 28 | Mechanical Nightmare | Cleared | 0:18.283 | 1 | 16/25 | 2 | 6 | 1 |
| 29 | The Final Gauntlet | Cleared | 0:20.882 | 1 | 16/27 | 3 | 3 | 1 |
| 30 | Thunder Titan | Cleared | 0:37.730 | 0 | 13/18 | 3 | 10 | 1 |

### Boss Rush

| Boss | Time | Deaths | Observed attack patterns |
| --- | --- | --- | --- |
| The Hollow Crown | 0:13.280 | 0 | wave, sigils, crownfall |
| Poison Queen | 0:13.343 | 0 | spores, venom, bloom |
| Thunder Titan | 0:26.655 | 0 | wave, bolts, impact |

## Performance

Headless Microsoft Edge on Windows with an Intel Core i7-1360P. Desktop used 1200 × 850. Phone emulation used an 839 × 393 landscape viewport at DPR 1. CPU slowdown used Chromium’s 4× setting. Each comparison sampled 4.8 seconds of matched input on Verdant Hills and controlled late-phase Thunder Titan workloads. The prior candidate was built from `ad87879`. Low FPS is the reciprocal of the p99 frame interval.

| Configuration | Stage | Build | Median FPS | Avg. FPS | Low FPS | p95 ms | p99 ms | Frames ≥50 ms | Input to motion ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | 1 | Previous | 59.9 | 60 | 59.2 | 16.8 | 16.9 | 0 | 29 |
| desktop | 30 | Previous | 59.9 | 60 | 59.2 | 16.8 | 16.9 | 0 | 33 |
| desktop | 1 | Combat 2.0 | 59.9 | 60 | 59.2 | 16.9 | 16.9 | 0 | 33 |
| desktop | 30 | Combat 2.0 | 59.9 | 60 | 59.2 | 16.9 | 16.9 | 0 | 22 |
| phone emulation | 1 | Previous | 59.9 | 60 | 59.2 | 16.8 | 16.9 | 0 | 32 |
| phone emulation | 30 | Previous | 59.9 | 60 | 58.8 | 16.8 | 17 | 0 | 16 |
| phone emulation | 1 | Combat 2.0 | 59.9 | 60 | 59.2 | 16.9 | 16.9 | 0 | 4 |
| phone emulation | 30 | Combat 2.0 | 59.9 | 60 | 59.2 | 16.8 | 16.9 | 0 | 17 |
| phone emulation throttled | 1 | Previous | 59.9 | 56.7 | 29.9 | 33.2 | 33.4 | 0 | 27 |
| phone emulation throttled | 30 | Previous | 59.9 | 51 | 29.9 | 33.4 | 33.5 | 0 | 13 |
| phone emulation throttled | 1 | Combat 2.0 | 59.9 | 44.6 | 29.9 | 33.4 | 33.5 | 0 | 25 |
| phone emulation throttled | 30 | Combat 2.0 | 59.9 | 53 | 29.8 | 33.4 | 33.6 | 0 | 60 |

Execution at 4× CPU slowdown recorded 129 frame intervals across 5 staged activations. Median 59.9 FPS, low 29.9 FPS, p95 33.4 ms, p99 33.5 ms and 1 frames at or above 50 ms.

The offline Electron Level 1 sample averaged 60 FPS with a 59.9 FPS median, 59.2 FPS low, 16.8 ms p95, 16.9 ms p99 and 0 frames at or above 50 ms.

Both web builds reopened Verdant Hills three times with the same 197 scene objects, the same cached atlas, and no carried projectiles. The late-phase boss and Execution samples use controlled starting positions solely for repeatable performance measurements.
