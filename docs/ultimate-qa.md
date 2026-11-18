# Pixel Adventure · Combat & Movement 3.0 QA

Private development branch `feature/v3-combat-movement-ultimate` from Combat 2.0 `738d79ad279f49fc9ddcfedcd11991db4d60ac06`.

[Play locally](http://127.0.0.1:4210/) · [Training Arena](http://127.0.0.1:5173/?shadow=arena) · [Review gallery](http://127.0.0.1:4211/)

## Game changes

- All core techniques start unlocked and use animation recovery or a cooldown. Shadow Energy and Shuriken stock were removed from the combat loop. A rejected Execution leaves its cooldown ready.
- Parry protects the front during its active window against projectiles and marked melee attacks from the new archetypes. Traps, contact-only damage and attacks from behind still require movement. A success briefly permits a one-use countercut.
- Sprint retains standard jumping height and airborne horizontal speed. Wall-slide and wall-jump are restricted to explicit wall colliders. A wall kick never restores Air Dash. The air combo and downward strike have landing and recovery rules.
- Shadow Rival, Night Hunter and Iron Guardian appear on stages 17, 22 and 28 and in Survival. Their behavior uses player position, sight lines, schedules and confirmed contacts.
- Boss Rush and the campaign retain the existing boss phases and per-opening health limits. Boss warnings distinguish an approaching low wave and offer jump or Parry counterplay.
- Stage ranks use time, defense, combat and coins. Combat Trials and cosmetic awards are stored separately from legacy data. Two optional secret caches leave existing campaign coins and finish flags in place.
- Skill saves migrate from v1 to v2 without losing tiers or milestones. Challenge and Survival runs use the base loadout.

## Checks

- All 42 Node tests passed. The production build, browser regression, emulated touch, and offline Windows-source Electron suites passed.
- Controlled browser probes cover animation and abilities, movement edges, skill purchase and refund, inputs and local reward persistence.
- Windows migration used an isolated profile seeded by the existing v2 executable. The candidate read the campaign/settings data and kept purchased Shadow tiers after an offline relaunch.
- The review clips contain actual runtime graphics. Arena clips may begin from a controlled position. Campaign, Boss Rush, and Survival clears use control inputs throughout.
- The local gallery loaded all 43 clips in its frame viewer and decoded all 15 gameplay videos. Playback controls, a 393 px gallery viewport, and Survival and Combat Trials access at 320 px passed.
- A controlled Hollow Crown probe blocked a real wave with Parry. Execution was refused while the boss guarded and left the cooldown untouched. When the boss opened, its health moved from five to three, then advanced to sigils.
- Evidence files for focused browser scenarios: `qa-aerialChain.json`, `qa-arena.json`, `qa-campaign.json`, `qa-campaignTechniques.json`, `qa-comparisons.json`, `qa-enemyPreviews.json`, `qa-gamepadProbe.json`, `qa-mobile.json`, `qa-parryAndEnemy.json`, `qa-secretDiscovery.json`, `qa-skillsAndBindings.json`, `qa-sprintComparison.json`, `qa-survivalRun.json`, `qa-techniques.json`, `qa-wallAndAir.json`.

## Campaign

A fresh save progressed in order to Victory with 306/560 coins, 23 deaths, 7:44.252 level time and 89 Dash activations. The browser automation reads the live scene and generates keyboard events. Its progress claim uses no position, health, collision, or objective changes.

| Stage | Level | Result | Time | Deaths | Coins | Dash | Katana | Rank | Attempt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Verdant Hills | Cleared | 0:11.942 | 0 | 2/18 | 6 | 5 | A | 1 |
| 2 | Fernbrook | Cleared | 0:06.066 | 0 | 5/12 | 3 | 3 | A | 1 |
| 3 | Thistle Trail | Cleared | 0:07.183 | 0 | 5/12 | 3 | 3 | A | 1 |
| 4 | Willow Crossing | Cleared | 0:09.566 | 0 | 7/16 | 3 | 3 | A | 1 |
| 5 | Sunset Canyon | Cleared | 0:13.946 | 0 | 4/20 | 5 | 6 | S | 1 |
| 6 | Copper Ferry | Cleared | 0:11.566 | 0 | 7/16 | 2 | 4 | S | 1 |
| 7 | Falling Mesa | Cleared | 0:11.500 | 0 | 8/17 | 3 | 4 | S | 1 |
| 8 | Sunbreak Gorge | Cleared | 0:24.279 | 2 | 10/20 | 2 | 6 | B | 1 |
| 9 | Frostwood | Cleared | 0:07.443 | 0 | 6/12 | 2 | 3 | A | 1 |
| 10 | Glacier Steps | Cleared | 0:12.116 | 0 | 8/17 | 2 | 4 | S | 1 |
| 11 | Crystal Peaks | Cleared | 0:22.382 | 1 | 14/22 | 4 | 6 | A | 1 |
| 12 | Whiteout Pass | Cleared | 0:16.499 | 0 | 13/24 | 1 | 4 | S | 1 |
| 13 | Ember Banks | Cleared | 0:09.146 | 2 | 8/13 | 1 | 3 | B | 1 |
| 14 | Cinder Lift | Cleared | 0:12.316 | 0 | 9/17 | 4 | 2 | A | 1 |
| 15 | The Furnace | Cleared | 0:14.399 | 1 | 14/20 | 2 | 4 | B | 1 |
| 16 | Molten Citadel | Cleared | 0:17.973 | 1 | 16/25 | 2 | 4 | A | 1 |
| 17 | The Gatehouse | Cleared | 0:12.039 | 1 | 9/17 | 5 | 4 | A | 1 |
| 18 | Bell Tower | Cleared | 0:13.316 | 0 | 11/19 | 1 | 2 | A | 1 |
| 19 | Obsidian Keep | Cleared | 0:16.766 | 0 | 14/25 | 2 | 1 | A | 1 |
| 20 | The Hollow Crown | Cleared | 0:27.396 | 2 | 12/18 | 6 | 8 | B | 1 |
| 21 | Toxic Entrance | Cleared | 0:08.676 | 1 | 8/13 | 2 | 2 | B | 1 |
| 22 | Venom Vines | Cleared | 0:12.476 | 0 | 12/19 | 2 | 10 | S | 1 |
| 23 | Forgotten Swamp | Cleared | 0:14.666 | 1 | 12/20 | 3 | 3 | B | 1 |
| 24 | The Poison Labyrinth | Cleared | 0:21.016 | 4 | 16/26 | 4 | 13 | B | 1 |
| 25 | Poison Queen | Cleared | 0:20.676 | 1 | 6/12 | 3 | 9 | A | 1 |
| 26 | Electric Gateway | Cleared | 0:14.573 | 2 | 11/19 | 3 | 5 | B | 1 |
| 27 | Laser Corridor | Cleared | 0:17.123 | 1 | 14/21 | 3 | 4 | B | 1 |
| 28 | Mechanical Nightmare | Cleared | 0:18.616 | 2 | 16/25 | 4 | 6 | B | 1 |
| 29 | The Final Gauntlet | Cleared | 0:20.866 | 1 | 16/27 | 3 | 3 | B | 1 |
| 30 | Thunder Titan | Cleared | 0:37.725 | 0 | 13/18 | 3 | 10 | S | 1 |

### Boss Rush

| Boss | Time | Deaths | Observed patterns |
| --- | --- | --- | --- |
| The Hollow Crown | 0:13.269 | 0 | wave, sigils, crownfall |
| Poison Queen | 0:13.343 | 0 | spores, venom, bloom |
| Thunder Titan | 0:26.606 | 0 | wave, bolts, impact |

### Challenge modes

The four non-Rush challenge checks use an isolated profile with eligibility records so that live input on Verdant Hills starts after menu selection.

| Mode | Result | Time | Deaths |
| --- | --- | --- | --- |
| hardcore | Completed | 0:12.114 | 0 |
| nightmare | Completed | 0:12.110 | 0 |
| trial | Completed | 0:11.963 | 0 |
| flawless | Completed | 0:11.964 | 0 |

Survival reached **6 waves and 3450 points** in 0:36.375. The test used only inputs. The test record includes the captain waves and retains the fixed nine-enemy pool.

## Movement proof

Steady-state running measured 132 world px/s. Sprint measured 177 world px/s over the recorded interval. The instantaneous cap was 176 world px/s.

## Performance

Windows, Intel Core i7-1360P, headless Microsoft Edge. The desktop viewport was 1200 × 850. Phone emulation used 839 × 393 at DPR 1. The 4× cases use Chromium CPU throttling. The reference is a separate Vite build of the Combat 2.0 commit and uses the same input recipe. Stage 30 uses controlled late-phase starting positions for comparison.

| Setup | Stage | Build | Avg. FPS | Median FPS | p95 ms | p99 ms | Frames ≥50 ms | Input to motion ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | 1 | Combat 2.0 | 60 | 59.9 | 16.9 | 17.1 | 0 | 17 |
| desktop | 30 | Combat 2.0 | 60 | 59.9 | 16.9 | 17.1 | 0 | 21 |
| desktop | 1 | Ultimate | 60 | 59.9 | 17 | 17.2 | 0 | 21 |
| desktop | 30 | Ultimate | 60 | 59.9 | 16.9 | 17 | 0 | 30 |
| phone emulation | 1 | Combat 2.0 | 60 | 59.9 | 16.9 | 17 | 0 | 26 |
| phone emulation | 30 | Combat 2.0 | 60 | 59.9 | 16.9 | 17.1 | 0 | 15 |
| phone emulation | 1 | Ultimate | 60 | 59.9 | 16.9 | 17 | 0 | 25 |
| phone emulation | 30 | Ultimate | 60 | 59.9 | 16.9 | 17 | 0 | 23 |
| phone emulation throttled | 1 | Combat 2.0 | 48.6 | 59.9 | 33.5 | 49.8 | 2 | 25 |
| phone emulation throttled | 30 | Combat 2.0 | 53.4 | 59.9 | 33.4 | 33.6 | 1 | 24 |
| phone emulation throttled | 1 | Ultimate | 46.7 | 59.9 | 33.5 | 33.8 | 2 | 28 |
| phone emulation throttled | 30 | Ultimate | 52.7 | 59.9 | 33.4 | 33.5 | 1 | 15 |

Execution at 4× CPU slowdown sampled 132 intervals across 5 activations. Median 59.9 FPS, p95 33.5 ms and p99 33.6 ms.

The controlled six-enemy Survival workload measured 60 FPS average at 1× CPU with 16.9 ms p95 and 59.8 FPS average at 4× CPU with 16.8 ms p95. Both samples reused the fixed nine-enemy pool and observed a peak of one enemy projectile slot.

Offline Electron sampled 60 FPS average at Level 1, 59.9 FPS median and 16.9 ms p95.

The Ninja uses 43 authored clips and 163 frames. One decoded atlas occupies 5.74 MiB, compared with 4.65 MiB in Combat 2.0. The game evicts previous non-default outfits when switching costumes.

## Limitations

- Physical phones, tablet GPUs, iOS Safari multitouch, gamepad hardware and human difficulty testing have no verification in this cycle. Controller checks use simulated standard Gamepad input.
- The full campaign uses one successful keyboard route and selected combat. Separate probes cover other mechanics and deliberate collision cases. An input-driven route is evidence of completion and does not exhaustively check every ability on every floor, hazard or challenge stage.
- Benchmarks sample a single Windows machine. CPU-throttled results vary and cannot establish performance on a physical phone.
- The sampled 4× CPU campaign workloads fell short of a sustained 60 FPS average. The dedicated Execution sample also included a frame of 50 ms or more.
- The project uses original hand-authored pixel art and generated animation atlases. Inspect the gallery to assess the artwork and game feel. Captured videos are silent. The offline audio test separately checked sound output and mute.
- Offline verification uses Electron from source and a legacy-profile fixture. This private cycle does not package or distribute an installer.
