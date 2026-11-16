# Pixel Adventure v3.0 RC1 visual prototype

Run `npm ci` followed by `npm run dev` and open `http://127.0.0.1:5173/`. Choose Play Game for Verdant Hills or select Thunder Titan from a save that has unlocked Level 30. The campaign preserves its play-to-unlock progression.

## Visual scope

- Verdant Hills has a sunlit valley, two parallax depths, textured grass and soil, foliage, coins, stone checkpoints, and a new exit marker.
- The 43-frame hero and 23-frame Brambleback render independently of their existing Arcade Physics bodies. Verdant Hills uses both new sprites. The Titan arena uses the hero and boss redesign. Brambleback's anticipation and lunge poses signal existing contact danger.
- Thunder Titan has a vaulted arena and a segmented phase indicator. The existing low wave, lightning rods, and impact pulse have distinct effects. The warning outlines and damage effects use the original hazard frames. Hit-stop holds the displayed frame while the simulation keeps its original timing.
- The phone HUD groups the stage, coins, score, time, deaths, sound, and pause into one row. The compact layout uses the existing controls, pointer IDs, settings, and safe-area insets. Reduced motion still shows attack and danger cues.

## Comparing builds

The before images use the production bundle extracted from the v3.0.0-rc.1 Windows candidate. The after images use the prototype production build. Each before/after pair uses the same browser viewport, player location, camera origin, and encounter phase. The compact phone HUD makes the canvas taller. The game fits the fixed logical height into the available space, so the revised phone canvas covers fewer horizontal world units at the same camera origin.

Matched screenshots use staged positions to isolate the art. Gameplay verification plays the stages separately with ordinary movement, jumps, and attacks. The setup unlocks stage selection in an isolated save for the Level 30 attempt.

## Verification

- Verdant Hills cleared in 12.93 seconds with two coins and zero deaths. Thunder Titan cleared in 39.82 seconds with twelve coins and one death. The run saw the shockwave, lightning rods, and impact pulse.
- The comparison verified a 12 × 18 hero body and identical enemy body dimensions, patrol starts, and coin counts in both builds. The existing combat tests exercise directional and distance limits on attacks.
- The browser smoke suite loaded all 30 stages and checked challenge modes, outfit persistence, and scene transitions. The touch suite covered move and jump with multiple fingers, sliding between movement buttons, attack while moving, interruption, and six layouts.
- Landscape browser checks observed both animated and reduced-motion paths. Reduced motion held idle, coin, and tree frames while retaining run, jump, fall, and attack cues. Sound, pause, jump, attack, left, and right each measured at least 44 × 44 CSS pixels in the tested landscape viewport.
- The Electron smoke suite launched the local build, rendered all 30 stages offline, measured local audio, and retained saves across restart. The desktop content security policy allows local image sources and continues to block network connections. The WebP assets load through Phaser's image-element loader.

## Frame pacing

Each sample measures approximately 4.5 seconds of browser animation frames. The desktop viewport was 1180 × 790. The phone viewport was 839 × 393 with Chrome CPU throttling set to 4× and reduced motion enabled. Verdant Hills was moving during the sample. The Titan sample used a staged phase-two encounter to compare the same workload. These measurements characterize the development machine and emulation.

| Scene and viewport | RC1 FPS / p95 frame | Prototype FPS / p95 frame |
| --- | ---: | ---: |
| Verdant Hills, desktop | 60.0 / 16.9 ms | 60.0 / 16.9 ms |
| Thunder Titan, desktop | 60.0 / 16.9 ms | 60.0 / 16.9 ms |
| Verdant Hills, emulated phone | 60.0 / 16.9 ms | 59.3 / 16.9 ms |
| Thunder Titan, emulated phone | 57.3 / 18.0 ms | 58.0 / 17.0 ms |

The Titan hall skips the underlying parallax draws while the arena background fully covers them. The recorded samples contained zero frames of 50 ms or longer. Phone verification used browser emulation. Installer packaging and the remaining stage artwork are outside this prototype.

## Asset provenance

Use the WebP assets in `public/prototype/` for the game. The source art was generated with ImageGen, then resized with nearest-neighbor sampling and encoded at 576 × 384. The game bundles 167,742 bytes across the two backdrops. The hero, Brambleback, Titan, terrain, signage, and pickups are authored on an integer pixel grid in `src/game/prototype-*.js`.

### `public/prototype/verdant-valley.webp`

Original file `exec-502e4e96-a2f1-41ac-994c-806dcacd0413.png` in the local Codex generated-image output.

> Use case: stylized-concept. Asset: wide 3:2 or wider game background for Verdant Hills, a detailed original SNES 16-bit style pixel-art forest valley, perfectly side-on, panoramic landscape with no characters, objects, text, frames, UI, coins or foreground ground surface. Huge vista of stepped indigo-teal mountain silhouettes, pine woods and a meadow river in the distance. Sunbeams enter softly from upper left; gold light through leaves, intricate pixel clusters, hand-dithered cool blue mountain haze, rooted trees and river meanders, sophisticated green/gold palette. Keep the entire bottom third atmospheric and slightly dark and low contrast so external gameplay terrain and sprites placed in front are readable. Full bleed edge to edge. Pixel-art detail designed to work clearly at 330x220 game resolution. No existing IP.

### `public/prototype/titan-hall.webp`

Original file `exec-6504d65e-950b-443d-a82c-924523a62644.png` in the local Codex generated-image output.

> Use case: stylized-concept. Wide 3:2 edge-to-edge side-view stage background for a 2D pixel art videogame final boss room, a monumental Thunder Fortress power cathedral. Dark indigo and charcoal industrial stone, giant ribbed arches, little brass insets, thin restrained cyan electrical conduits, angular copper coils, broad empty central bay, cold blue light and purple atmospheric shadows. Hand-dithered pixel clusters, crisp 16-bit tilework and detailed architectural decoration matching a high quality original 1990s console pixel art game. Background only. No monster, no figures, no platform or foreground collision shapes, no letters or HUD, no glowing flood across action area. Leave bottom quarter low contrast and the gameplay band from 60% to 84% vertically open enough for bright silhouettes. Gentle electric light only near the flanks. Excellent readable side-on composition.
