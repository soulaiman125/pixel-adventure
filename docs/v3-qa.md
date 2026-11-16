# Pixel Adventure 3.0 release candidate QA

## Normal campaign

A fresh campaign used keyboard movement, jumping, and combat throughout. The test driver observed scene state for timing. All 30 stages cleared in order and Victory reported 304 of 560 coins and 23 deaths in roughly 7 minutes 50 seconds. The successful run completed every stage on its first attempt.

Earlier automation runs timed out at Cinder Lift, Molten Citadel, and Toxic Entrance. They repeatedly jumped into airborne enemies above fire hazards or confronted a shield from the front. Timing the fire hazards from the ground and jumping over the shield cleared those sections. These were driver changes. The successful run had no observed softlocks.

| Stage | Level | Coins | Deaths | Time |
| --- | --- | ---: | ---: | ---: |
| 1 | Verdant Hills | 2/18 | 0 | 00:12.927 |
| 2 | Fernbrook | 5/12 | 0 | 00:06.600 |
| 3 | Thistle Trail | 5/12 | 0 | 00:07.683 |
| 4 | Willow Crossing | 7/16 | 1 | 00:11.766 |
| 5 | Sunset Canyon | 4/20 | 0 | 00:14.716 |
| 6 | Copper Ferry | 7/16 | 0 | 00:11.716 |
| 7 | Falling Mesa | 9/17 | 0 | 00:11.883 |
| 8 | Sunbreak Gorge | 9/20 | 2 | 00:24.282 |
| 9 | Frostwood | 6/12 | 0 | 00:07.816 |
| 10 | Glacier Steps | 8/17 | 0 | 00:12.283 |
| 11 | Crystal Peaks | 14/22 | 0 | 00:18.532 |
| 12 | Whiteout Pass | 13/24 | 0 | 00:16.516 |
| 13 | Ember Banks | 8/13 | 1 | 00:08.466 |
| 14 | Cinder Lift | 9/17 | 0 | 00:12.649 |
| 15 | The Furnace | 14/20 | 0 | 00:12.999 |
| 16 | Molten Citadel | 16/25 | 1 | 00:17.949 |
| 17 | The Gatehouse | 8/17 | 0 | 00:11.933 |
| 18 | Bell Tower | 12/19 | 5 | 00:21.566 |
| 19 | Obsidian Keep | 15/25 | 2 | 00:21.049 |
| 20 | The Hollow Crown | 12/18 | 0 | 00:24.615 |
| 21 | Toxic Entrance | 8/13 | 0 | 00:08.100 |
| 22 | Venom Vines | 11/19 | 1 | 00:12.633 |
| 23 | Forgotten Swamp | 11/20 | 0 | 00:12.633 |
| 24 | The Poison Labyrinth | 13/26 | 2 | 00:18.682 |
| 25 | Poison Queen | 7/12 | 1 | 00:21.316 |
| 26 | Electric Gateway | 13/19 | 2 | 00:14.449 |
| 27 | Laser Corridor | 14/21 | 1 | 00:14.649 |
| 28 | Mechanical Nightmare | 16/25 | 2 | 00:18.599 |
| 29 | The Final Gauntlet | 16/27 | 1 | 00:20.899 |
| 30 | Thunder Titan | 12/18 | 1 | 00:39.848 |

## Challenge checks

- Hardcore cleared Verdant Hills and Laser Corridor using keyboard inputs.
- Nightmare cleared Verdant Hills and Poison Queen using keyboard inputs.
- Boss Rush cleared all three arenas in about 54 seconds with zero deaths.
- Time Trial and No-Death cleared Verdant Hills. The browser suite checked No-Death failure and retry, outfit persistence, and separation from the campaign save.

## Build and compatibility

20 Node tests passed. Browser smoke opened all 30 stages and tested the three boss tiers, checkpoints, and challenge results. The touch suite passed six layouts and verified multitouch and the 320 px wardrobe. Firefox and WebKit passed a reduced-motion startup and gameplay check. The production build passed, and the npm dependency audit reported no vulnerabilities.

The Windows x64 NSIS archive contains the same app archive used in the offline smoke test. The app loaded all stages offline, emitted Web Audio, and kept saves across relaunch. Isolated v1.0.0 and v2.0.0 profile checks passed. The unsigned setup is for private testing. The in-place v3 installer upgrade and physical-phone and human difficulty checks remain pending.

## Browser performance sample

Short Level 29 runs in Edge measured the following on this PC. The 4× test emulated a phone in landscape with reduced motion. Input timing covers a key event to a position change. Heap figures cover JavaScript only.

| Metric | Desktop v2 → v3 | 4× CPU emulation v2 → v3 |
| --- | --- | --- |
| Average frame rate | 60 → 60 FPS | 44.0 → 46.3 FPS |
| 95th-percentile frame time | 17.0 → 17.0 ms | 33.6 → 33.6 ms |
| Game and fonts ready | 412 → 459 ms | 1183 → 1029 ms |
| Input response | 29 → 27 ms | 23 → 24 ms |
| JS heap | 8.19 → 9.19 MiB | 12.33 → 10.93 MiB |

A moving-platform offset assertion failed once while several suites were running and passed on rerun. The campaign reached Victory using those platforms. Retest them on a high-refresh monitor during human QA.