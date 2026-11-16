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
