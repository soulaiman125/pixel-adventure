# Pixel Adventure 3.0.0-rc.2 candidate QA

Reviewed on 17 November 2026. This is a private candidate on branch `feature/v3-shadow-ninja-prototype`, developed from `6ea22ff`.

The local game runs at [the candidate preview](http://127.0.0.1:4196/). [The review gallery](http://127.0.0.1:4197/) includes matched comparisons, twelve staged world/boss screenshots, the 76-frame hero sheet, enemy and boss sheets, frame stepping, playback speed controls, and five gameplay videos. The final commit is recorded in the local review manifest.

## Integration and fixes

- Shadow Ninja now starts through regular Play Game, Level Select, every challenge mode and Next Level. The original campaign record keys, challenge record keys, settings and unlock rules are retained.
- A ground dash that leaves a ledge spends the current airborne sequence's dash. A valid solid landing restores it. Ground dash cooldown is 475 ms, dash duration is 155 ms, and speed is 252 world pixels per second. Normal jump uses the existing buffer and coyote time. Jump input cannot launch a second jump while airborne.
- The combo has 182/215/350 ms strike durations and 10/12/20 damage. Each strike records its targets, checks the active window and respects facing and guard rules. The heavy finisher still respects boss opening limits and health thresholds.
- Three shuriken charges refill individually every 2.1 seconds. Swept collision resolves the first wall, terrain, enemy, boss or world-boundary contact. Guard defense now uses the projectile's approach side. One ranged hit per boss opening preserves a reason to use the katana.
- Light-hit stagger is 240 ms and heavy-hit stagger is 310 ms. The armored guard resumes its patrol after recovery. Successful contact with a staggered enemy permits the follow-up window while other hazards and projectiles continue to damage the player.
- Run frames follow distance travelled. All saved outfit variants use the new sprite. Old hidden-hero animation updates and offscreen enemy presentation are skipped. Crown and horn padding prevents atlas clipping during wind-up.
- Seven themed backgrounds, material-specific terrain, animated patrol/anticipation/strike/hurt/death sheets, and dedicated Crown and Queen boss sheets complement the existing Titan art. The six new world plates occupy 409,524 bytes in WebP form. The eight detailed background plates together occupy 577,266 bytes.
- The preview copy was corrected after an older bundle remained at the served root. Its index and current bundle are verified against the production output.

Stage definitions, platform geometry, the progression module, challenge definitions and Electron security configuration have no source changes in this integration.

## Legitimate campaign run

Every row below comes from the campaign input controller. It reads the scene and predicts hazard timing, then sends keyboard events through the game's normal controls. The run begins with an empty campaign save. It uses movement, jumping, ground dash, attacks, checkpoints and normal respawns. It performs no coordinate writes, health writes, hazard disabling or finish-trigger calls. A separate browser suite uses staged positions for isolated checks.

The run reached Victory with **306/560 coins**, **17 deaths**, **90 dashes** and **453.77 seconds** of completed-stage time. HUD/result coin and death counts, ordered progression, the final totals and every boss's zero HP/defeated state were asserted. The exported storage state contains the earned progress.

| Level | Stage | Verification | Coins | Seconds | Deaths | Dashes | Attempt |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Verdant Hills | Completed through controls | 2/18 | 11.96 | 0 | 6 | 1 |
| 2 | Fernbrook | Completed through controls | 5/12 | 6.08 | 0 | 3 | 1 |
| 3 | Thistle Trail | Completed through controls | 5/12 | 7.15 | 0 | 3 | 1 |
| 4 | Willow Crossing | Completed through controls | 7/16 | 9.57 | 0 | 3 | 1 |
| 5 | Sunset Canyon | Completed through controls | 4/20 | 13.46 | 0 | 8 | 1 |
| 6 | Copper Ferry | Completed through controls | 7/16 | 11.58 | 0 | 2 | 1 |
| 7 | Falling Mesa | Completed through controls | 8/17 | 11.52 | 0 | 3 | 1 |
| 8 | Sunbreak Gorge | Completed through controls | 11/20 | 19.52 | 1 | 3 | 1 |
| 9 | Frostwood | Completed through controls | 6/12 | 7.45 | 0 | 2 | 1 |
| 10 | Glacier Steps | Completed through controls | 8/17 | 12.12 | 0 | 2 | 1 |
| 11 | Crystal Peaks | Completed through controls | 14/22 | 22.38 | 1 | 4 | 1 |
| 12 | Whiteout Pass | Completed through controls | 13/24 | 17.15 | 1 | 2 | 1 |
| 13 | Ember Banks | Completed through controls | 8/13 | 7.40 | 0 | 1 | 1 |
| 14 | Cinder Lift | Completed through controls | 9/17 | 12.33 | 0 | 4 | 1 |
| 15 | The Furnace | Completed through controls | 14/20 | 12.75 | 0 | 1 | 1 |
| 16 | Molten Citadel | Completed through controls | 16/25 | 18.00 | 1 | 2 | 1 |
| 17 | The Gatehouse | Completed through controls | 9/17 | 11.16 | 0 | 4 | 1 |
| 18 | Bell Tower | Completed through controls | 11/19 | 13.33 | 0 | 1 | 1 |
| 19 | Obsidian Keep | Completed through controls | 14/25 | 16.73 | 0 | 2 | 1 |
| 20 | The Hollow Crown | Completed through controls | 12/18 | 27.55 | 2 | 5 | 1 |
| 21 | Toxic Entrance | Completed through controls | 8/13 | 7.76 | 0 | 2 | 1 |
| 22 | Venom Vines | Completed through controls | 12/19 | 12.46 | 0 | 2 | 1 |
| 23 | Forgotten Swamp | Completed through controls | 12/20 | 14.72 | 1 | 3 | 1 |
| 24 | The Poison Labyrinth | Completed through controls | 16/26 | 19.60 | 4 | 4 | 1 |
| 25 | Poison Queen | Completed through controls | 6/12 | 20.73 | 1 | 3 | 1 |
| 26 | Electric Gateway | Completed through controls | 11/19 | 14.70 | 2 | 3 | 1 |
| 27 | Laser Corridor | Completed through controls | 14/21 | 17.12 | 1 | 3 | 1 |
| 28 | Mechanical Nightmare | Completed through controls | 15/25 | 18.90 | 1 | 3 | 1 |
| 29 | The Final Gauntlet | Completed through controls | 16/27 | 20.88 | 1 | 3 | 1 |
| 30 | Thunder Titan | Completed through controls | 13/18 | 37.73 | 0 | 3 | 1 |

Earlier controller attempts stalled on an armored knight. The runner's movement strategy was corrected to use the existing jump/stomp opening. Those attempts are retained in earlier local JSON logs. The table above reports the completed candidate run.

## Boss and challenge checks

The campaign and a separate legitimate Boss Rush clear observed every attack tier.

| Boss | Verified attack sequence |
| --- | --- |
| The Hollow Crown | Shockwave, falling sigils, crownfall |
| Poison Queen | Spore mark, venom sweep, spore bloom |
| Thunder Titan | Low shockwave, lightning rods, impact and pulse |

The boss arenas retain their warning, active and recovery timings. Bosses block hits while guarded, expose during openings, and gate the finish flag until defeated. Boss Rush was recorded with ordinary inputs through all three arenas. Hardcore, Nightmare, Time Trial and No-Death each received a legitimate Level 1 clear. Their record isolation, unlock conditions, retry behavior, outfits and transitions were also exercised by the browser regression suite.

## Automated checks

| Check | Actual result |
| --- | --- |
| Node suite | 30 passed, 0 failed |
| Production build | Passed with Vite |
| Browser smoke suite | All 30 stage loads and staged finish wiring, boss phases, challenge records, outfit persistence and transitions passed |
| Keyboard gameplay | All 30 stages cleared through normal inputs |
| Ninja browser suite | Jump, no double jump, ground dash distance/cooldown, one air dash, landing reset, wall collision, active trap damage, combo buffering/damage, charge limit/refill and scene cleanup passed |
| Multitouch | Move + jump + attack with three fingers, move + jump + dash, move + attack, slide transfer, cancellation, fast taps and buffered jump passed |
| Responsive controls | 320×568, 360×640, 390×844, 412×915, 568×320 and 844×390 passed. Large left-handed layouts also stayed in bounds. Action targets measured at least 44×44 CSS pixels |
| Reduced motion | Idle/coin/tree motion suppression and retained action cues passed in emulation |
| Save compatibility | Migration/unit fixtures passed. A legacy 20-stage record shape written through the existing v2 desktop app was read by the candidate with settings intact |
| Offline Electron | Local audio, keyboard movement, all 30 offline loads, save/mute persistence after relaunch, blocked external fetch and zero external gameplay requests passed |
| Security audit | npm reported 0 vulnerabilities |
| Review gallery | 17 clips, frame stepping, play/pause, speed controls, images and video metadata checked |

Matched screenshots deliberately stage the player and camera to compare art. Isolated collision checks stage situations to exercise a particular rule. Their results are distinct from the legitimate campaign and Boss Rush evidence.

## Performance

The comparison uses the saved Shadow Ninja prototype build and the private candidate on the same development machine. Desktop samples use 1200×850. Phone samples use 839×393 with 4× Chromium CPU throttling. Each sample measures approximately 4.8 seconds. Level 1 runs normal movement, jumping and combat. Level 30 stages a phase-three impact workload and uses normal left movement to dodge it. That controlled setup is performance evidence and does not count as a boss playthrough.

Input latency is a single event-to-observed-movement measurement in the renderer. It excludes physical display and touchscreen latency.

| Build | View | Level | FPS | p95 frame ms | Input ms | Frames ≥50 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| prototype | desktop | 1 | 60 | 16.9 | 26 | 0 |
| prototype | desktop | 30 | 60 | 16.9 | 50 | 0 |
| candidate | desktop | 1 | 60 | 16.8 | 15 | 0 |
| candidate | desktop | 30 | 60 | 16.9 | 24 | 0 |
| prototype | phone emulation | 1 | 47.1 | 33.4 | 26 | 3 |
| prototype | phone emulation | 30 | 46.8 | 33.4 | 19 | 2 |
| candidate | phone emulation | 1 | 47.7 | 33.4 | 27 | 0 |
| candidate | phone emulation | 30 | 46.5 | 33.4 | 54 | 3 |

The final matched candidate measured 60 FPS on desktop and 46.5–47.7 FPS in 4× CPU emulation, with similar frame pacing to the prototype. A separate live burst-heavy Titan stress sample measured 41.4 FPS and a 50 ms p95 frame time, compared with 45.3 FPS and 33.5 ms for the prototype. Those encounters diverged in damage and particle events. The raw stress sample is retained alongside the matched samples.

The hero atlas uses approximately 2.73 MiB of uncompressed RGBA pixels per cached outfit. Three scene re-entries retained the same cached atlas, an empty projectile pool at start and stable 197-object display lists. Particle measurements cover JavaScript and Canvas submission time, not GPU execution.

## Build evidence

Current JavaScript bundle `index-JWbRBuFU.js`.

SHA-256 `4c3ccdf80c8d9a01dd6559f5d386f4eba1964d4899a440c6c55d7712413fd6d6`.

The full campaign used the final movement/combat code before the last presentation-only cache, culling and crown-padding adjustments. The subsequent checks cover those rendering adjustments, production build output, stage rendering, offline loads, gallery media and matched performance. The review manifest identifies the final source commit.

## Remaining limits

- Physical phones, iOS Safari and human difficulty testing remain unverified. The measurements above are desktop Chromium and phone emulation.
- Exhaustive speedrun routes, every possible dash-assisted shortcut and all 560 coin routes have not been proven. The confirmed ledge-to-air dash chain is fixed. The cleared route still uses bridge ledges, active hazards and locked boss objectives.
- Challenge gameplay coverage consists of one stage in each modifier mode and the full Boss Rush. Full 30-stage runs of every modifier remain outside the completed test matrix.
- The hero deliberately keeps the original 12×18 hitbox. Its larger drawing can overlap scenery before the physics body contacts it. Some legacy decorative props remain, and humanoid enemy variants share animation families.
- Low-end mobile stress performance needs physical-device profiling. The stressed sample above falls below 60 FPS.
- Electron was run from the local source build. A new Windows installer and installer upgrade path were not built or tested for this candidate.
- Final visual quality and play feel await user review. The candidate is prepared for private review.

## Reproduction

Run `npm ci`, `npm run dev`, `npm test`, `npm run test:browser`, `npm run test:touch`, `npm run test:campaign`, `npm run test:ninja`, `npm run build` and `npm run test:desktop`. Microsoft Edge must be available for the browser tools.

Use `PIXEL_TEST_URL` to select a production preview and `PIXEL_USE_DASH=1` for the campaign dash route. `PIXEL_REPORT` chooses the campaign JSON output. `PIXEL_REVIEW_DIR` chooses review media and benchmark output. `npm run test:performance` accepts `PIXEL_BASELINE_URL` for a separately served prototype build.
