import { clipFrame } from './prototype-sprites.js';
import { loadShadowArt, shadowClips } from './shadow-art.js';
import { DASH, KATANA, SHURIKEN, strikeBox } from './shadow-rules.js';

const SIZE = .62;
const poses = { step:'run', stride:'run', accelerate:'run', brake:'idle', launch:'jumpStart', jump:'rise' };
const clips = { idle: 880, run: 495, jumpStart: 75, rise: 220, fall: 270, land: 138, respawn: 440, victory: 730 };

export function createShadowPresentation(scene) {
  loadShadowArt(scene);
  function sprite(depth) {
    return scene.add.image(0, 0, 'shadow-ninja', 'idle0').setOrigin(.5, .9875).setScale(SIZE).setDepth(depth);
  }
  const hero = sprite(4.35);
  const echo = sprite(4.2).setVisible(false);
  const trail = Array.from({ length: 3 }, () => ({ image: sprite(4.1).setVisible(false), time: -Infinity }));
  let cursor = 0;
  let lastTrail = -Infinity;
  let lastPose;
  let started = 0;
  let victoryAt;
  let dying;
  let afterDeath = -Infinity;

  return {
    collapse() {
      dying = { x: scene.player.x, y: Math.min(scene.player.y, 217), flip: scene.player.flipX, since: scene.elapsed };
      afterDeath = scene.elapsed + 440;
      for (const ghost of trail) ghost.time = -Infinity;
    },
    update(clock) {
      const now = scene.elapsed;
      const state = scene.ninja;
      const reduced = scene.ui.reduceMotion;
      const player = scene.player;
      const grounded = scene.animationState.grounded;
      player.setVisible(false);
      let name = poses[scene.visualPose] ?? scene.visualPose;
      if (name === 'hurt' || name === 'respawn') name = 'idle';
      if (scene.complete) name = 'victory';
      else if (state.dash) name = state.dash.air ? 'dashAir' : 'dashGround';
      else if (state.attack) name = KATANA[state.attack.index].pose;
      else if (state.throw) name = 'throw';
      else if (now < afterDeath) name = 'respawn';
      else if (grounded && now < scene.landUntil) name = 'land';
      if (name !== lastPose) { lastPose = name; started = now; }
      if (name === 'victory') victoryAt ??= clock;
      const spec = state.attack && KATANA[state.attack.index];
      const age = name === 'victory' ? clock - victoryAt : state.dash ? now - state.dash.since :
        state.attack ? now - state.attack.since : state.throw ? now - state.throw.since : now - started;
      const duration = clips[name] ?? spec?.duration ?? (state.dash ? DASH.duration : SHURIKEN.duration);
      const looping = name === 'idle' || name === 'run';
      const impactAge = spec && state.lastHit ? state.lastHit.time - state.attack.since : -1;
      const holdStrike = !reduced && now < state.holdUntil && spec && impactAge >= spec.open && impactAge < spec.close && age < spec.close;
      const anchoredAge = reduced && name === 'idle' ? 0 : holdStrike ? impactAge : age;
      if (now >= state.holdUntil || reduced || name === 'victory' || state.dash || state.attack) {
        hero.setFrame(clipFrame(shadowClips, name, anchoredAge, duration, looping));
      }
      hero.setPosition(Math.round(player.x), Math.round(player.y)).setFlipX(player.flipX);

      if (state.dash && !reduced && now - lastTrail >= 35) {
        const ghost = trail[cursor++ % trail.length];
        ghost.time = now;
        lastTrail = now;
        ghost.image.setFrame(hero.frame.name).setFlipX(hero.flipX).setPosition(hero.x, hero.y);
      }
      for (const { image, time } of trail) {
        const fade = Math.max(0, (time + 100 - now) / 100);
        image.setVisible(!reduced && fade > 0).setAlpha(.32 * fade);
      }
      if (dying) {
        const age = now - dying.since;
        const name = age < 57 ? 'hurt' : age < 154 ? 'knockback' : 'death';
        const duration = name === 'hurt' ? 57 : name === 'knockback' ? 97 : 250;
        const progress = name === 'hurt' ? age : name === 'knockback' ? age - 57 : age - 154;
        echo.setVisible(!reduced && age < 407);
        if (echo.visible) echo.setFrame(clipFrame(shadowClips, name, progress, duration))
          .setFlipX(dying.flip).setPosition(dying.x + (dying.flip ? 1 : -1) * Math.min(7, Math.floor(age / 23)), dying.y)
          .setAlpha(age < 282 ? 1 : (408 - age) / 126);
      }
      paintEffects(scene);
      scene.ui.onShadowStatus?.(name, state);
    },
  };
}

function paintEffects(scene) {
  const { attack, effect, spark, lastHit } = scene.ninja;
  const now = scene.elapsed;
  const reduced = scene.ui.reduceMotion;
  if (effect.commandBuffer.length) effect.clear();
  if (attack) {
    const spec = KATANA[attack.index];
    const age = now - attack.since;
    if (age >= spec.open && age < spec.close) {
      const { x,y } = scene.player;
      const d = attack.direction;
      const bounds = strikeBox(spec, x, y, d);
      const reach = spec.x + spec.w;
      const tail = x + d * spec.x;
      const tip = x + d * reach;
      const mid = bounds.top + spec.h / 2;
      const upper = attack.index === 1 ? bounds.top : mid - 3;
      const lower = attack.index === 2 ? bounds.bottom : mid + 3;
      effect.fillStyle(attack.index === 2 ? 0xff8f82 : 0x6bb4d6, .72)
        .fillTriangle(tail, lower, tip, upper, x + d * (reach - 6), bounds.bottom);
      effect.fillStyle(0xfff2d1, .94)
        .fillTriangle(tail + d * 3, mid, tip, upper, tip - d * 3, mid + 2);
      if (!reduced) {
        effect.fillStyle(0xb9e8fa,.6).fillRect(tip - 2, upper, 2, 2);
        if (attack.index === 2) effect.fillRect(tip - d * 6, bounds.bottom - 1, 3, 1);
      }
    }
  }
  if (spark.commandBuffer.length) spark.clear();
  if (!lastHit || now >= lastHit.time + 120) return;
  const { x, y, direction, heavy } = lastHit;
  const radius = heavy ? 10 : 6;
  spark.fillStyle(heavy ? 0xffbb90 : 0xe1fbff, reduced ? .75 : 1 - (now - lastHit.time) / 150)
    .fillTriangle(x - 2, y - 4, x + direction * radius, y - 2, x - 2, y + 3)
    .fillRect(x - 1, y - 5, 2, 10);
}
