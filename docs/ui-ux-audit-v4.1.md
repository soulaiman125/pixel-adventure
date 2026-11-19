# Pixel Adventure 4.1 · Read-only UI/UX audit

**Audit date** 19 November 2026 · **Candidate** 4.0.0-rc.1  
**Branch** `feature/v4-legends-of-shadows`  
**Commit** `e2b627a52c0374e602266d13b1ab77363e87c1d2`

[Private audit gallery](http://127.0.0.1:4231/) · [Control ledger CSV](http://127.0.0.1:4231/controls.csv) · [Audit evidence manifest](http://127.0.0.1:4231/audit-data.json)

## 1. Executive summary

The highest-impact problems sit at entry and between screens. **Play Game** clears the active adventure's results without a separate Continue or confirmation. The title layout clips lower destinations and release links. A controller can enter Pause but cannot resume from it. The boot screen accepts actions before the game can respond, and nested Back paths discard context. These are the Phase 2 priorities.

The campaign art, five animated hero previews, ordinary keyboard gameplay and multi-contact touch controls provide a solid foundation. Native dialogs provide reasonable modal semantics. In the encounter probes, named meters, rank text and checkpoint messaging already give useful feedback. The redesign should preserve those strengths and the original pixel art.

| Metric | Evidence |
| --- | --- |
| Screen inventory | 54 observed or source-inspected existing screens/states. 5 missing, 1 inaccessible by the specified route, and 2 optional entries N/A. The inaccessible state is included in the existing count. |
| Interactive inventory | 289 distinct controls exercised across 369 probe cases. 8 confirmed broken controls or contextual affordances. |
| Responsive coverage | 11 viewport sizes, 338 screenshots, 3 recorded reproductions, 6 distinct responsive defects. |
| Issue priority | P0 0 · P1 5 · P2 10 · P3 3 |

### Scope and method

- The branch and working tree were clean at entry. The served production JS matched the recorded candidate SHA-256 `a979fe136daf5e15d9aaca4aeb428ed7406b6c4b4dd8544d1a75249a6b5f5715`. Audited the existing bundle, HTML, CSS, save adapters, scene callbacks and Electron wrapper. Project production assets were served read-only on loopback.
- Microsoft Edge and Playwright exercised real controls, changed settings, walked to Village stations, opened all 60 level tiles and all 12 world jumps, and checked both actual input effects and resulting destinations. Fresh, partially progressed, and completed profiles were isolated browser contexts. Historical QA records and seeded points or coins made late state and purchases reachable. Some results and boss-HUD screenshots were staged in these profiles to isolate UI; they do not represent full gameplay clears. One local fixture separately dropped the bundle request to inspect boot failure.
- Touch contacts were emulated, including a four-contact move/sprint/jump/attack sequence. Standard gamepad events came from a simulated device. Native Electron ran against a new temporary profile with network disabled. Development-only Training Hall and practice-grant controls ran from a scratch checkout of the same commit.
- Layout captures use the actual interface. Where browser automation scrolls an element into view, the action can be verified separately from ordinary pointer reachability. The landscape evidence includes mouse and wheel interaction at the raw viewport coordinates.
- The gallery and test evidence were written outside the game repository. This report is the sole addition in that repository. Existing gameplay files, configuration, assets and user saves were preserved.

## 2. Current application architecture

| Layer | Current implementation | Audit implication |
| --- | --- | --- |
| Renderer | Phaser 3 Canvas draws the title scene, gameplay, Village, pixel art, entities, effects and world-space camera. `MenuScene` and `PlatformerScene` share the shell. | Keep scene physics, rendering and offline bundle layout outside visual navigation work. |
| DOM | `index.html` owns the persistent shell, HUD, mobile button scaffolding and native dialogs. `src/main.js` populates worlds and stages and synchronizes DOM with the current game scene. | Native dialogs and existing browser semantics are reusable. Context, focus and launch rules currently live in disparate callbacks. |
| Expansion UI | `src/game/legends-ui.js` creates a modal and replaces its body for hero selection, skill nodes, equipment, cosmetics, stories and replay options. It also owns its controller polling. | Body replacement removes focus after purchases. Dialog view names and their entry points lack a shared origin stack. |
| Input and settings | `controls.js` maps bindings and Standard pad gameplay. `touch-controls.js` tracks pointer IDs. `shadow-ui.js` and `touch-settings.js` build preferences and remap panels. | The touch architecture already supports concurrent holds. Menu navigation needs an input layer that also runs when a scene is paused or absent. |
| Presentation | `src/styles.css` combines the core arcade, game HUD, expansion skin, and coarse-pointer/viewport overrides. Stage sizing drives Phaser aspect through `ResizeObserver`. | The absolute menu and overflow rules create the principal clipping. Several mobile rules compete to determine action dimensions. |
| Saves | Separate local keys for campaign results and bests, preferences, legacy Shadow tiers, challenge records, Ultimate feats and the v4 Legends profile. | UI may read through adapters. Continue, New Adventure, refund and mode transitions must retain the existing key boundaries. |
| Windows | Electron reads the same compiler output at `pixel://game/index.html` behind a restricted renderer and networking policy. | Treat boot, fonts, images and audio as bundled local dependencies. The browser's release shortcuts are hidden in this host. |

**Relevant source** [HTML shell](../index.html) · [Application orchestration](../src/main.js) · [Legends modals](../src/game/legends-ui.js) · [Styles](../src/styles.css) · [Electron wrapper](../desktop/main.cjs)

## 3. Screen inventory

**Accessible** indicates an available UI and a working representative path. **Partial** indicates incomplete behavior or communication. **Inaccessible** is scoped to the recorded input/layout. **Missing** identifies a requested experience for which no screen exists. **N/A** covers optional features outside the observed product. Per-device variations usually count once. The short-landscape lower title state is listed separately because it makes destinations inaccessible.

| Screen or state | Status | Observation | Evidence |
| --- | --- | --- | --- |
| Initial startup / cold title | Partial | Static title appears before Phaser is ready. UI-04 and UI-16. | [Capture](http://127.0.0.1:4231/shots/functional/cold-entry.png) |
| Between-stage loading cue | Accessible | Loading cue observed with scene start briefly held in an isolated fixture. | [Capture](http://127.0.0.1:4231/shots/supplement/between-stage-loading.png) |
| Title and main navigation | Partial | Title and hub are combined. Some controls escape the frame. | [Capture](http://127.0.0.1:4231/shots/1920x1080/main-menu.png) |
| Lower title actions in short landscape | Inaccessible | Combat Trials and Legends are clipped for normal pointer/touch at 844 × 390. Keyboard stepping can scroll the hidden ancestor. | [Capture](http://127.0.0.1:4231/shots/844x390/main-menu.png) |
| Continue Game | Missing | No dedicated action, resume selector or equivalent on the title. | Source inventory |
| New Adventure action | Partial | Play Game creates a new active run without a distinct start-over label. | [Capture](http://127.0.0.1:4231/shots/functional/after-play-game.png) |
| New Adventure confirmation | Missing | No prompt, impact explanation, or cancel before active totals clear. | Source inventory |
| Browser startup error / offline recovery view | Missing | Blocked boot leaves the static title. Browser-based offline journey differs from local Electron. | [Capture](http://127.0.0.1:4231/shots/functional/startup-offline.png) |
| Legends of Shadows hub | Accessible | Secondary launcher with eight destinations. | [Capture](http://127.0.0.1:4231/shots/legends/legends-main.png) |
| Controls from title | Accessible | Back to Menu works; wording is Shadow-specific. | [Capture](http://127.0.0.1:4231/shots/functional/menu-controls.png) |
| First-run Controls | Partial | Cancel and Start Level work. Opens near the bottom on small screens. | [Capture](http://127.0.0.1:4231/shots/functional/first-run.png) |
| Pause | Partial | Mouse and keyboard work. Standard pad cannot leave by itself. | [Capture](http://127.0.0.1:4231/shots/campaign/paused.png) |
| Settings | Partial | Scrollable; on some screens opens at Done, below top settings. | [Capture](http://127.0.0.1:4231/shots/edges/settings-start-390x844.png) |
| Audio settings | Accessible | Sound switch and two sliders are active, with local preferences. | [Capture](http://127.0.0.1:4231/shots/1920x1080/settings.png) |
| Keyboard remapping | Accessible | All 12 actions remap. The entry sits under Mobile Controls. | [Capture](http://127.0.0.1:4231/shots/functional/keyboard-remap.png) |
| Remapping conflict / reset status | Accessible | Duplicate key rejection and default restore work. Help text does not update. | [Capture](http://127.0.0.1:4231/shots/functional/binding-conflict.png) |
| Mobile settings and controls ordering | Partial | Presets, swap, opacity and handedness persist. Size has a fixed-height action grid. | [Capture](http://127.0.0.1:4231/shots/390x844/advanced-controls.png) |
| Shadow refund confirmation | Accessible | Two-step confirm and Escape; no in-panel Cancel. | [Capture](http://127.0.0.1:4231/shots/legends/refund-confirmation.png) |
| World selection and locks | Partial | Twelve jump buttons in Level Select, with clear counts. They scroll to sections, including fully locked worlds. | [Capture](http://127.0.0.1:4231/shots/campaign/all-worlds.png) |
| Level Select and records | Accessible | All 60 tiles launched under a historical-completion fixture. Fresh profile has one enabled stage. | [Capture](http://127.0.0.1:4231/shots/functional/levels-fresh.png) |
| Character selection and hero details | Accessible | Five portraits verified, animated preview, meters, applied hero and persistence. | [Capture](http://127.0.0.1:4231/shots/legends/hero-flame.png) |
| Chooser launched from Level Select | Partial | Hero choice works; Back opens the Legends hub over the still-open list. | [Capture](http://127.0.0.1:4231/shots/campaign/levels-back-hub.png) |
| Shadow Skills | Accessible | Six upgrade tracks exercised and refund confirmed. | [Capture](http://127.0.0.1:4231/shots/legends/shadow-full-tree.png) |
| New hero Skill Trees | Partial | Four trees with 18 nodes each. All purchases update state; keyboard focus is lost. | [Capture](http://127.0.0.1:4231/shots/legends/skills-flame.png) |
| Hero Mastery | Partial | Displayed inline as level and XP. No dedicated progression path or visible next milestone. | [Capture](http://127.0.0.1:4231/shots/legends/hero-mastery-cosmetics.png) |
| Blacksmith weapon management | Accessible | Unlock, equip and hone observed for all heroes. No detailed stat comparison. | [Capture](http://127.0.0.1:4231/shots/legends/forge-upgraded.png) |
| Weapon / paid upgrade confirmation | Missing | Direct spend actions; legacy refund uses its own confirmation. | Source inventory |
| Outfit Shop / hero cosmetics | Accessible | Default and Mastery trim controls. Settings contains a separate legacy outfit selector. | [Capture](http://127.0.0.1:4231/shots/legends/hero-mastery-cosmetics.png) |
| General equipment inventory | N/A | Weapon/style management exists. No general inventory system was found or assumed. | Source inventory |
| Ninja Village | Accessible | Playable hub with traversal, six stations and pause. | [Capture](http://127.0.0.1:4231/shots/legends/village-entry.png) |
| NPC prompts and dialogue | Accessible | Station-dependent Talk button and E. Multiple shop panels include NPC text; some toasts run under the modal. | [Capture](http://127.0.0.1:4231/shots/legends/village-portal.png) |
| Training Dojo | Accessible | Live training level starts from village and Blacksmith. | [Capture](http://127.0.0.1:4231/shots/legends/training-dojo.png) |
| Development-only Train as Shadow Ninja entry | Accessible | Probed on an isolated checkout of the exact commit; gated out of production. | [Capture](http://127.0.0.1:4231/shots/training/developer-entry.png) |
| Training debug HUD and grant points state | Accessible | Runtime grant is isolated; diagnostics not shipped in production. | [Capture](http://127.0.0.1:4231/shots/training/training-points.png) |
| Quest Board | Accessible | All four reward claim paths and claimed locks acted on in a fixture. | [Capture](http://127.0.0.1:4231/shots/legends/quest-board-ready.png) |
| World Portal | Partial | Opens the level list; closing exits Village context. | [Capture](http://127.0.0.1:4231/shots/legends/portal-stage-list.png) |
| Hall of Legends | Accessible | Shows rematch options and NG+ eligibility. Observed both locked and unlocked. | [Capture](http://127.0.0.1:4231/shots/campaign/hall-unlocked.png) |
| Dedicated in-Village station fast travel | Missing | World Portal and title shortcuts exist; no station-to-station travel interface. | Source inventory |
| Prologue storyboard | Accessible | All three chapters, Skip and final Return observed. | [Capture](http://127.0.0.1:4231/shots/legends/prologue-2.png) |
| Gameplay HUD | Accessible | Stage, coins, score, time, deaths, Pause and cooldown display. | [Capture](http://127.0.0.1:4231/shots/1920x1080/gameplay.png) |
| Mobile touch HUD | Partial | 11 actions plus 4-contact input validated by emulation; configured height semantics are inconsistent. | [Capture](http://127.0.0.1:4231/shots/platform/touch-four-finger.png) |
| Checkpoint, respawn and narrative status | Partial | Short checkpoint feedback works; long story toast overflows. | [Capture](http://127.0.0.1:4231/shots/edges/story-toast-390x844.png) |
| Boss health and phase HUD | Partial | Health meter named, phase and readiness semantics limited. Crowded in short landscape. | [Capture](http://127.0.0.1:4231/shots/568x320/boss.png) |
| Level Complete and rankings | Accessible | Results show stats and rank; replay, hero switching, next and exit work. | [Capture](http://127.0.0.1:4231/shots/campaign/normal-clear.png) |
| Campaign Victory and ending | Accessible | Fixture confirmed totals, replay, menu and return to Ninja Village. | [Capture](http://127.0.0.1:4231/shots/campaign/victory-epilogue.png) |
| Challenge defeat | Accessible | No-Death Attempt Ended observed. Standard campaign uses checkpoint respawn. | [Capture](http://127.0.0.1:4231/shots/campaign/no-death-defeat.png) |
| Challenges selection | Accessible | All five modes started from chooser in profile; fresh lock state exists. | [Capture](http://127.0.0.1:4231/shots/844x390/challenges.png) |
| Challenge records | Accessible | Inline local best for selected stage. | [Capture](http://127.0.0.1:4231/shots/campaign/trial-record.png) |
| Boss Rush arena and intermediate result | Accessible | First arena and intermediate results verified; original three-boss scope is source-confirmed. | [Capture](http://127.0.0.1:4231/shots/campaign/rush-result.png) |
| Survival Arena | Accessible | Runs directly from title with wave and score overlay. | [Capture](http://127.0.0.1:4231/shots/campaign/survival-run.png) |
| Survival results | Accessible | End Survival Run shows waves, score and best; replay/main menu share results machinery. | [Capture](http://127.0.0.1:4231/shots/campaign/survival-score.png) |
| Combat Trials | Accessible | Local rank explanation, feats and Survival best. | [Capture](http://127.0.0.1:4231/shots/functional/combat-trials.png) |
| Boss Rematch setup | Accessible | Eight cleared bosses, two difficulty options and per-loadout best row. | [Capture](http://127.0.0.1:4231/shots/campaign/hall-unlocked.png) |
| Guardian Defeated | Accessible | End-state fixture triggered the guardian-specific summary. | [Capture](http://127.0.0.1:4231/shots/campaign/rematch-result.png) |
| Daily Challenge setup | Accessible | Local-date rule, stage and reward plus start. | [Capture](http://127.0.0.1:4231/shots/campaign/daily-available.png) |
| Daily result / arena variant | Accessible | Result variant depends on date. Source and available variant were inspected. | [Capture](http://127.0.0.1:4231/shots/campaign/daily-arena-result.png) |
| New Game+ entry and stage state | Accessible | First cycle begins separately after a complete fixture. | [Capture](http://127.0.0.1:4231/shots/campaign/ng-result.png) |
| New Game+ results | Accessible | Mode-specific completion and Next Level action. | [Capture](http://127.0.0.1:4231/shots/campaign/ng-result.png) |
| Offline Electron title / runtime | Accessible | Native temporary profile. Web release links intentionally hidden. Shared UI; native menu auto-hides. | [Capture](http://127.0.0.1:4231/shots/platform/electron-offline-title.png) |
| Controller-specific menu navigation | Partial | Supported within Legends dialog; main menu and Pause lack routing. | [Capture](http://127.0.0.1:4231/shots/platform/pad-stuck-pause.png) |
| Online leaderboard | N/A | The app is offline-friendly and keeps personal bests locally. No backend or online rankings found. | Source inventory |

## 4. Interactive-element inventory

The [complete control ledger](http://127.0.0.1:4231/controls.csv) contains the expected and observed action, destination, accessibility evidence by input, persistence, broken/misleading flags, and feedback for every inventoried control. The [searchable ledger](http://127.0.0.1:4231/#controls) exposes the same fields. Listed selectors include distinct stage tiles, world jumps, chapter actions and hero upgrade nodes. Repeated presentations of the same action are grouped. A verified reproduction can identify confirmed failure. Native controls are not labeled tested merely because a listener exists.

| Control and key | Screen | Observed behavior | Outcome |
| --- | --- | --- | --- |
| Back · back:Blacksmith | Blacksmith | Back returns to Legends hub | Action exercised |
| Equip Heavy Greatsword · equip-alternate | Blacksmith | Switches to owned alternate without spending | Action exercised |
| Equip Katana · equip-standard | Blacksmith | Switches to Katana • Switches to Flame Katana • Switches to Twin Daggers • Switches to Lightning Spear • Switches to Bow | Action exercised |
| Hone Weapon · 18 Coins · hone | Blacksmith | Pays 18 coins and applies upgrade | Action exercised |
| Train · Train | Blacksmith | Starts the same Training Hall | Action exercised |
| Unlock for 25 · Dual Katana · unlock-weapon | Blacksmith | Pays 25 coins and equips Dual Katana • Pays 25 coins and equips Heavy Greatsword • Pays 25 coins and equips Ice Chakrams • Pays 25 coins and equips Thunder Staff • Pays 25 coins and equips Twin Crossbows | Action exercised |
| Next Level · next-level | Boss Defeated / Level Complete! / New Game+ Clear / Results | Starts the following stage with selected hero | Action exercised |
| Choose Hero · choose-from-results | Challenge Complete / Attempt Ended / Boss Defeated / Level Complete! / Guardian Defeated / New Game+ Clear / Survival Complete / Results | Opens selection between stages and Close returns to results | Action exercised |
| Main Menu · clear-main | Challenge Complete / Attempt Ended / Boss Defeated / Level Complete! / Survival Complete / Guardian Defeated / New Game+ Clear / Results | Returns to title | Action exercised |
| Play Again · play-again | Challenge Complete / Attempt Ended / Boss Defeated / Level Complete! / Survival Complete / Guardian Defeated / New Game+ Clear / Results | Restarts current stage | Action exercised |
| Close challenges · challenge-close | Challenges | Close challenges returns to title | Action exercised |
| Mode · challenge-mode | Challenges | Faster traps and fewer checkpoints on unlocked stages. • Added hazards, shorter boss openings, and the final checkpoint only. • Replay a cleared stage for a separate personal best. • One life. Reach the flag for a Flawless badge. • Three bosses back to back. Time and deaths carry across arenas. • Locked. Copy says all three campaign bosses. | Action exercised |
| Stage · challenge-stage | Challenges | Selecting a recorded stage displays saved best | Action exercised |
| Start Challenge · challenge-start | Challenges | Launches chosen mode | Action exercised |
| Back · back:Choose a Hero | Choose a Hero | Back returns to Legends hub | Action exercised |
| Back · hero-back-from-levels | Choose a Hero / Hero chooser from levels / World Portal / Hero chooser / back | Returns to Legends hub with Level Select still open behind it; close × then reveals Level Select. | Defect reproduced |
| Cosmetics · Cosmetics | Choose a Hero / Hero selection | Opens cosmetic preview for Shadow Ninja • Opens cosmetic preview for Flame Samurai • Opens cosmetic preview for Frost Assassin • Opens cosmetic preview for Thunder Ronin • Opens cosmetic preview for Forest Ranger | Action exercised |
| Flame Samurai · hero:flame | Choose a Hero / Hero selection | Shows Flame Samurai portrait, skills and details | Action exercised |
| Frost Assassin · hero:frost | Choose a Hero / Hero selection | Shows Frost Assassin portrait, skills and details | Action exercised |
| Forest Ranger · hero:ranger | Choose a Hero / Hero selection | Shows Forest Ranger portrait, skills and details | Action exercised |
| Shadow Ninja · hero:shadow | Choose a Hero / Hero selection | Shows Shadow Ninja portrait, skills and details | Action exercised |
| Thunder Ronin · hero:thunder | Choose a Hero / Hero selection | Shows Thunder Ronin portrait, skills and details | Action exercised |
| Selected · Shadow Ninja · legend-select | Choose a Hero / Hero selection | Stores Shadow Ninja as selected • Stores Flame Samurai as selected • Stores Frost Assassin as selected • Stores Thunder Ronin as selected • Stores Forest Ranger as selected | Action exercised |
| Skill Tree · Skill Tree | Choose a Hero / Hero selection | Displays skill tree for Shadow Ninja • Displays skill tree for Flame Samurai • Displays skill tree for Frost Assassin • Displays skill tree for Thunder Ronin • Displays skill tree for Forest Ranger | Action exercised |
| Close Combat Trials · awards-close | Combat Trials | Closes Combat Trials | Action exercised |
| Back · back:Daily Challenge | Daily Challenge | Back returns to Legends hub | Action exercised |
| Start Challenge · daily-start | Daily Challenge | Uses local date and starts listed challenge | Action exercised |
| view-victory · view-victory | Final results | Shows all 60 stage totals and epilogue | Action exercised |
| Back to Heroes · Back to Heroes | Flame Samurai Skill Tree / Frost Assassin Skill Tree / Thunder Ronin Skill Tree / Forest Ranger Skill Tree / Hero skill tree | Returns to the same hero | Action exercised |
| Close Legends · Close Legends | Flame Samurai Skill Tree / Hall of Legends / Legends of Shadows / Quest Board / Choose a Hero / Shadow Ninja Skill Tree / Blacksmith / Outfit Shop / Frost Assassin Skill Tree / Thunder Ronin Skill Tree / The first shadow / Forest Ranger Skill Tree / Five travelers / The twelve seals / Daily Challenge / Legends dialog | Closes modal | Action exercised |
| Sure Foot · 1 · node:flame:accel | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Prepared Jump · 3 · node:flame:buffer | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Breathe · 2 · node:flame:chargeWait | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Ledge Step · 3 · node:flame:coyote | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Evasion · 2 · node:flame:dash | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Recover Footing · 2 · node:flame:dashWait | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Weapon Edge · 1 · node:flame:edge | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Force · 1 · node:flame:power | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Keen Shot · 3 · node:flame:projectile | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Field Control · 1 · node:flame:radius | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Weapon Reach · 1 · node:flame:reach | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Focus · 2 · node:flame:reachSpecial | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Ready Stance · 2 · node:flame:recovery | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Repeat Technique · 3 · node:flame:specialWait | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Stride · 1 · node:flame:sprint | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Unsteady Guard · 3 · node:flame:stagger | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Final Form · 3 · node:flame:ultimateWait | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Quick Draw · 2 · node:flame:windup | Flame Samurai Skill Tree / Skill Tree Flame Samurai | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Sure Foot · 1 · node:ranger:accel | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Prepared Jump · 3 · node:ranger:buffer | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Breathe · 2 · node:ranger:chargeWait | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Ledge Step · 3 · node:ranger:coyote | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Evasion · 2 · node:ranger:dash | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Recover Footing · 2 · node:ranger:dashWait | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Weapon Edge · 1 · node:ranger:edge | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Force · 1 · node:ranger:power | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Keen Shot · 3 · node:ranger:projectile | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Field Control · 1 · node:ranger:radius | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Weapon Reach · 1 · node:ranger:reach | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Focus · 2 · node:ranger:reachSpecial | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Ready Stance · 2 · node:ranger:recovery | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Repeat Technique · 3 · node:ranger:specialWait | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Stride · 1 · node:ranger:sprint | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Unsteady Guard · 3 · node:ranger:stagger | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Final Form · 3 · node:ranger:ultimateWait | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Quick Draw · 2 · node:ranger:windup | Forest Ranger Skill Tree / Skill Tree Forest Ranger | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Sure Foot · 1 · node:frost:accel | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Prepared Jump · 3 · node:frost:buffer | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Breathe · 2 · node:frost:chargeWait | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Ledge Step · 3 · node:frost:coyote | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Evasion · 2 · node:frost:dash | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Recover Footing · 2 · node:frost:dashWait | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Weapon Edge · 1 · node:frost:edge | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Force · 1 · node:frost:power | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Keen Shot · 3 · node:frost:projectile | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Field Control · 1 · node:frost:radius | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Weapon Reach · 1 · node:frost:reach | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Focus · 2 · node:frost:reachSpecial | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Ready Stance · 2 · node:frost:recovery | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Repeat Technique · 3 · node:frost:specialWait | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Stride · 1 · node:frost:sprint | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Unsteady Guard · 3 · node:frost:stagger | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Final Form · 3 · node:frost:ultimateWait | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Quick Draw · 2 · node:frost:windup | Frost Assassin Skill Tree / Skill Tree Frost Assassin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Back · back:Hall of Legends | Hall of Legends | Back returns to Legends hub | Action exercised |
| Choose Hero · choose-from-hall | Hall of Legends | Choose Hero opens character selection | Action exercised |
| Defeated boss · Defeated boss | Hall of Legends | Lists eight cleared guardians and allows choosing Eclipse Emperor | Action exercised |
| New Game+ · Finish the campaign · New Game+ | Hall of Legends | Start or resume difficulty cycle and show separate result | Action exercised |
| Rematch difficulty · Rematch difficulty | Hall of Legends | Toggles Veteran/Master and refreshes best record row | Action exercised |
| Start Boss Rematch · Start Boss Rematch | Hall of Legends | Starts isolated Eclipse Emperor rematch | Action exercised |
| Close controls · help-close | How to Play / Controls (first run) | Cancel returns to title without marking tutorial seen | Action exercised |
| Back to Menu · tutorial-done | How to Play / Controls (menu) / Controls (first run) | Back to Menu closes the dialog and restores opener • Start Level enters stage 1 and records tutorial seen | Action exercised |
| Blacksmith · Blacksmith | Legends of Shadows / Legends hub | Opens Blacksmith | Action exercised |
| Daily Challenge · Daily Challenge | Legends of Shadows / Legends hub | Opens Daily Challenge | Action exercised |
| Enter Ninja Village · Enter Ninja Village | Legends of Shadows / Legends hub | Opens the playable Village | Action exercised |
| Hall of Legends · Hall of Legends | Legends of Shadows / Legends hub | Opens Hall of Legends | Action exercised |
| Prologue · Prologue | Legends of Shadows / Legends hub | Opens The first shadow | Action exercised |
| Quest Board · Quest Board | Legends of Shadows / Legends hub | Opens Quest Board | Action exercised |
| World Portal · World Portal | Legends of Shadows / Legends hub | Opens the shared Level Select modal | Action exercised |
| Choose Hero · Choose Hero | Legends of Shadows / Survival Complete / Legends hub | Opens all five selectable heroes • Opens Choose a Hero | Action exercised |
| Train as Shadow Ninja · shadow-play | Level Select / Developer title | Loaded Shadow Training Hall with combat debug HUD. | Action exercised |
| Pause game · pause-button | Level Select / Gameplay | Opens paused state and stops timer | Action exercised |
| Choose Hero · choose-from-levels | Level Select / Legends of Shadows / World and level select | Opens hero chooser above level selection | Action exercised |
| 01 Level 1 Verdant Hills · level:0 | Level Select / Level select | Stage 1 · Verdant Hills | Action exercised |
| 02 Level 2 · Locked Fernbrook · level:1 | Level Select / Level select | Stage 2 · Fernbrook | Action exercised |
| 03 Level 3 · Locked Thistle Trail · level:2 | Level Select / Level select | Stage 3 · Thistle Trail | Action exercised |
| 04 Level 4 · Locked Willow Crossing · level:3 | Level Select / Level select | Stage 4 · Willow Crossing | Action exercised |
| 05 Level 5 · Locked Sunset Canyon · level:4 | Level Select / Level select | Stage 5 · Sunset Canyon | Action exercised |
| 06 Level 6 · Locked Copper Ferry · level:5 | Level Select / Level select | Stage 6 · Copper Ferry | Action exercised |
| 07 Level 7 · Locked Falling Mesa · level:6 | Level Select / Level select | Stage 7 · Falling Mesa | Action exercised |
| 08 Level 8 · Locked Sunbreak Gorge · level:7 | Level Select / Level select | Stage 8 · Sunbreak Gorge | Action exercised |
| 09 Level 9 · Locked Frostwood · level:8 | Level Select / Level select | Stage 9 · Frostwood | Action exercised |
| 10 Level 10 · Locked Glacier Steps · level:9 | Level Select / Level select | Stage 10 · Glacier Steps | Action exercised |
| 11 Level 11 · Locked Crystal Peaks · level:10 | Level Select / Level select | Stage 11 · Crystal Peaks | Action exercised |
| 12 Level 12 · Locked Whiteout Pass · level:11 | Level Select / Level select | Stage 12 · Whiteout Pass | Action exercised |
| 13 Level 13 · Locked Ember Banks · level:12 | Level Select / Level select | Stage 13 · Ember Banks | Action exercised |
| 14 Level 14 · Locked Cinder Lift · level:13 | Level Select / Level select | Stage 14 · Cinder Lift | Action exercised |
| 15 Level 15 · Locked The Furnace · level:14 | Level Select / Level select | Stage 15 · The Furnace | Action exercised |
| 16 Level 16 · Locked Molten Citadel · level:15 | Level Select / Level select | Stage 16 · Molten Citadel | Action exercised |
| 17 Level 17 · Locked The Gatehouse · level:16 | Level Select / Level select | Stage 17 · The Gatehouse | Action exercised |
| 18 Level 18 · Locked Bell Tower · level:17 | Level Select / Level select | Stage 18 · Bell Tower | Action exercised |
| 19 Level 19 · Locked Obsidian Keep · level:18 | Level Select / Level select | Stage 19 · Obsidian Keep | Action exercised |
| 20 Level 20 · Locked The Hollow Crown · level:19 | Level Select / Level select | Stage 20 · The Hollow Crown | Action exercised |
| 21 Level 21 · Locked Toxic Entrance · level:20 | Level Select / Level select | Stage 21 · Toxic Entrance | Action exercised |
| 22 Level 22 · Locked Venom Vines · level:21 | Level Select / Level select | Stage 22 · Venom Vines | Action exercised |
| 23 Level 23 · Locked Forgotten Swamp · level:22 | Level Select / Level select | Stage 23 · Forgotten Swamp | Action exercised |
| 24 Level 24 · Locked The Poison Labyrinth · level:23 | Level Select / Level select | Stage 24 · The Poison Labyrinth | Action exercised |
| 25 Level 25 · Locked Poison Queen · level:24 | Level Select / Level select | Stage 25 · Poison Queen | Action exercised |
| 26 Level 26 · Locked Electric Gateway · level:25 | Level Select / Level select | Stage 26 · Electric Gateway | Action exercised |
| 27 Level 27 · Locked Laser Corridor · level:26 | Level Select / Level select | Stage 27 · Laser Corridor | Action exercised |
| 28 Level 28 · Locked Mechanical Nightmare · level:27 | Level Select / Level select | Stage 28 · Mechanical Nightmare | Action exercised |
| 29 Level 29 · Locked The Final Gauntlet · level:28 | Level Select / Level select | Stage 29 · The Final Gauntlet | Action exercised |
| 30 Level 30 · Locked Thunder Titan · level:29 | Level Select / Level select | Stage 30 · Thunder Titan | Action exercised |
| 31 Level 31 · Locked Lantern Crossing · level:30 | Level Select / Level select | Stage 31 · Lantern Crossing | Action exercised |
| 32 Level 32 · Locked Whispering Stalks · level:31 | Level Select / Level select | Stage 32 · Whispering Stalks | Action exercised |
| 33 Level 33 · Locked The Missing Path · level:32 | Level Select / Level select | Stage 33 · The Missing Path | Action exercised |
| 34 Level 34 · Locked Watch of the Departed · level:33 | Level Select / Level select | Stage 34 · Watch of the Departed | Action exercised |
| 35 Level 35 · Locked Veil of Lanterns · level:34 | Level Select / Level select | Stage 35 · Veil of Lanterns | Action exercised |
| 36 Level 36 · Locked Phantom Gate · level:35 | Level Select / Level select | Stage 36 · Phantom Gate | Action exercised |
| 37 Level 37 · Locked Tidewater Steps · level:36 | Level Select / Level select | Stage 37 · Tidewater Steps | Action exercised |
| 38 Level 38 · Locked Coral Galleries · level:37 | Level Select / Level select | Stage 38 · Coral Galleries | Action exercised |
| 39 Level 39 · Locked The Bell Divers · level:38 | Level Select / Level select | Stage 39 · The Bell Divers | Action exercised |
| 40 Level 40 · Locked The Flooded Court · level:39 | Level Select / Level select | Stage 40 · The Flooded Court | Action exercised |
| 41 Level 41 · Locked Siphon Chambers · level:40 | Level Select / Level select | Stage 41 · Siphon Chambers | Action exercised |
| 42 Level 42 · Locked Abyssal Throne · level:41 | Level Select / Level select | Stage 42 · Abyssal Throne | Action exercised |
| 43 Level 43 · Locked Windward Arrival · level:42 | Level Select / Level select | Stage 43 · Windward Arrival | Action exercised |
| 44 Level 44 · Locked Kitekeeper Ruins · level:43 | Level Select / Level select | Stage 44 · Kitekeeper Ruins | Action exercised |
| 45 Level 45 · Locked Broken Aerie · level:44 | Level Select / Level select | Stage 45 · Broken Aerie | Action exercised |
| 46 Level 46 · Locked Cloudbridge Outpost · level:45 | Level Select / Level select | Stage 46 · Cloudbridge Outpost | Action exercised |
| 47 Level 47 · Locked The Updraft Stair · level:46 | Level Select / Level select | Stage 47 · The Updraft Stair | Action exercised |
| 48 Level 48 · Locked Eye of the Tempest · level:47 | Level Select / Level select | Stage 48 · Eye of the Tempest | Action exercised |
| 49 Level 49 · Locked Signal Rooftops · level:48 | Level Select / Level select | Stage 49 · Signal Rooftops | Action exercised |
| 50 Level 50 · Locked Drone Array · level:49 | Level Select / Level select | Stage 50 · Drone Array | Action exercised |
| 51 Level 51 · Locked Relay Tower Climb · level:50 | Level Select / Level select | Stage 51 · Relay Tower Climb | Action exercised |
| 52 Level 52 · Locked Security Foundry · level:51 | Level Select / Level select | Stage 52 · Security Foundry | Action exercised |
| 53 Level 53 · Locked Blackout Circuit · level:52 | Level Select / Level select | Stage 53 · Blackout Circuit | Action exercised |
| 54 Level 54 · Locked Citadel of Circuits · level:53 | Level Select / Level select | Stage 54 · Citadel of Circuits | Action exercised |
| 55 Level 55 · Locked The Crimson Divide · level:54 | Level Select / Level select | Stage 55 · The Crimson Divide | Action exercised |
| 56 Level 56 · Locked Mirror of Dusk · level:55 | Level Select / Level select | Stage 56 · Mirror of Dusk | Action exercised |
| 57 Level 57 · Locked Throne Road · level:56 | Level Select / Level select | Stage 57 · Throne Road | Action exercised |
| 58 Level 58 · Locked March of the Hollow · level:57 | Level Select / Level select | Stage 58 · March of the Hollow | Action exercised |
| 59 Level 59 · Locked The Last Shadow · level:58 | Level Select / Level select | Stage 59 · The Last Shadow | Action exercised |
| 60 Level 60 · Locked Eclipse Ascension · level:59 | Level Select / Level select | Stage 60 · Eclipse Ascension | Action exercised |
| Challenges · challenge-button | Level Select / Main menu | Fresh challenge panel includes prerequisite messages | Action exercised |
| Settings · settings-button | Level Select / Main menu | Settings opens and Done takes focus | Action exercised |
| ✦ Shadow Skills · skill-tree | Level Select / Main menu | Opens Shadow Skills | Action exercised |
| Sound on · sound-button | Level Select / Main menu | Sound off reflected by switch and stored • Nonzero local Web Audio signal and mute observed in isolated browser. | Action exercised |
| Survival Arena · survival-button | Level Select / Main menu | Starts Moonlit Watch | Action exercised |
| Play Game · play-game | Level Select / Main menu (returning) / Main menu / Cold start / Title / returning player / Startup / web offline | Always starts stage 1 and replaces the active campaign results with null. Stage unlocks and bests remain. • Starts first-run tutorial before level 1 • Click accepted on an enabled button; it is lost when bundle initializes, and no loading status was shown | Defect reproduced |
| Controls · help-button | Level Select / Main menu / Gameplay | Opens How to Play with Back to Menu • How to Play pauses directly and returns to level | Action exercised |
| Combat Trials · combat-awards | Level Select / Main menu / Title / responsive navigation | Trial thresholds and personal Survival best appear | Defect reproduced |
| Download for Windows · download-link | Level Select / Main menu / Title / responsive navigation | Correct destination opened in new tab once focused/scrolled into view. Remote GET intercepted. | Defect reproduced |
| Legends of Shadows · legends-button | Level Select / Main menu / Title / responsive navigation | Opens expansion hub | Defect reproduced |
| GitHub Repository · repo-link | Level Select / Main menu / Title / responsive navigation | Correct destination opened in new tab once focused/scrolled into view. Remote GET intercepted. | Defect reproduced |
| Level Select · level-select | Level Select / Main menu / World and level select | Only stage 1 can be started in a fresh save • {"scroll":0,"focus":"0","top":406.7449951171875,"bottom":477.66497802734375,"dialogTop":23.579986572265625,"ratio":1} | Action exercised |
| World Portal · Talk · station:worlds | Level Select / Ninja Village / World Portal / Hero chooser / back | Portal opens the world list; Escape returns to title and discards Village position and entry context. | Defect reproduced |
| Attack · touch:attack | Level Select / Touch HUD | Attack works while moving and airborne | Action exercised |
| Blade Cyclone · touch:cyclone | Level Select / Touch HUD | Activates cyclone with a visible or runtime state change | Action exercised |
| Shadow Dash · touch:dash | Level Select / Touch HUD | Activates dash with a visible or runtime state change | Action exercised |
| Down, drop or dive with Katana · touch:drop | Level Select / Touch HUD | Activates drop with a visible or runtime state change | Action exercised |
| Shadow Execution · touch:execution | Level Select / Touch HUD | Activates execution with a visible or runtime state change | Action exercised |
| Jump · touch:jump | Level Select / Touch HUD | Jump works while two other contacts remain held | Action exercised |
| Move left · touch:left | Level Select / Touch HUD | Press moves in intended direction and releases cleanly | Action exercised |
| Perfect Parry · touch:parry | Level Select / Touch HUD | Activates parry with a visible or runtime state change | Action exercised |
| Move right · touch:right | Level Select / Touch HUD | Press moves in intended direction and releases cleanly | Action exercised |
| Shadow Sprint · touch:sprint | Level Select / Touch HUD | Movement and sprint work together | Action exercised |
| Shuriken · touch:throw | Level Select / Touch HUD | Activates throw with a visible or runtime state change | Action exercised |
| Close level select · levels-close | Level Select / World and level select | Escape closes the list | Action exercised |
| Green Valley, 0 of 4 stages cleared · world:0 | Level Select / World select | world-1 | Action exercised |
| Dangerous Canyon, 0 of 4 stages cleared · world:1 | Level Select / World select | world-5 | Action exercised |
| Frozen Kingdom, 0 of 4 stages cleared · world:2 | Level Select / World select | world-9 | Action exercised |
| Fire Kingdom, 0 of 4 stages cleared · world:3 | Level Select / World select | world-13 | Action exercised |
| Dark Castle, 0 of 4 stages cleared · world:4 | Level Select / World select | world-17 | Action exercised |
| Poison Jungle, 0 of 5 stages cleared · world:5 | Level Select / World select | world-21 | Action exercised |
| Thunder Fortress, 0 of 5 stages cleared · world:6 | Level Select / World select | world-26 | Action exercised |
| Haunted Bamboo Forest, 0 of 6 stages cleared · world:7 | Level Select / World select | world-31 | Action exercised |
| Sunken Temple, 0 of 6 stages cleared · world:8 | Level Select / World select | world-37 | Action exercised |
| Sky Islands, 0 of 6 stages cleared · world:9 | Level Select / World select | world-43 | Action exercised |
| Neon City, 0 of 6 stages cleared · world:10 | Level Select / World select | world-49 | Action exercised |
| Eclipse Realm, 0 of 6 stages cleared · world:11 | Level Select / World select | world-55 | Action exercised |
| station:blacksmith · station:blacksmith | Ninja Village | Talk opens Blacksmith | Action exercised |
| station:dojo · station:dojo | Ninja Village | Talk launches the Training Hall | Action exercised |
| station:hall · station:hall | Ninja Village | Talk opens Hall of Legends | Action exercised |
| station:outfits · station:outfits | Ninja Village | Talk opens Outfit Shop | Action exercised |
| station:quests · station:quests | Ninja Village | Talk opens Quest Board | Action exercised |
| Back · back:Outfit Shop | Outfit Shop | Back returns to hero preview | Action exercised |
| Original Colors · cosmetic-original | Outfit Shop | Equips default costume | Action exercised |
| Silver Trim · Mastery 3 · cosmetic-silver | Outfit Shop | Equips Mastery trim and stores cosmetic | Action exercised |
| Close pause menu · pause-close | Paused / Pause | Close icon resumes gameplay | Action exercised |
| Controls · pause-controls | Paused / Pause | How to Play closes back to Pause | Action exercised |
| Main Menu · pause-main | Paused / Pause | Returns to title | Action exercised |
| Settings · pause-settings | Paused / Pause | Settings closes back to Pause and returns focus to opener | Action exercised |
| Restart Level · restart-level | Paused / Pause | Restarts level at spawn and resets deaths | Action exercised |
| Retry Checkpoint · retry-checkpoint | Paused / Pause / Pause (Survival) | Retry preserves checkpoint and increments deaths • End Survival Run shows summary and score | Action exercised |
| Resume · resume | Paused / Pause / Title / Pause / controller | Resumes and restores playfield focus | Defect reproduced |
| Back · back:Quest Board | Quest Board | Back returns to Legends hub | Action exercised |
| Claim 18 Coins · quest:blade | Quest Board | Claims reward once and disables the completed task | Action exercised |
| Claim 22 Coins · quest:collector | Quest Board | Claims reward once and disables the completed task | Action exercised |
| Claim 25 Coins · quest:master | Quest Board | Claims reward once and disables the completed task | Action exercised |
| Claim 20 Coins · quest:score | Quest Board | Claims reward once and disables the completed task | Action exercised |
| Extra danger outlines · danger-setting | Settings | Toggles dangerGuides and stores preference | Action exercised |
| Enter Fullscreen · fullscreen | Settings | Entered and exited fullscreen | Action exercised |
| Hero outfit · hero-outfit | Settings | Equip an unlocked cosmetic | Action exercised |
| Keyboard controls · Keyboard controls | Settings | Expands all mappings | Action exercised |
| Reduced motion · motion-setting | Settings | Toggles reducedMotion and stores preference • System preference forces the switch on and suppresses CSS transitions. The UI provides no explanation for the disabled state. | Action exercised |
| Music volume · music-volume | Settings | Updates slider and saved numeric value | Action exercised |
| Close settings · settings-close | Settings | Close icon closes modal | Action exercised |
| Done · settings-done | Settings | Done returns to title | Action exercised |
| Game audio · sound-setting | Settings | Toggles sound and stores preference | Action exercised |
| Effects volume · sound-volume | Settings | Updates slider and saved numeric value | Action exercised |
| Toggle sprint on touch · sprint-toggle | Settings | Toggles sprintToggle and stores preference | Action exercised |
| Swap touch button positions · Swap touch button positions | Settings | Expands the action selectors | Action exercised |
| Haptic feedback · touch-haptics | Settings | Switch toggles and saves, then an action requests vibration | Action exercised |
| Action layout · touch-layout | Settings | Applies and stores touch-layout | Action exercised |
| Left-handed layout · touch-left-handed | Settings | Mirrors controls and stores preference | Action exercised |
| Button opacity · touch-opacity | Settings | Updates slider and saved numeric value | Action exercised |
| Button size · touch-size | Settings | Applies and stores touch-size | Action exercised |
| Swap · touch-swap | Settings | Swaps actions and stores the explicit order | Action exercised |
| Action Shadow Dash Shuriken Shadow Sprint Blade Cyclone Shadow Execution Perfect Parry Attack Jump · touch-swap-from | Settings | Selects Jump as first action | Action exercised |
| Swap with Shadow Dash Shuriken Shadow Sprint Blade Cyclone Shadow Execution Perfect Parry Attack Jump · touch-swap-to | Settings | Selects Attack as second action | Action exercised |
| Rebind Katana Rush · key:attack | Settings / Keyboard remapping | Stores attack as KeyB | Action exercised |
| Rebind Blade Cyclone · key:cyclone | Settings / Keyboard remapping | Stores cyclone as KeyI | Action exercised |
| Rebind Shadow Dash · key:dash | Settings / Keyboard remapping | Stores dash as KeyP | Action exercised |
| Rebind Drop · key:drop | Settings / Keyboard remapping | Stores drop as KeyN | Action exercised |
| Rebind Shadow Execution · key:execution | Settings / Keyboard remapping | Stores execution as KeyT | Action exercised |
| Rebind Jump · key:jump | Settings / Keyboard remapping | Stores jump as KeyU | Action exercised |
| Rebind Move left · key:left | Settings / Keyboard remapping | Stores left as KeyH | Action exercised |
| Rebind Perfect Parry · key:parry | Settings / Keyboard remapping | Stores parry as KeyG | Action exercised |
| Rebind Pause · key:pause | Settings / Keyboard remapping | Stores pause as KeyM | Action exercised |
| Rebind Move right · key:right | Settings / Keyboard remapping | Stores right as KeyL | Action exercised |
| Rebind Shadow Sprint · key:sprint | Settings / Keyboard remapping | Stores sprint as KeyO | Action exercised |
| Rebind Shuriken · key:throw | Settings / Keyboard remapping | Stores throw as KeyY | Action exercised |
| Restore default keys · reset-bindings | Settings / Keyboard remapping | Restores defaults with status | Action exercised |
| Back · back:Shadow Ninja Skill Tree | Shadow Ninja Skill Tree | Back from legacy link screen restores Shadow chooser | Action exercised |
| Open Shadow Skill Tree · Open Shadow Skill Tree | Shadow Ninja Skill Tree / Hero skill tree | Opens the legacy Shadow tree | Action exercised |
| Confirm refund · confirm-skills | Shadow Skills | Refunds bought upgrades | Action exercised |
| Refund upgrades… · reset-skills | Shadow Skills | Shows refund confirmation with no charge | Action exercised |
| Upgrade · 1 point · shadow:cyclone | Shadow Skills | Purchases one tier and retains keyboard focus for cyclone | Action exercised |
| Upgrade · 1 point · shadow:dash | Shadow Skills | Purchases one tier and retains keyboard focus for dash | Action exercised |
| Upgrade · 1 point · shadow:execution | Shadow Skills | Purchases one tier and retains keyboard focus for execution | Action exercised |
| Upgrade · 1 point · shadow:katana | Shadow Skills | Purchases one tier and retains keyboard focus for katana | Action exercised |
| Upgrade · 1 point · shadow:shuriken | Shadow Skills | Purchases one tier and retains keyboard focus for shuriken | Action exercised |
| Upgrade · 1 point · shadow:sprint | Shadow Skills | Purchases one tier and retains keyboard focus for sprint | Action exercised |
| Close Shadow Skills · skills-close | Shadow Skills | Closes legacy skill modal | Action exercised |
| Grant training points · Grant training points | Shadow Skills / Developer Shadow Skills | Granted 36 points. No Shadow skill save was written. | Action exercised |
| Continue · prologue-continue | The first shadow / Five travelers / Prologue | Continue advances each readable chapter | Action exercised |
| Skip Prologue · Skip Prologue | The first shadow / Five travelers / The twelve seals / Prologue | Skips to the Legends hub | Action exercised |
| Return to the Village Tales · Return to the Village Tales | The twelve seals / Prologue | Finishes story and stores intro read flag | Action exercised |
| Sure Foot · 1 · node:thunder:accel | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Prepared Jump · 3 · node:thunder:buffer | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Breathe · 2 · node:thunder:chargeWait | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Ledge Step · 3 · node:thunder:coyote | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Evasion · 2 · node:thunder:dash | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Recover Footing · 2 · node:thunder:dashWait | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Weapon Edge · 1 · node:thunder:edge | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Force · 1 · node:thunder:power | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Keen Shot · 3 · node:thunder:projectile | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Field Control · 1 · node:thunder:radius | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Weapon Reach · 1 · node:thunder:reach | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Focus · 2 · node:thunder:reachSpecial | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Ready Stance · 2 · node:thunder:recovery | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Repeat Technique · 3 · node:thunder:specialWait | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Stride · 1 · node:thunder:sprint | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 1 point(s). Focus after update is BODY. | Action exercised |
| Unsteady Guard · 3 · node:thunder:stagger | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Final Form · 3 · node:thunder:ultimateWait | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 3 point(s). Focus after update is BODY. | Action exercised |
| Quick Draw · 2 · node:thunder:windup | Thunder Ronin Skill Tree / Skill Tree Thunder Ronin | Learned, charges 2 point(s). Focus after update is BODY. | Action exercised |
| Main Menu · victory-main | You Win! / Victory | Leaves the ending for victory-main | Action exercised |
| Play Again · victory-replay | You Win! / Victory | Leaves the ending for victory-replay | Action exercised |
| Return to Ninja Village · victory-village | You Win! / Victory | Leaves the ending for victory-village | Action exercised |

## 5. Navigation and player journeys

| Journey | Observed flow and result |
| --- | --- |
| First visit → hero → world → level → results | Title goes directly to first-run Controls via Play Game. Hero selection is inside Legends or available from Level Select. A world click jumps within one list. Results expose replay, choose hero, next, menu and eventually Victory. The route works with mouse and keyboard once destinations are reached. |
| Returning visit → Continue | No Continue action. Play Game starts fresh and clears current totals. Level Select can launch previously unlocked levels without that reset. |
| Title → Village → Blacksmith → return | Legends starts the level-based Village. Move to Hana, press E, or use the contextual Talk button. Close resumes the same position. Shop Back is internal to Legends. At the World Portal, Escape returns to the title after the scene has already been stopped. |
| Title → Challenges → Survival → results → return | Challenges and Survival are sibling entries. Survival opens directly from the title and End Survival Run displays results. Local personal best, not online ranking, is presented. |
| Title / Pause → Settings → Controls → return | Settings contains keyboard remapping inside Mobile Controls; How to Play lives in a separate dialog. Pause Settings and Pause Controls return correctly to their respective Pause opener. Binding changes do not reach the tutorial/hints. |
| Level Select → Hero → Back | Hero chooser opens over Level Select. The visible Back takes the user to the Legends hub, and closing that top dialog reveals the original list. A natural cancel needs one action. |
| Standard controller | Movement and Start to Pause were observed. The Legends chooser supports D-pad, A and B. Main menu and Pause lack the same input routing. |

## 6. Prioritized defects

The input/device scope is part of each issue. Eight broken entries are counted once each in the ledger, even when the same failure appears in multiple viewport samples. Misleading labels and successful actions that lose focus are tracked separately. P0 was not observed in the tested scope.

### UI-01 · P1 · Play Game resets the active adventure

- **Screen** Title / returning player
- **Reproduce** Open the title with Stage 2 unlocked and a completed Stage 1 in the active run. Activate Play Game once.
- **Expected** Resume from the latest unlocked stage. Starting over is a separate confirmed choice.
- **Observed** Starts Stage 1 and replaces the active results array with empty entries. Unlocks and stage bests remain.
- **Likely root cause** index.html play-game and src/main.js requestPlay(0, true); src/game/progress.js newAdventure saves cleared active results.
- **Recommended fix** Make Continue the primary returning-player action. Separate New Adventure, explain the active totals reset and provide Cancel.
- **Acceptance** The Continue path leaves the saved active results byte-for-byte intact until a legitimate new stage clear. Cancel leaves all save keys intact. Confirm starts Stage 1 deliberately.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/functional/before-play-game.png) · [Screenshot 2](http://127.0.0.1:4231/shots/functional/after-play-game.png) · [Recording](http://127.0.0.1:4231/play-clears-active-run.webm) · [Raw measurements](http://127.0.0.1:4231/resume-state.json)

### UI-02 · P1 · Title actions overrun the arcade frame

- **Screen** Title / responsive navigation
- **Reproduce** Open the menu at 1920 × 1080, 1366 × 768, or 844 × 390. Check the lower game modes and try to reveal the bottom links with normal scrolling.
- **Expected** Every enabled destination is visible or reachable by ordinary pointer, touch scrolling and Tab. The footer stays separate.
- **Observed** At 1920 × 1080 the mode grid overlays the footer and both external links lie below the frame. At 844 × 390 neither Combat Trials nor Legends is reachable through ordinary page scrolling. Keyboard focus can shift the hidden overflow and reveal different parts of the layout. Automated element clicks can scroll the hidden ancestor; the raw pointer recording checks ordinary page scrolling.
- **Likely root cause** src/styles.css .menu is absolute, the arcade cuts overflow, landscape gives the stage a 300 px floor, and three full- or multi-row groups cannot expand their container.
- **Recommended fix** Put the landing navigation in document flow with a small number of primary actions. Keep scenery in its own layer and put actual utilities after the menu. Allow native scrolling where needed.
- **Acceptance** All actions are hit-testable without synthetic ancestor scrolling at the 11 audited sizes. Focus and status text remain visible and separate. Web links are reachable at 200% text zoom during implementation QA.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/1920x1080/main-menu.png) · [Screenshot 2](http://127.0.0.1:4231/shots/844x390/main-menu.png) · [Recording](http://127.0.0.1:4231/menu-clipping.webm) · [Raw measurements](http://127.0.0.1:4231/edge-probes.json)

### UI-03 · P1 · Controller gets stuck after pausing

- **Screen** Title / Pause / controller
- **Reproduce** Use a simulated Standard gamepad. Press D-pad and A at the title. Start a level with a mouse, then press Start, D-pad, A and Start again.
- **Expected** A controller can start play and navigate or exit any menu it can open.
- **Observed** The title does not respond to D-pad or A. Start pauses the scene, but D-pad, A and Start cannot resume from Pause. The Legends chooser does support D-pad, A and B.
- **Likely root cause** src/game/controls.js is polled by the active Platformer scene; src/game/legends-ui.js has a separate RAF navigation implementation scoped to its own dialog.
- **Recommended fix** Route device-neutral navigation centrally, including Pause/Results/Settings and native selects. Focus and button hints must work independently of a running scene.
- **Acceptance** Using only a Standard controller, start a game, open Pause, navigate Settings, back out and resume. Repeat with modal stacking and after reconnect.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/platform/pad-stuck-pause.png) · [Raw measurements](http://127.0.0.1:4231/platform-probes.json)

### UI-04 · P1 · Launch accepts clicks before loading finishes

- **Screen** Startup / web offline
- **Reproduce** Throttle the main JS request by about 3 seconds. Click the already visible Play Game. Separately abort the bundle request.
- **Expected** A visible boot state explains why actions are unavailable. A failed startup gives an actionable retry.
- **Observed** The first click is lost. The uninitialized title appears ready, shows a stale counter and never displays an error when the main bundle fails.
- **Likely root cause** index.html exposes a static interactive menu, loading-label belongs to setMode('loading') after JS starts, and the app lacks a pre-boot ready/error component.
- **Recommended fix** Ship a minimal boot state with inert controls and a Retry action. Reveal the interactive title only after Phaser and input are ready.
- **Acceptance** An early click receives visible feedback or cannot activate and is labeled accordingly. A blocked bootstrap resolves to a retryable error view. Successful bootstrap focuses a visible target.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/functional/cold-entry.png) · [Screenshot 2](http://127.0.0.1:4231/shots/functional/startup-offline.png) · [Raw measurements](http://127.0.0.1:4231/entry-probes.json)

### UI-05 · P1 · Nested navigation loses the screen of origin

- **Screen** World Portal / Hero chooser / back
- **Reproduce** Walk in Ninja Village to the World Portal, press E, then Escape. In a separate route choose a hero from Level Select and press Back.
- **Expected** Dismissals return to the originating screen and focus, with the Village position or world selection intact.
- **Observed** World Portal exits to the title even if the user selects no stage. The hero chooser's Back leads to the Legends hub and requires a second dismissal to reveal Level Select.
- **Likely root cause** src/main.js interactVillage calls showMainMenu before showing levels, and src/game/legends-ui.js wires Back to home() independent of entry.
- **Recommended fix** Give each overlay an origin and retain scroll, selection, focus and paused scene state. Open the Village portal on top of the paused hub scene.
- **Acceptance** Canceling Portal restores the same Village coordinate. Back from a hero subview restores the level list and opener. Selecting a destination transitions only once.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/legends/village-portal.png) · [Screenshot 2](http://127.0.0.1:4231/shots/legends/portal-returned-to-menu.png) · [Screenshot 3](http://127.0.0.1:4231/shots/campaign/levels-back-hub.png) · [Recording](http://127.0.0.1:4231/hero-back-origin.webm)

### UI-06 · P2 · Remapped keys and hero abilities are described incorrectly

- **Screen** Controls / HUD / hero labels
- **Reproduce** Bind Attack to B, start a level and open Controls. Select Forest Ranger and compare help, touch names, and cooldown labels.
- **Expected** The active binding and selected hero's ability names match across prompts, HUD, tooltips and assistive names.
- **Observed** B attacks correctly while Controls and footer still show X/J. Ranger shows Shadow Dash and Katana in touch labels and Arrow Rain appears visually as Spin.
- **Likely root cause** index.html and src/main.js shadowHud contain fixed text. startRun updates only some aria-labels while src/game/shadow-ui.js also uses Shadow-centric names.
- **Recommended fix** Generate control help, button legends, and accessible names from one active-hero and binding model.
- **Acceptance** All five heroes show their equipped actions. After a remap and reload, keyboard help, pause hints and gameplay labels all show the new binding.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/platform/remap-stale-help.png) · [Screenshot 2](http://127.0.0.1:4231/shots/platform/ranger-labels.png) · [Raw measurements](http://127.0.0.1:4231/ranger-touch-labels.json)

### UI-07 · P2 · Small dialogs open on their bottom actions

- **Screen** Settings / first-run Controls
- **Reproduce** At 390 × 844 or 844 × 390, open Settings from title or start a fresh game. Inspect the first rendered frame after transition.
- **Expected** The title, first content and an obvious exit are visible. Buttons lower in the dialog remain reachable by scrolling.
- **Observed** At 390 × 844 Settings starts at scrollTop 390 and its heading is at y −298. First-run Controls starts at scrollTop 235. At 844 × 390 the offsets are 810 and 547 respectively; the Close icons scroll away with content.
- **Likely root cause** Autofocus is on Done and Start Level inside capped, scrolling native dialogs. The close icon is absolutely positioned relative to scrolling content.
- **Recommended fix** Focus a labeled heading or top action for long dialogs. Use a stable header, independent content scroll and persistent bottom actions.
- **Acceptance** On open, the title, intended first control and close action sit inside the dialog at all audited sizes. Tab, Shift+Tab, touch scroll and Escape remain operable.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/edges/settings-start-390x844.png) · [Screenshot 2](http://127.0.0.1:4231/shots/edges/tutorial-start-844x390.png) · [Raw measurements](http://127.0.0.1:4231/edge-probes.json)

### UI-08 · P2 · Long in-game toasts clip on narrow frames

- **Screen** Gameplay and narrative
- **Reproduce** Launch Level 31 from a profile with access at 390 × 844 or 568 × 320. Inspect the first Haunted Bamboo Forest toast.
- **Expected** All narrative text is readable; announcements do not occupy essential play space.
- **Observed** The same one-line toast is about 624 CSS px wide. At 390 px it runs from x −116.9 to 506.9; at 568 px it still overflows by about 28 px on both sides.
- **Likely root cause** src/styles.css .game-toast uses left:50%, transform translateX and white-space:nowrap with no width cap. onReady passes an entire sentence.
- **Recommended fix** Bound to safe content width and wrap. Deliver longer lore in a pause-safe intro or recap. Reserve HUD toasts for short alerts.
- **Acceptance** The full stage-31 line or its documented short variant is readable at 390 × 844 and 568 × 320. Boss warnings and movement remain unobstructed.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/edges/story-toast-390x844.png) · [Screenshot 2](http://127.0.0.1:4231/shots/edges/story-toast-568x320.png) · [Raw measurements](http://127.0.0.1:4231/edge-probes.json)

### UI-09 · P2 · Hero choice confirmation is below the portrait view

- **Screen** Character selection
- **Reproduce** Open the hero chooser at 390 × 844 and focus a hero card. Compare the area visible above the fold with the selected-hero commit action.
- **Expected** Preview, current selection and the primary confirmation remain understandable on a phone.
- **Observed** The portrait grid and large stacked preview occupy the visible dialog. Select, Skill Tree and Cosmetics lie below the fold. The selected preview and equipped hero differ without an always-visible applied-state indicator.
- **Likely root cause** The heroes() view renders portraits, canvas, details, meters and actions in a single scrolling column under the 480 px breakpoint.
- **Recommended fix** Use a compact single-row or wrapped hero picker, bounded preview, and a persistent selection action with separate Previewing and Equipped text.
- **Acceptance** A player at 390 × 844 sees who is equipped and can commit the highlighted hero without searching the modal. Screen-reader names and focus survive refresh.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/390x844/hero-selection.png) · [Screenshot 2](http://127.0.0.1:4231/shots/1920x1080/hero-selection.png)

### UI-10 · P2 · Buying an upgrade drops keyboard focus

- **Screen** New hero Skill Trees
- **Reproduce** Open a non-Shadow Skill Tree with available points. Activate any available purchase with Enter and inspect active focus.
- **Expected** The node updates and focus stays with that branch, moving to its next valid node or to the same node's status.
- **Observed** All 72 audited purchases updated points and learned state. All 72 moved focus to BODY after the re-render. Shadow Skills restores focus after its equivalent re-render.
- **Likely root cause** src/game/legends-ui.js skills() redraws the complete body through section()/replaceChildren without focus restoration.
- **Recommended fix** Preserve keys and focus per branch. Mark purchase status in a concise live region. Keep scroll position in long trees.
- **Acceptance** After each purchase, the next Tab stays inside the tree and starts from the branch that changed. No focus loss or jump back to the dialog top.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/legends/skills-flame.png) · [Screenshot 2](http://127.0.0.1:4231/shots/legends/shadow-full-tree.png) · [Raw measurements](http://127.0.0.1:4231/legends-probes.json)

### UI-11 · P2 · Paid changes offer little review or acknowledgement

- **Screen** Blacksmith / Skill Trees
- **Reproduce** With audit coins, choose Unlock for 25 and Hone Weapon. Compare before/after state, then open the Shadow refund confirmation.
- **Expected** A player can review cost, effect and target. The next view clearly confirms what changed and provides a way to cancel eligible actions.
- **Observed** Unlock equips and spends immediately; Hone spends immediately. The new values replace the previous ones without a receipt or dedicated live status. Shadow refund has a separate confirmation button and Escape but no visible Cancel action at that step.
- **Likely root cause** legends-ui.js callbacks call weapon/hone/purchase and repaint synchronously. shadow-ui.js reveals only confirm-skills for refunds.
- **Recommended fix** Add lightweight review for sizeable upgrades and refund, persist the balance beside the action, and announce the effect and remaining funds.
- **Acceptance** Enter does not buy the highlighted high-value action twice. Confirm charges exactly once. Cancel writes nothing. A screen-reader can identify the change.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/legends/forge-upgraded.png) · [Screenshot 2](http://127.0.0.1:4231/shots/legends/refund-confirmation.png) · [Raw measurements](http://127.0.0.1:4231/legends-probes.json)

### UI-12 · P2 · Button size changes width but leaves action height fixed

- **Screen** Mobile Controls / gameplay
- **Reproduce** Switch Small, Medium and Large at 844 × 390. Measure Attack, Jump and movement buttons.
- **Expected** The Size choice changes both dimensions, or the UI clearly describes which dimension is controlled.
- **Observed** Attack and Jump are 46, 52 or 64 px wide and always 44 px high. Movement changes both dimensions. At 390 px several width values are capped to fit.
- **Likely root cause** The late mobile grid rule sets action height and min-height to 44px after earlier rules reference --touch-size.
- **Recommended fix** Represent touch target dimensions using one size policy and separate geometry from visual icons. Clearly explain safety caps.
- **Acceptance** Each preset has a documented visual and hit-target difference at each relevant breakpoint; intended touch targets stay at least 44 CSS px in both axes when space allows.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/edges/touch-large-844x390.png) · [Screenshot 2](http://127.0.0.1:4231/shots/edges/touch-large-390x844.png) · [Raw measurements](http://127.0.0.1:4231/edge-probes.json)

### UI-13 · P2 · Landscape HUD and touch dock consume the combat view

- **Screen** Landscape gameplay / boss HUD
- **Reproduce** Enter Stage 60 at 568 × 320 with touch emulation. Trigger the boss warning and compare the playfield with the two-row controls.
- **Expected** The short landscape layout keeps critical threats and recovery openings visible while preserving touch targets.
- **Observed** The game view is 156 px high. The two-row touch dock takes 109 px, and the boss health and telegraph overlay uses 65 px above the arena. The player and target markers are visually compressed.
- **Likely root cause** src/styles.css uses a 44 px two-row action grid plus recurrent top HUD, a dedicated lower dock and a wide fixed-position boss panel. The canvas scales to the space left.
- **Recommended fix** Prioritize the boss name, state and meter in a concise horizontal strip. Keep large essential controls and test optional moves in a second, configurable group.
- **Acceptance** At 568 × 320 the boss/phase remains readable, no overlay crosses the active target region and movement, jump and attack continue to meet 44 px hit-target goals.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/568x320/boss.png) · [Screenshot 2](http://127.0.0.1:4231/shots/844x390/boss.png)

### UI-14 · P2 · Theme colors and button hierarchy lack shared roles

- **Screen** Cross-screen visual hierarchy
- **Reproduce** Compare the title, hero picker, old Shadow tree and combat readouts.
- **Expected** Color, typography and icons communicate the same roles across the menu and HUD while preserving world art.
- **Observed** Lime acts as title treatment, primary action, status and world navigation. Hero selection uses pink, Legacy Skills and stage labels use lime, and boss warning UI switches to gold. Tabs, actions and utilities use similar contrast, size and surfaces.
- **Likely root cause** src/styles.css has a small root palette plus direct component hex values. Secondary actions were added to the same menu grid and several UI families were styled separately.
- **Recommended fix** Define semantic roles for accent, focus, rewards, danger, available, selected and disabled. Consolidate type scales and action priority. Keep pixel art textures in scenery and sprites.
- **Acceptance** Screenshot review shows one primary action per view. Selected, equipped, locked, warning and success differ by position and text or icon as well as color.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/1600x900/main-menu.png) · [Screenshot 2](http://127.0.0.1:4231/shots/legends/hero-flame.png) · [Screenshot 3](http://127.0.0.1:4231/shots/legends/shadow-full-tree.png) · [Screenshot 4](http://127.0.0.1:4231/shots/932x430/boss.png)

### UI-15 · P2 · Combat state depends on tiny glyphs and visual-only updates

- **Screen** Gameplay / non-visual feedback
- **Reproduce** Inspect the combat HUD and enter a boss. Review the DOM accessibility tree and watch the state text and cooldowns change.
- **Expected** Ability availability and significant boss phase changes are discoverable on keyboard and exposed as meaningful text.
- **Observed** The general combat row uses 10.72 px monospace glyphs and hover title attributes. The boss meter is named, but nearby phase changes have no status semantics. Checkpoint notifications already use a live status pattern.
- **Likely root cause** index.html role=group covers the glyph row; src/main.js rewrites glyph/symbol strings without named readiness states. boss-state is a plain span.
- **Recommended fix** Name each ability and represent cooldowns with accessible text. Announce only high-value phase/opening changes at a bounded rate while preserving visual and audio telegraphs.
- **Acceptance** A keyboard or screen-reader user can identify the ability and remaining time and get one announcement when the boss opening changes. The live region stays quiet during ordinary frame updates.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/platform/ranger-labels.png) · [Screenshot 2](http://127.0.0.1:4231/shots/568x320/boss.png) · [Raw measurements](http://127.0.0.1:4231/platform-probes.json)

### UI-16 · P3 · Version metadata and initial counter disagree with the build

- **Screen** Startup / release copy
- **Reproduce** Inspect the title metadata and observe the static menu during a slow launch.
- **Expected** The version and campaign progress copy match the served build. A legacy installer link clearly states its release version.
- **Observed** The title names 4.0 and package version is 4.0.0-rc.1, while the meta application-version says 3.0.0-rc.2. The static footer shows 1 / 3 until JS replaces it. Download for Windows targets the v2.0.0 asset without a visible version.
- **Likely root cause** index.html hard-codes metadata, footer and legacy release URL. package.json uses a separate version value.
- **Recommended fix** Emit build/version metadata from one source; leave progress out until hydrated. Label the installer version and platform.
- **Acceptance** Cold and hydrated entry display coherent metadata. The link name identifies Windows x64 2.0.0 whenever this candidate intentionally links there.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/functional/cold-entry.png) · [Raw measurements](http://127.0.0.1:4231/entry-probes.json) · [Raw measurements](http://127.0.0.1:4231/edge-probes.json)

### UI-17 · P3 · Forced system motion setting lacks an explanation

- **Screen** Settings / motion
- **Reproduce** Emulate an OS preference for reduced motion. Open Settings and look at the checked, disabled switch.
- **Expected** Players know that the system preference governs the setting.
- **Observed** The OS preference is respected and transitions are suppressed. Settings leaves the switch disabled without saying why.
- **Likely root cause** src/main.js updatePreferences disables the switch when matchMedia reports reduce. Existing help describes intensity only.
- **Recommended fix** Add a text hint such as Uses system setting and keep it in the switch description.
- **Acceptance** The switch remains consistent with the OS setting, and the reason for its locked state is visible and announced.
- **Evidence** [Raw measurements](http://127.0.0.1:4231/platform-probes.json) · [Screenshot 2](http://127.0.0.1:4231/shots/edges/settings-start-390x844.png)

### UI-18 · P3 · Boss Rush prerequisite names only a count

- **Screen** Challenges / records
- **Reproduce** Open Challenges in a fresh profile and select Boss Rush. Compare the lock message with the campaign's full roster.
- **Expected** Prerequisites identify the specific bosses and scope of the mode.
- **Observed** The lock message says all three campaign bosses. There are eight in this build. The Rush route is defined for the three original guardians.
- **Likely root cause** src/game/challenges.js RUSH_LEVELS fixes three legacy indices; src/main.js showChallengeRecord hard-codes count-based copy.
- **Recommended fix** Label the scope as Classic Boss Rush or name the Hollow Crown, Poison Queen and Thunder Titan. Link to their world entries.
- **Acceptance** The fresh locked state and eligible start explain which three clears apply. The route and existing challenge records remain compatible.
- **Evidence** [Screenshot 1](http://127.0.0.1:4231/shots/supplement/rush-prerequisite.png) · [Screenshot 2](http://127.0.0.1:4231/shots/campaign/rush-start.png) · [Raw measurements](http://127.0.0.1:4231/campaign-probes.json)

## 7. Responsive and visual review

| Viewport | Title stage height | Action stack / footer | Gameplay view height | Current capture |
| --- | --- | --- | --- | --- |
| 1920 × 1080 pointer | 589 px | Menu actions cross the footer boundary. Clipped: Combat Trials, Legends of Shadows, Download for Windows, GitHub Repository. | 539.9 px | [Title](http://127.0.0.1:4231/shots/1920x1080/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/1920x1080/gameplay.png) |
| 1600 × 900 pointer | 589 px | Menu actions cross the footer boundary. Clipped: Combat Trials, Legends of Shadows, Download for Windows, GitHub Repository. | 539.9 px | [Title](http://127.0.0.1:4231/shots/1600x900/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/1600x900/gameplay.png) |
| 1366 × 768 pointer | 589 px | Menu actions cross the footer boundary. Clipped: Download for Windows, GitHub Repository. | 539.9 px | [Title](http://127.0.0.1:4231/shots/1366x768/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/1366x768/gameplay.png) |
| 1280 × 720 pointer | 589 px | Menu actions cross the footer boundary. Clipped: Download for Windows, GitHub Repository. | 539.9 px | [Title](http://127.0.0.1:4231/shots/1280x720/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/1280x720/gameplay.png) |
| 1180 × 820 touch | 557 px | Menu actions cross the footer boundary. Clipped: Download for Windows, GitHub Repository. | 656 px | [Title](http://127.0.0.1:4231/shots/1180x820/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/1180x820/gameplay.png) |
| 1024 × 768 touch | 479 px | Menu actions cross the footer boundary. Clipped: Combat Trials, Legends of Shadows, Download for Windows, GitHub Repository. | 604 px | [Title](http://127.0.0.1:4231/shots/1024x768/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/1024x768/gameplay.png) |
| 390 × 844 touch | 557 px | Action grid fits above the footer. No clipped menu controls in initial frame. | 680 px | [Title](http://127.0.0.1:4231/shots/390x844/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/390x844/gameplay.png) |
| 932 × 430 touch | 328 px | Menu actions cross the footer boundary. Clipped: Combat Trials, Legends of Shadows, Download for Windows, GitHub Repository. | 266 px | [Title](http://127.0.0.1:4231/shots/932x430/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/932x430/gameplay.png) |
| 844 × 390 touch | 300 px | Menu actions cross the footer boundary. Clipped: Survival Arena, Combat Trials, Legends of Shadows, Download for Windows, GitHub Repository. | 226 px | [Title](http://127.0.0.1:4231/shots/844x390/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/844x390/gameplay.png) |
| 667 × 375 touch | 300 px | Menu actions cross the footer boundary. Clipped: Combat Trials, Legends of Shadows, Download for Windows, GitHub Repository. | 211 px | [Title](http://127.0.0.1:4231/shots/667x375/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/667x375/gameplay.png) |
| 568 × 320 touch | 300 px | Menu actions cross the footer boundary. Clipped: Combat Trials, Legends of Shadows, Download for Windows, GitHub Repository. | 156 px | [Title](http://127.0.0.1:4231/shots/568x320/main-menu.png) · [Gameplay](http://127.0.0.1:4231/shots/568x320/gameplay.png) |

The provided screenshot concerns are confirmed in the live layout. The mode grid is dense and largely equally weighted. The frame clips overflow, even on a large desktop where viewport height alone should be ample. A scenic presentation already exists, with a readable gradient over the left side. The flat cards can work alongside pixel art if the chrome uses consistent surfaces, a clearer action hierarchy and its own space.

Standard stage and modal screenshots were generated at each of the 11 sizes. Full-page screenshots of short-landscape title are secondary evidence only. The height of the viewport and the clipping rectangle are evaluated from actual browser layout. Screen widths in the gallery are CSS viewport pixels at device scale factor 1.


## 8. Color and visual identity

The current warm lime primary action on dark green is legible and recognizable. Its repeated use on the title, world links, progress and modal accents leaves little distinction between promise, navigation and status. The Legends dialog's mauve selections, charcoal-blue settings, gold boss plate and cyan combat marks compete without a common set of semantics. The Scout and protagonist art belong to the game world; their palettes can remain fully saturated.

| Opaque text sample | FG / BG | Contrast |
| --- | --- | --- |
| Current dialog description | #bbced6 / #1a2734 | 9.33:1 |
| Current level sublabel on ready tile | #a3b5bf / #243e37 | 5.45:1 |
| Current primary CTA | #263322 / #caf17d | 10.38:1 |
| Current danger layer text | #ffe5b4 / #22182d | 13.84:1 |
| Proposed body on raised surface | #F4F3ED / #222E40 | 12.32:1 |
| Proposed secondary on raised surface | #BBC8D8 / #222E40 | 8.07:1 |
| Proposed dark label on crimson CTA | #101521 / #E5798F | 6.48:1 |
| Proposed gold on panel | #E1BD7C / #172131 | 9.07:1 |

Measured opaque pairs are representative samples. Gradients, all interaction states and the current app as a whole were outside this calculation. Use a 4.5:1 normal-text goal and a 3:1 large-text threshold as applicable. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

### Proposed Hybrid AAA-Style tokens

| Role | Proposal | Use |
| --- | --- | --- |
| Backdrop and surface | `#0D121D` / `#172131` | Deep navy landing, charcoal panels, native dialog shell |
| Raised surface / divider | `#222E40` / `#51617A` | Secondary menu areas, inventory slots, boundaries |
| Neutral text | `#F4F3ED` / `#BBC8D8` | Primary text and secondary explanatory text |
| Eclipse crimson | `#E5798F` with `#101521` ink | Deliberate primary CTA and cinematic identity |
| Muted gold | `#E1BD7C` | Rewards, rare equipment, earned medals |
| Cyan | `#8CDDE4` | Focus ring, interactive focus/selection, magic utility |
| Green | `#9DD09F` | Completed, equipped success, checkpoint acknowledgement |
| Warning / danger | `#FFC080` / `#FF8A92` | Telegraph warning and damage, paired with text/icon |
| Disabled | Neutral surface and legible secondary text | Requirement or unavailable label; avoid opacity-only communication |

World and hero palettes supply a restrained accent to panels. Semantic state stays stable across worlds. Sample all interactive and over-art states during implementation.

## 9. Typography and iconography

The existing sources load Bricolage Grotesque Variable for display headings and DM Sans Variable for UI. Keep those bundled families. Currently dialog descriptions are 14 px, detail lines tend to 12 px, the combat row is 0.67 rem (10.72 px at the tested default), and Canvas station names are drawn in small world-space monospace. Body text is readable on neutral panels, while the combat glyph row and area below the hero sprite require closer reading.

Use Bricolage at 48–88 px for the cinematic desktop title, 34–52 px on small displays and 24–36 px for destination headings. Use DM Sans at 16 px for body, 14–16 px for buttons and 12–14 px for secondary metadata. Keep tabular numerals for time, health and prices. Reserve pixel lettering and pixel sprites for world signs, logos or genre cues. Provide plain-language names for the glyphs that affect gameplay. Use one icon grid and stroke weight across navigation; the current combination of outline SVG icons, chunky SVG stars and text characters can be separated into navigation versus game indicators.

## 10. Animation and transitions

- The live title already animates the pixel landscape and hero. Five hero-selection previews yielded distinct frames. Preserve both effects while keeping input stable.
- CSS modal entry is approximately 190 ms. The scene canvas fades over 250 ms. Buttons use about 160 ms transitions and an active 2 px movement. Victory's star animates over 380 ms; the prologue moon effect runs for 1.9 s. Interaction is available during the cosmetic transitions. Boot lacks a pending/failed state, and dynamic menu repaints can change focus abruptly.
- Existing motion preferences suppress CSS motion and avoid the canvas fade. Hero preview honors reduced motion. Preserve this behavior in the redesigned shell and show the source of the setting.
- Use 120–180 ms opacity/translate for lightweight panel changes and 180–240 ms for cinematic scene changes. Keep focus stable and permit Skip/Back immediately. Provide static Pending and Ready states. Reserve shimmer, particles and moving imagery for optional decoration; the reduced-motion mode should still communicate success and danger.

## 11. Accessibility

- Keyboard checks verified first-use entry, settings and sliders, all 12 remaps, world jump focus, ordinary Pause/Resume, and the new-tree purchase defect. Existing DOM buttons and the focus-visible ring are reusable. Title overflow, auto-focused bottom actions and replacement of whole view bodies need fixes. [W3C guidance on focus visibility](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- Touch checks covered the 11 gameplay actions and a four-contact chord. The tested action targets were at least 44 × 44 CSS px. Many standard controls use 34–43 px heights; 44 px is the proposed product target for frequently used controls, especially Close and Pause. The WCAG minimum uses a different threshold and defined exceptions. [W3C target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Native dialog semantics, role-based switches, the labeled boss meter, status announcements for checkpoint/remapping and the result star accessible name are strengths. The combat glyph row uses title attributes, and important boss phase changes lack status semantics. The Phaser canvas is hidden from the DOM accessibility tree; some gameplay information is visual, world-space or audio-only.
- Sound state followed the settings and persisted. A nonzero local Web Audio signal and mute were tested after a user gesture. Haptics was exercised through an emulated capability and callback. Keep volume independently adjustable and pair important cues with audible and visual signals.
- Standard gamepad support is incomplete outside active gameplay and the special Legends dialog. Screen-reader output and native controller hardware remain unverified. This audit makes no accessibility conformance claim.

## 12. Technical root causes and transition risks

| Area | Finding |
| --- | --- |
| Layout containment | `.menu` is absolutely positioned inside the stage. Its action grid cannot grow the stage, and `.arcade` clips overflow. The short-height breakpoints shrink the canvas and button heights separately from the content stack. No z-index tweak can give the menu room. |
| Overflow and focus | Native dialogs set a viewport-based max height. Bottom autofocus scrolls content at open. A fixed header with an independently scrolling body would keep the title and exit visible. |
| Navigation contract | One shared `mode` and several global flags coordinate independent modal stacks. Some actions call `showMainMenu()` before opening a child sheet. DOM focus restoration depends on how each entry was opened. |
| Input split | Gameplay reads mapped inputs inside Phaser's update loop. The Legends dialog reads gamepad buttons via a separate animation-frame loop. Pause stops the scene that handles gameplay gamepad input. |
| Re-render churn | Replacing whole dialog bodies makes order, focus and persisted result feedback fragile. Dynamic binding labels and hero captions are also derived in several modules. |
| Event lifetime | Source review found scene shutdown cleanup for input/resize and cancellation of Legends' preview/menu RAF loops. No listener leak surfaced in repeated navigation, several scene launches and all 60 level-start probes. Long soak, heap snapshots and low-end animation profiling were outside the audit. |
| Accessibility timing | Combat readiness is refreshed on a timer and skips identical visual values. Announcing per tick would be noisy. Use semantic transition events for when a skill becomes ready, a checkpoint activates or a boss window opens. |
| Offline boundary | Use local font, icon and image imports. Avoid a separate web-only shell or remote runtime dependency that would conflict with Electron's `connect-src 'none'` and network blocking. |

## 13. Proposed information architecture

```text
Launch → Cinematic Landing
         ├─ Continue → active adventure / latest unlocked stage
         ├─ New Adventure → confirmation only when active totals exist
         └─ Main Hub
             ├─ Campaign → World Select → Level Select
             │                         └─ Choose Hero, then return
             │               Gameplay → Results → Next, replay, or hub
             ├─ Heroes → choose / details / skills / weapons / mastery / outfits
             ├─ Ninja Village → station / portal / preserve return position
             ├─ Challenges → difficulty / Survival / Daily / rematches / NG+
             └─ Settings → audio / accessibility / controls / touch
```

The title offers a single principal action for the current profile. The hub owns feature discovery. Hero selection is optional on stage launch when a hero is already equipped. An origin-aware Back action returns to the previous view and focus. The player can still go directly from the hub to a cleared stage or a replay mode. Move secondary release links into a conventional utilities area. The results family shares one hierarchy with mode-specific stats, labels and follow-up actions.

## 14. Recommended redesign architecture

Retain a DOM shell around Phaser. Build a small explicit route/state controller for the landing, hub, stage picker, paused flows and overlays. Pass each overlay its entry point, scroll/focus anchor and return rule. Expose immutable UI view state from the existing progress adapters and a single action layer for starts, purchases, settings and exits.

Build reusable hero cards, status bars, modal headers, button groups and stats tiles around semantic theme tokens. Keep level/hero facts and key names in a shared view model and provide text labels alongside icons. Scope responsive rules by shell family and container; use grid or flex where content can enlarge a frame. The same input router should know which surface owns input and allow keyboard, controller and pointer routes without changing Phaser combat input semantics.

Use explicit action gates for Continue, New Adventure, purchase, refund, quit and retry. Scene transitions call existing Phaser start/pause/stop methods through a narrow adapter. Keep modal rendering and game timing separate by avoiding live layout work in the render loop. Preserve the DOM hooks required by current tests during incremental migration where feasible.

## 15. Recommended implementation sequence and estimate

| Step | Scope / gate | Complexity |
| --- | --- | --- |
| 1 | Freeze save contract and fix entry/resume, boot, title overflow and origin-aware Back in the old shell. Add regression fixtures for active state and reload. | High, about 3–5 engineering days |
| 2 | Apply the landing, Main Hub, world/level hierarchy, semantic tokens and shared dialog primitives. Route keyboard + Standard gamepad across all destinations. | High, about 4–6 days |
| 3 | Migrate heroes/skills/Blacksmith, HUD and results. Add contextual help, purchase feedback, mobile density and reduced-motion verification. | High, about 4–7 days |
| 4 | Audit 11 viewport sizes again, then verify physical hardware, real assistive technology, Electron offline parity and save progression. | Medium–high, about 3–5 days |

Estimated **14–23 engineering days** for one engineer with the existing art and scope. Actual delivery depends on design iteration and access to test hardware.

## 16. Gameplay and save compatibility safeguards

- Preserve current result arrays, best-record arrays, unlock frontier and migration behavior. Continue should read the active frontier and keep existing totals; new runs should require user intent before calling `newAdventure()`.
- Keep wallet spends and unlocks atomic and idempotent. Reusing a modal or restoring focus must never run its action again. Snapshot the current hero loadout before entering gameplay and maintain the current no-midlevel-switch rule.
- Preserve checkpoint, death, daily-date, rematch, NG+, Survival and trial record boundaries. Respect mode-specific end actions. Opening nested panels should not resume simulation or timers prematurely.
- Preserve native dialogs' modal and cancel behavior where useful. Test focus restoration, pressed input cleanup, accumulated movement and touch cancellation across transitions before changing the layout.
- Verify installed Electron from a temporary profile and keep all fonts, scenes, shaders and UI code offline-compatible. Release approval remains separate.

## 17. Explicitly unverified

Physical phones, physical gamepads, hardware vibration, iOS/Safari WebKit, Android vendor browsers, nonzero real-device safe-area insets (the Edge CDP was unable to set them), screen-reader speech, manual large text preferences, full WCAG criteria, long gameplay soak and native installer upgrades. Browser external navigation targets were intercepted locally, so current public download availability is outside scope. UI fixture completions and all 60 stage launches are audit coverage rather than a new campaign run. The screenshot gallery includes the observable states and raw captures used here.

## 18. Audit boundary

Only this Markdown document was added to the game repository. Existing source, styles, assets, build files, branch history and user profiles were preserved. The local game and audit gallery used loopback servers. The work ends after the audit and proposed direction.
