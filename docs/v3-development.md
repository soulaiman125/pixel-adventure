# Pixel Adventure 3.0 development notes

## Architecture and art audit

The development branch starts at the published v2.0.0 commit. The original campaign has 30 indexed stages and 560 coins. That ordering, the campaign save key, and the input bindings are compatibility boundaries.

- Vite bundles Phaser and local fonts. Menu and gameplay use Phaser Canvas scenes with original pixel textures created at boot or on first entry to a theme. Electron serves the same built files over its restricted local protocol.
- Arcade Physics separates movement, jumps, and one-way platform collisions from the hero artwork. Preserve the 12×18 body, movement acceleration, jump buffering, and coyote time while changing poses.
- Traps already share a deterministic scene clock, though legacy tuples and newer object configs take separate render paths. Extend the object path and keep collision tied to the painted footprint. Existing projectile visuals use pooled game objects, but contact currently ignores solid terrain.
- Expansion enemies have implicit attack state in timer fields. New monsters need explicit wind-up, attack, and recovery states and must respect nearby obstacles. Existing enemy defeat state and checkpoints need clear retry semantics.
- The two expansion bosses reuse an attack controller. Hollow Crown has two alternating attacks and retains damage after player death. Give it a third phase, and ensure each boss enters each tier before its health can move into a later tier.
- Keep the Normal campaign’s existing versioned storage. Challenge records and earned cosmetics can use their own versioned key, preventing alternate runs from changing Normal unlocks or speed records.
- Mobile controls use pointer capture and independent actions. Preserve those handlers and their saved tuning. Canvas costs grow with viewport width and the number of changing draw objects, so use cached integer-pixel art and bounded effects.
- The v2.0.0 baseline includes 14 Node tests and browser, touch, and Windows offline suites. The earlier legitimate campaign took about 7:56. The short 4× CPU-throttled Level 29 comparison recorded 31.9 FPS and 99.8 ms p95 on the polished build. These are browser-emulation measurements.

## Art direction

Use one low-resolution pixel grid, dark silhouettes against lighter midgrounds, cool shadows, and bright accents for interactable objects. Give all worlds a foreground terrain treatment and distinct landmarks through original code-drawn tiles. Keep the hero’s scarf and motion silhouette recognizable, with a blade visible during attacks. Reserve amber for warning and high-contrast cores for active hazards. Reduced motion keeps the required indicators and controls.

## Implementation milestones

1. Reviewed production history, preserved the campaign and input formats, and established the art direction.
2. Added cached integer-pixel outfits and hero poses, plus seven world-specific landmark sets in the existing parallax layer.
3. Added Shield Knight, Fire Demon, Stone Golem, Shadow Assassin, Venom Stalker, and Thunder Sentinel. New enemies wind up, commit, and recover using scene time. Their shots stop at solid terrain.
4. Added rotating lasers, laser grids, spike pistons, and charged ledges using deterministic warning and live states. Nightmare also adds marked wind zones.
5. Unified all three boss encounters under one phase controller. Each health tier has its own minimum health, including The Hollow Crown’s new third phase.
6. Rebalanced selected encounters in Levels 8, 14–20, and 21–29. The 30 maps keep their order, platform coordinates, and coin counts.
7. Added independent Hardcore, Nightmare, Boss Rush, Time Trial, and No-Death records, custom Boss Rush arenas, and earned outfits.
8. Added a challenge selector and results, saved wardrobe choices, and original boss tracks including a final-phase cue.
9. Extended Node and browser regression suites. Scene loading was verified separately from the legitimate keyboard runs.
10. Built the unsigned 3.0.0-rc.1 Windows package and verified its embedded desktop archive. The published v2.0.0 remains the public download.

## Recommended human playtest

- Play Cinder Lift and The Final Gauntlet without route instructions. Check whether each trap’s warning gives enough time to choose an approach.
- Try re-entering each boss arena after a checkpoint retry. Repeat with muted sound and reduced motion.
- Ride moving ledges on a high-refresh monitor. Check for visible drift while standing still and while preparing a jump.
- On a physical Android phone, try both handed layouts, rotate during a pause, and test sustained play with screen recording disabled.
- Run Hardcore Laser Corridor and Nightmare Poison Queen. Check that challenge results and outfit unlocks agree across reloads.
- Test an in-place installer upgrade with a disposable Windows user and a real v2.0.0 save. Verify shortcuts, progress, preferences, and offline launch.
