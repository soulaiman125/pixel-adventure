# Global visual and performance audit

The starting build was commit `0a7a8d3`. The art direction uses the existing painted world plates and Forgotten Swamp as references for layered depth, directional highlights, and warm or cool light by world. Outlines stay dark enough to separate moving actors from scenery, and emissive effects use a brighter accent than a walkable edge.

| Area | Starting point | Coverage target |
| --- | --- | --- |
| World scenery | Painted campaign plates and hand-built parallax. Forgotten Swamp had the most developed layering, depth blur and reflections. | Keep the strongest compositions and carry their world palette into the foreground. |
| Actors | Authored Shadow Ninja poses and silhouettes. Classic enemies, enemy variants and some later bosses used smaller, flatter regions of color. | Five heroes, outfit and weapon variants, 31 campaign enemy IDs, arena enemies and eight bosses. |
| World surfaces | Shared terrain geometry with noticeably different sprite treatments between the prototype, campaign and swamp. | All twelve worlds with consistent silhouette, walkable lip and facing detail. |
| Collectibles | Coins and markers used flat fills and multiple art families. | Consistent gloss, silhouette and state changes across campaign and side modes. |
| Interface | Strong landing art and layout. In-game ability status still relied on text badges and mixed symbols. | A cohesive play HUD with readable icons and clearly distinguishable ready and cooldown states. |
| Effects | Working finisher and readable hazards. Basic bursts were loose pooled rectangles and some powers lacked a coherent visual material. | Keep hazard boundaries and timings while polishing hits, death, abilities and the existing finisher. |

## Repeatable checks

Run `node test/visual-profile.mjs` with Edge installed and a local game server. Set `PIXEL_TEST_URL` for a production preview and `PIXEL_VISUAL_REPORT` for the report directory. `PIXEL_VISUAL_PASS` names the output for each pass. Each run uses movement, jumping, attacks and projectiles in Verdant Hills, Forgotten Swamp, Survival and the final arena. The boss scenario sets up its late phase for consistent rendering measurements. This suite is separate from the input-only campaign runner.

Frame intervals are 4.1-second browser `requestAnimationFrame` samples on one Windows desktop. The mobile stress case uses an 844 × 390 viewport with 4× Chromium CPU throttling. Physical device performance requires its own test.

| Gate | Verdant desktop | Swamp at 4× throttle | Survival desktop | Final boss desktop |
| --- | ---: | ---: | ---: | ---: |
| Original build | 60.0 FPS | 17.8 FPS | 60.0 FPS | 60.0 FPS |
| 1. Actor art | 60.0 | 22.6 | 60.0 | 60.0 |
| 2. Animation | 60.0 | 25.3 | 60.0 | 60.0 |
| 3. Lighting and shadows | 60.0 | 31.6 | 60.0 | 60.0 |
| 4. Materials and collectibles | 59.8 | 28.9 | 60.0 | 60.0 |
| 5. UI and touch icons | 57.1 | 39.1 | 60.0 | 60.0 |
| 6. Effects | 60.0 | 30.1 | 60.0 | 60.0 |
| 7. Final optimization | 60.0 | 36.7 | 60.0 | 59.8 |

Final Forgotten Swamp reached 60.0 FPS in the same emulated phone viewport with throttling disabled. The six-enemy Survival fixture reached 60.0 FPS. Both had no intervals of 50 ms or more. The 4× case still had 14 such intervals, down from 43 in the original build. Its 95th-percentile interval fell from 100.1 to 50.0 ms. Swamp stage-entry latency in the same stress scenario increased from 1.65 to 2.55 seconds during these samples.

For the two extra cases, set `PIXEL_VISUAL_CASES=swamp-touch-native,survival-six`. The six-enemy fixture uses the existing Survival wave spawner. After the final landmark and secret-cache polish, Verdant Hills and all five new realm scenarios averaged 60 FPS on desktop.

## Shared rendering code

- `actor-art.js` defines biome light colors and the dense Canvas pen. Atlases use 1.5× source sampling for the playable sprites and 2× for most other actors and portraits, with original world dimensions for movement and collisions.
- `frame-tracks.js` adds inbetweens to the pose data. Cosmetic animation frames are independent of combat timers.
- `lighting.js` generates normal data from sprite relief. It bounds shaded variants by memory and prepares only a few new variants per frame. `projected-shadows.js` bakes fixed geometry once and projects moving actors and platforms during play.
- `world-materials.js` defines twelve biome palettes and shared painters for terrain, vegetation, ruins and coins. The authored swamp layers continue to use their own scene presentation.
- `texture-budget.js` trims unused generated atlases between scenes. Transient bursts share one Phaser Graphics object with bounded particle and pulse pools.
