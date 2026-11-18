# Legends of Shadows · Private QA

Candidate 4.0.0-rc.1 is on `feature/v4-legends-of-shadows`, based on Combat & Movement 3.0 commit `d39fb6352d9e9ac00594ae672bf0a3e413db0d1c`.

Open the [local production build](http://127.0.0.1:4220/) and choose **Legends of Shadows → Choose Hero** or **Enter Ninja Village**. In the Village, press **E** or use the touch interaction button near Instructor Ren for the dojo. The [development Training Arena](http://127.0.0.1:5173/?shadow=arena) adds combat diagnostics. The [private review gallery](http://127.0.0.1:4221/) contains all five sprite sheets, an animation viewer, gameplay captures and raw evidence.

## Campaign and hero compatibility

**300/300** hero-stage combinations cleared. Per-hero results, in matrix order, are 60/60, 60/60, 60/60, 60/60, 60/60.

The fresh-save campaign cleared all 60 stages as Shadow Ninja and verified Victory totals. The final story and return to Ninja Village passed in a separate end-to-end check. The saved run recorded **607 coins, 762.979 seconds of in-stage time, and 29 deaths**. Times exclude menus and transitions. The runner used read-only stage state and ordinary key events. The four separate hero runs pre-unlocked access in temporary profiles and played every stage from its normal spawn, with collisions, hazards, checkpoint respawns and boss phases active.

Five initial input routes timed out. Flame Samurai cleared stage 8 after using Fire Wave against the guard, 18 using a no-Dash route, and 28 by jumping the sentinel. Forest Ranger cleared 10 with a sprint jump over the last gap and 28 by jumping the sentinel. All initial attempts and successful retries are retained. **Clear** means a normal-input finish, separate from controlled smoke fixtures.

| Stage | Name | Shadow | Flame | Frost | Thunder | Ranger |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Verdant Hills | Clear | Clear | Clear | Clear | Clear |
| 2 | Fernbrook | Clear | Clear | Clear | Clear | Clear |
| 3 | Thistle Trail | Clear | Clear | Clear | Clear | Clear |
| 4 | Willow Crossing | Clear | Clear | Clear | Clear | Clear |
| 5 | Sunset Canyon | Clear | Clear | Clear | Clear | Clear |
| 6 | Copper Ferry | Clear | Clear | Clear | Clear | Clear |
| 7 | Falling Mesa | Clear | Clear | Clear | Clear | Clear |
| 8 | Sunbreak Gorge | Clear | Clear | Clear | Clear | Clear |
| 9 | Frostwood | Clear | Clear | Clear | Clear | Clear |
| 10 | Glacier Steps | Clear | Clear | Clear | Clear | Clear |
| 11 | Crystal Peaks | Clear | Clear | Clear | Clear | Clear |
| 12 | Whiteout Pass | Clear | Clear | Clear | Clear | Clear |
| 13 | Ember Banks | Clear | Clear | Clear | Clear | Clear |
| 14 | Cinder Lift | Clear | Clear | Clear | Clear | Clear |
| 15 | The Furnace | Clear | Clear | Clear | Clear | Clear |
| 16 | Molten Citadel | Clear | Clear | Clear | Clear | Clear |
| 17 | The Gatehouse | Clear | Clear | Clear | Clear | Clear |
| 18 | Bell Tower | Clear | Clear | Clear | Clear | Clear |
| 19 | Obsidian Keep | Clear | Clear | Clear | Clear | Clear |
| 20 | The Hollow Crown | Clear | Clear | Clear | Clear | Clear |
| 21 | Toxic Entrance | Clear | Clear | Clear | Clear | Clear |
| 22 | Venom Vines | Clear | Clear | Clear | Clear | Clear |
| 23 | Forgotten Swamp | Clear | Clear | Clear | Clear | Clear |
| 24 | The Poison Labyrinth | Clear | Clear | Clear | Clear | Clear |
| 25 | Poison Queen | Clear | Clear | Clear | Clear | Clear |
| 26 | Electric Gateway | Clear | Clear | Clear | Clear | Clear |
| 27 | Laser Corridor | Clear | Clear | Clear | Clear | Clear |
| 28 | Mechanical Nightmare | Clear | Clear | Clear | Clear | Clear |
| 29 | The Final Gauntlet | Clear | Clear | Clear | Clear | Clear |
| 30 | Thunder Titan | Clear | Clear | Clear | Clear | Clear |
| 31 | Lantern Crossing | Clear | Clear | Clear | Clear | Clear |
| 32 | Whispering Stalks | Clear | Clear | Clear | Clear | Clear |
| 33 | The Missing Path | Clear | Clear | Clear | Clear | Clear |
| 34 | Watch of the Departed | Clear | Clear | Clear | Clear | Clear |
| 35 | Veil of Lanterns | Clear | Clear | Clear | Clear | Clear |
| 36 | Phantom Gate | Clear | Clear | Clear | Clear | Clear |
| 37 | Tidewater Steps | Clear | Clear | Clear | Clear | Clear |
| 38 | Coral Galleries | Clear | Clear | Clear | Clear | Clear |
| 39 | The Bell Divers | Clear | Clear | Clear | Clear | Clear |
| 40 | The Flooded Court | Clear | Clear | Clear | Clear | Clear |
| 41 | Siphon Chambers | Clear | Clear | Clear | Clear | Clear |
| 42 | Abyssal Throne | Clear | Clear | Clear | Clear | Clear |
| 43 | Windward Arrival | Clear | Clear | Clear | Clear | Clear |
| 44 | Kitekeeper Ruins | Clear | Clear | Clear | Clear | Clear |
| 45 | Broken Aerie | Clear | Clear | Clear | Clear | Clear |
| 46 | Cloudbridge Outpost | Clear | Clear | Clear | Clear | Clear |
| 47 | The Updraft Stair | Clear | Clear | Clear | Clear | Clear |
| 48 | Eye of the Tempest | Clear | Clear | Clear | Clear | Clear |
| 49 | Signal Rooftops | Clear | Clear | Clear | Clear | Clear |
| 50 | Drone Array | Clear | Clear | Clear | Clear | Clear |
| 51 | Relay Tower Climb | Clear | Clear | Clear | Clear | Clear |
| 52 | Security Foundry | Clear | Clear | Clear | Clear | Clear |
| 53 | Blackout Circuit | Clear | Clear | Clear | Clear | Clear |
| 54 | Citadel of Circuits | Clear | Clear | Clear | Clear | Clear |
| 55 | The Crimson Divide | Clear | Clear | Clear | Clear | Clear |
| 56 | Mirror of Dusk | Clear | Clear | Clear | Clear | Clear |
| 57 | Throne Road | Clear | Clear | Clear | Clear | Clear |
| 58 | March of the Hollow | Clear | Clear | Clear | Clear | Clear |
| 59 | The Last Shadow | Clear | Clear | Clear | Clear | Clear |
| 60 | Eclipse Ascension | Clear | Clear | Clear | Clear | Clear |

## Guardian phases

All 40 hero–boss combinations completed with all three patterns observed in each recorded clear. Bosses retain their damage gates. The five recorded new fights are available in the gallery.

| Stage | Guardian | Hero clears with all three phases observed |
| ---: | --- | ---: |
| 20 | The Hollow Crown | 5/5 |
| 25 | The Poison Queen | 5/5 |
| 30 | Thunder Titan | 5/5 |
| 36 | Phantom Samurai | 5/5 |
| 42 | Abyss Guardian | 5/5 |
| 48 | Storm Dragon | 5/5 |
| 54 | Cyber Shogun | 5/5 |
| 60 | Eclipse Emperor | 5/5 |

## Automated and platform checks

| Check | Result |
| --- | --- |
| Node and production build | 49 tests passed. Vite built successfully. Coverage includes combat rules, terrain, difficulty variations, hazard boundaries, save migration, and geometry for five movement profiles. |
| Browser smoke | All 60 scene loads and finish conditions, settings, old challenge modes, and Victory replay passed. Selected arena checks use controlled setup. |
| Gallery | Verified all five atlas viewers, video playback, local assets and layouts at 1200 × 850, 390 × 844, and 839 × 393. |
| Hero combat and animation | Five hero probes passed. Selection persisted after reload. Each hero loaded 43 populated animation clips and responded to jump, primary, ranged, special and Ultimate inputs. Selection was blocked during the stage. The Training Arena probe uses controlled approach positioning. |
| Phone emulation | All five heroes passed a four-contact sprint, movement, jump and aerial attack, then a touch special. The dedicated suite covered slide transfer, release, fast taps, buffering, cancel, rotation, focus, pause, death, saved settings and six viewport layouts. |
| Legacy and partial saves | Verified a v2-shaped profile written by the historical Electron app. V3-shaped campaign and Shadow upgrade migrations, corrupted or partial v4 records, and browser reload were covered by fixtures and tests. |
| Offline Electron | All 60 stages loaded offline from the local production assets. Verified keyboard play, coin collection, Web Audio signal and mute, an old milestone, a purchased Shadow upgrade, and v4 hero choice across relaunch. No external gameplay requests or page errors were observed in the smoke run. |
| Replay modes | The first New Game+ stage cleared with an equipped, honed Greatsword. A local-date timed Daily and a Master Eclipse Emperor rematch cleared through normal inputs. Separate records held. Unit tests exercised all 60 New Game+ record transitions. |
| Survival | Six waves completed through normal inputs with Shadow Ninja, including Guardian Captains. |
| Economy and rank | Verified independent bests, reward limits, one-time claims, weapon/skill persistence, and the S-rank threshold. The fresh run earned **13 S**, **39 A**, and **8 B** ranks. |
| Mastery and secrets | Silver Trim was equipped using mastery earned in the full campaign. The bamboo cache was collected with two ordinary jumps and persisted in the v4 save. Geometry tests cover all ten new sets of secret ledges. |

## Performance

Windows host with Intel Core i7-1360P, 16 logical processors, and Intel Iris Xe / Arc A350M adapters. Edge Chromium ran through Playwright. Phone emulation used 839 × 393 CSS pixels. The slower pass applied Chromium's 4× CPU throttle. These are short samples. The stage-60 stress workload uses a controlled setup. Input time measures delivery to an observed in-game action.

| Build | Profile | Stage | Avg FPS | Median FPS | P95 ms | P99 ms | Scene start ms | Input ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Combat & Movement 3.0 | desktop | 1 | 60 | 59.9 | 17 | 17.2 | 449 | 24 |
| Combat & Movement 3.0 | desktop | 30 | 60 | 59.9 | 16.9 | 17.1 | 432 | 38 |
| Legends of Shadows | desktop | 1 | 60 | 59.9 | 16.9 | 17 | 399 | 33 |
| Legends of Shadows | desktop | 30 | 60 | 59.9 | 16.9 | 17 | 388 | 28 |
| Legends of Shadows | desktop | 60 | 59.6 | 59.9 | 16.9 | 17 | 368 | 26 |
| Combat & Movement 3.0 | phone emulation | 1 | 60 | 59.9 | 16.9 | 17 | 399 | 15 |
| Combat & Movement 3.0 | phone emulation | 30 | 60 | 59.9 | 16.9 | 17 | 392 | 24 |
| Legends of Shadows | phone emulation | 1 | 60 | 59.9 | 16.9 | 17 | 338 | 32 |
| Legends of Shadows | phone emulation | 30 | 60 | 59.9 | 16.9 | 16.9 | 372 | 18 |
| Legends of Shadows | phone emulation | 60 | 60 | 59.9 | 16.9 | 17 | 326 | 28 |
| Combat & Movement 3.0 | phone emulation throttled | 1 | 56.7 | 59.9 | 33.1 | 33.4 | 571 | 32 |
| Combat & Movement 3.0 | phone emulation throttled | 30 | 60 | 59.9 | 16.8 | 16.9 | 723 | 55 |
| Legends of Shadows | phone emulation throttled | 1 | 54.8 | 59.9 | 33.3 | 33.5 | 681 | 30 |
| Legends of Shadows | phone emulation throttled | 30 | 55.4 | 59.9 | 33.3 | 33.4 | 725 | 56 |
| Legends of Shadows | phone emulation throttled | 60 | 57.3 | 59.9 | 16.9 | 33.4 | 624 | 17 |
| Electron offline | Desktop | 1 | 60 | 59.9 | 16.9 | 17 | — | — |

The decoded RGBA Shadow atlas measured 5.74 MiB. Three restarts returned to 205 scene objects each and cleared projectile state. The atlas estimate covers the image only. Heap and process memory were outside this sample. The six-enemy Survival probe averaged 60 FPS unthrottled and 55.5 FPS at 4× throttle, with nine pooled enemies and at most one live projectile per side in each sample. Two five-run Shadow Execution samples at 4× throttle varied. The first measured 30.1 median FPS and 50.1 ms P95. The repeat measured 59.9 median FPS and 16.8 ms P95. Both samples are retained. Low-power consistency still needs a longer and quieter measurement.

## Fixes and review limits

- Restored the missing approach ledges and wall for ten new caches. The cache object previously loaded without its climbable terrain.
- Fixed challenge record restoration for stages 31–60 and preserved authored wind when constructing difficulty variants.
- The combat regression test now waits for the game to consume a missed Ultimate input before placing the next isolated target. This avoids turning that missed input into a valid attack between frames.
- Kept keyboard focus on selections after rebuilding the hero dialogue. Added hero-specific action labels and restricted battle-atlas loading to the active alternate hero.
- The new heroes use individual weapons, timing and articulated pixel art on a shared 43-clip pose framework. Shadow retains his six legacy upgrade tracks. The 72 new nodes are organized as three branches for each of the four new heroes. Tests verify all 72 values and retained Shadow mechanics. Every upgraded loadout has yet to be exercised in live combat.
- The five new bosses use distinct telegraphs, damage gates and openings. Their gameplay hurtboxes stay anchored, with the Storm Dragon opening at floor level and the Phantom Samurai feinting through marked fields. Free-flying and physical repositioning behavior remains incomplete relative to the brief.
- Sunken Temple has flooded movement zones and currents. It has no oxygen timer. The prologue uses illustrated panels and the ending plays through Victory. Each hero has a default scheme and a Mastery trim. Survival captains reuse existing enemy archetypes.
- Physical mobile and controller hardware, Safari/iOS WebKit, full runs under every difficulty modifier, long Survival memory soaking, and human difficulty and visual sign-off remain open. The Windows check used source Electron.
- Before a public release, review the boss reads and hero silhouettes in motion, compare hero timings in hands-on play, and run a sustained device and Survival test.

The development branch, test servers, and media were kept local.
