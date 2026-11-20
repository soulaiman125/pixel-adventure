# Forgotten Swamp review guide

Play stage 23 from Level Select with a profile that has unlocked Forgotten Swamp.

Open **Settings → Forgotten Swamp and boss effects** to switch each effect independently. The game applies changes when it loads a stage. The settings persist in the browser or desktop profile. A stage can also be started with a temporary URL override.

| Step | Setting | URL switch |
| --- | --- | --- |
| 1 | Surface lighting | `normals` |
| 2 | Dynamic shadows | `shadows` |
| 3 | Layered scenery | `depth` |
| 4 | Color grading and glow | `post` |
| 5 | Stone and water detail | `materials` |
| 6 | Detailed animation and reactive foliage | `motion` |
| 7 | Boss finishers | `finisher` |
| 8 | Forgotten Swamp death limit | `retryLimit` |

For example, `?swamp=normals,shadows` enables those two switches for the current URL. Use `?swamp=none` to compare with the original rendering and replay rules. Remove the query to restore the saved settings.

Surface normals come from each sprite frame's silhouette and texture luminance. The Canvas renderer caches shaded frames, composites lights and shadows at the game's internal resolution, and uses a prefiltered copy of the distant backdrop for depth blur. The water reflects the already-rendered scenery with moving scanline offsets. See [the image source and generation prompt](campaign-art-provenance.md#forgotten-swamp).

Boss finishers apply to the campaign bosses. Reduced Motion skips their hit-stop and camera effects. Forgotten Swamp's retry limit applies to normal campaign play. The limit accepts values from 1 to 99 and defaults to 3. Below the limit the current checkpoint, coins and score carry through the respawn. Reaching the limit shows **Stage Failed — Restarting**, then starts a new attempt with a clean stage and counter. The existing campaign progress and best records are retained.

Run the targeted browser suite with the dev server running and Microsoft Edge installed.

```powershell
npm.cmd test
npm.cmd run test:swamp
npm.cmd run build
npm.cmd run test:desktop
```

`test:swamp` exercises each visual switch, configurable retry behavior, and the Poison Queen's finisher with and without Reduced Motion. The test sets up boss and checkpoint scenarios before sending actual keyboard inputs. It also compares frame pacing on the same desktop using desktop and emulated mobile viewports. For separate input-only stage clears, run the campaign runner with `PIXEL_LEVELS=23,25` and `PIXEL_SEQUENCE=0`. Both suites accept `PIXEL_TEST_URL` to target a different server.
