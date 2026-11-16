# Shadow Ninja prototype

Run `npm ci` and `npm run dev` from the project. Open [Verdant Hills](http://127.0.0.1:5173/?shadow=verdant) or the [training arena](http://127.0.0.1:5173/?shadow=arena), then choose the Shadow Ninja button. The regular Play Game button starts the original campaign with its existing hero and saves.

For a private local build, run `npm run build -- --mode shadow` and `npm run preview`. The training arena and timing overlay are available in the Vite development server. The standard build offers the regular campaign. Numbered prototype URLs, such as `?shadow=30`, select an independent compatibility run while the prototype is available.

## Controls and timing

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A/D or arrows | Left and right |
| Jump | Space, W or up | Jump |
| Katana | X or J | Attack |
| Shuriken | Z or K | Star |
| Dash | C or Shift | Dash |
| Pause | Esc | Pause |

Ground dash uses a 155 ms duration and a 475 ms cooldown from the start of the dash. An airborne sequence gets one air dash. A solid landing re-arms it. The 12 × 18 Arcade Physics body stays independent of the sprite. Dash has no damage immunity. Solid walls stop it, airborne dash suspends gravity for its duration, and the standard precision jump still supports the original coyote time and input buffer.

| Katana strike | Active window | Total time | Damage |
| --- | ---: | ---: | ---: |
| Horizontal | 48–105 ms | 182 ms | 10 |
| Rising diagonal | 60–135 ms | 215 ms | 12 |
| Heavy finisher | 150–229 ms | 350 ms | 20 |

The combo queues one follow-up during late swing or recovery. Each strike has its own directional window and can hit each target once. Attack and throw recoveries gate dash. Hit-stop holds the displayed pose for a few frames while physics and the boss timer remain continuous. Enemy guard rules and boss health thresholds still apply.

The rotating shuriken launches after the throw wind-up and collides along its swept horizontal path. It has three charges and refills one every 2.1 seconds. Solid terrain and stage boundaries absorb it. Environmental laser fields can damage the player and the projectile travels through them. Each boss opening accepts up to one shuriken hit and still honors the existing health floors. Charges persist through checkpoint respawn and reset at the beginning of a fresh stage.

## Artwork

The game generates the atlas from 76 original, articulated pixel poses across 17 clips. Limbs, blade tips, hood position, and stance are authored for individual frames. The scarf follows the pose and facing. The 112 × 80 cells reserve space for the scarf and sweeping katana arcs. The standing figure is narrower than the full cell. Art renders separately at gameplay scale with a fixed feet anchor. A second four-frame sheet contains the spinning projectile.

The gallery uses frames exported from the runtime atlas. Before and after images use the same desktop or phone viewport, player position, and camera origin in Verdant Hills. The demonstration clips use live input from staged arena positions. The spawn-to-flag verification runs are separate.

## Verification

- Verdant Hills cleared in 12.93 seconds with two coins and zero deaths. Thunder Titan cleared in 39.93 seconds with twelve coins and one death. Both runs started at the stage spawn and used ordinary keyboard inputs. The Titan run visited all three attack phases and confirmed zero HP and the defeated state before the finish.
- The training arena confirmed ground dash travel and cooldown, normal jump, no double jump, one air dash per landing, wall collision, active trap damage, respawn, katana timing and damage, shuriken charges and refill, and projectile cleanup on scene restart.
- Targeted staged checks covered the moving platform and poison pool in Forgotten Swamp, Poison Queen's guard and finish gate, the Laser Corridor grid, and Mechanical Nightmare's timed wall. Campaign layouts and progression data stay on the existing stage definitions.
- Shuriken stopped on a solid wall and the world boundary, crossed a non-solid laser field, and defeated a flying target on a lined-up throw.
- The standard build, 27 unit tests, browser campaign smoke suite, and touch regression suite passed. The Shadow Ninja browser checks covered reduced motion, three-finger movement, jump and dash, and large left-handed controls at four phone viewport sizes.
- The private Windows build ran in Electron offline. A normal throw spent a charge. Progress and mute persisted after closing and relaunching the app. Request monitoring saw zero external requests during the check. The training arena and debug overlay are excluded from the production JavaScript bundles.

## Performance

These were approximately five-second samples of moving, jumping, and attacking in Verdant Hills. Shadow Ninja also used dash and throw during the samples. The phone viewport was 839 × 393 with 4× CPU throttling. The input measurement is keyboard event to the first observable movement in the renderer.

| View | Previous hero FPS / p95 / input | Shadow Ninja FPS / p95 / input |
| --- | ---: | ---: |
| Desktop Chromium | 60 / 16.8 ms / 23 ms | 60 / 16.8 ms / 28 ms |
| Phone emulation | 60 / 16.9 ms / 32 ms | 60 / 16.9 ms / 28 ms |

Particle Canvas calls averaged 0.004 ms per frame on desktop and 0.018 ms on the emulated phone with Shadow Ninja. The measurement covers JavaScript and Canvas submission on the CPU. The 896 × 800 character atlas accounts for approximately 2.73 MiB of uncompressed RGBA pixel storage. Three scene re-entries each started with 197 display objects, an empty projectile pool, and the same cached atlas.

Physical-device play, full 30-stage balance testing with dash, and installer packaging are outside this prototype. A future campaign integration should review dash-assisted shortcuts and tune attack balance across the full difficulty curve.
