import { clipFrame } from "./prototype-sprites.js";
import { loadShadowArt, shadowClips, shadowFrames } from "./shadow-art.js";
import { DASH, KATANA, SHURIKEN, strikeBox } from "./shadow-rules.js";
import { activeWindows, AIR_DIVE, SPECIALS } from "./combat-techniques.js";

const SIZE = 0.62;
const poses = {
  step: "run",
  stride: "run",
  accelerate: "run",
  brake: "idle",
  launch: "jumpStart",
  jump: "rise",
};
const clips = {
  idle: 880,
  run: 495,
  jumpStart: 75,
  rise: 220,
  fall: 270,
  land: 138,
  respawn: 440,
  victory: 730,
  sprintStart: 160, sprintLoop: 185, sprintStop: 135,
  chargePrep: 480, chargeRelease: 390, airSlash: 182,
  cycloneStart: 128, cycloneSpin: 190, cycloneEnd: 172,
  executionPrep: 112, executionRush: 255, executionFinal: 109, executionEnd: 134,
  sprintJump:240, wallSlide:275, wallJump:145, diveSlash:285, parryStart:260, parrySuccess:190,
  dashBrake:110, victoryBow:800,
};

function techniquePose(state, now) {
  if(state.charging)return ['chargePrep',now-state.charging.since-320];
  const action=state.special;
  if(!action)return null;
  const age=now-action.since;
  if(action.kind==='charged')return ['chargeRelease',age];
  if(action.kind==='cyclone'){
    if(age<128)return ['cycloneStart',age];
    if(age<318)return ['cycloneSpin',age-128];
    return ['cycloneEnd',age-318];
  }
  if(age<112)return ['executionPrep',age];
  if(age<367)return ['executionRush',age-112];
  if(age<476)return ['executionFinal',age-367];
  return ['executionEnd',age-476];
}

export function createShadowPresentation(scene) {
  let costume = scene.ui.costume;
  let texture = loadShadowArt(scene, costume);
  for (const key of scene.textures.getTextureKeys()) {
    if (key.startsWith('shadow-ninja-') && key !== texture) scene.textures.remove(key);
  }
  function sprite(depth) {
    return scene.add
      .image(0, 0, texture, "idle0")
      .setOrigin(0.5, 0.9875)
      .setScale(SIZE)
      .setDepth(depth);
  }
  const hero = sprite(4.35);
  const echo = sprite(4.2).setVisible(false);
  const hitboxes = scene.ui.onShadowStatus && scene.add.graphics().setDepth(9);
  const trail = Array.from({ length: 3 }, () => ({
    image: sprite(4.1).setVisible(false),
    time: -Infinity,
  }));
  let cursor = 0;
  let lastTrail = -Infinity;
  let lastPose;
  let started = 0;
  let victoryAt;
  let dying;
  let afterDeath = -Infinity;
  let runDistance = 0;
  let previousX = scene.player.x;

  return {
    collapse() {
      dying = {
        x: scene.player.x,
        y: Math.min(scene.player.y, 217),
        flip: scene.player.flipX,
        since: scene.elapsed,
      };
      afterDeath = scene.elapsed + 440;
      for (const ghost of trail) ghost.time = -Infinity;
    },
    update(clock) {
      const now = scene.elapsed;
      const state = scene.ninja;
      const reduced = scene.ui.reduceMotion;
      const player = scene.player;
      if (scene.ui.costume !== costume) {
        const previous = texture;
        costume = scene.ui.costume;
        texture = loadShadowArt(scene, costume);
        for (const image of [hero, echo, ...trail.map((item) => item.image)])
          image.setTexture(texture, "idle0");
        if (previous !== texture && previous !== 'shadow-ninja') scene.textures.remove(previous);
      }
      const travel = Math.abs(player.x - previousX);
      previousX = player.x;
      const grounded = scene.animationState.grounded;
      player.setVisible(false);
      let name = poses[scene.visualPose] ?? scene.visualPose;
      const technique=techniquePose(state,now);
      if (name === "hurt" || name === "respawn") name = "idle";
      if (scene.complete) name = costume === 'dawn' || costume === 'silver' ? 'victoryBow' : 'victory';
      else if (state.dash) name = state.dash.air ? "dashAir" : "dashGround";
      else if (technique) name=technique[0];
      else if (state.attack) {
        const {air,sprint,counter,index,since,queued,dive}=state.attack;
        name=dive?'diveSlash':counter?'dodgeCounter':sprint?'sprintAttack':air?['airSlash','airFollow','airHeavy'][index]:
          queued&&now-since>=KATANA[index].duration-45?'comboLink':KATANA[index].pose;
      }
      else if (state.parry) name = state.parry.success ? 'parrySuccess' : 'parryStart';
      else if (state.throw) name = "throw";
      else if (now < afterDeath) name = "respawn";
      else if (state.wallSlide) name = 'wallSlide';
      else if (now < state.wallJumpUntil) name = 'wallJump';
      else if (grounded && now < state.dashBrakeUntil) name = 'dashBrake';
      else if (!grounded && now < state.sprintJumpUntil) name = 'sprintJump';
      else if (state.sprint) name=now-state.sprintSince<160?'sprintStart':'sprintLoop';
      else if (grounded&&now-(state.sprintStop??-Infinity)<135) name='sprintStop';
      else if (grounded && now < scene.landUntil) name = "land";
      if (name !== lastPose) {
        lastPose = name;
        started = now;
      }
      if (name === "run" || name==='sprintLoop') runDistance += Math.min(travel, 8);
      if (scene.complete) victoryAt ??= clock;
      const spec = state.attack && (state.attack.dive ? AIR_DIVE : KATANA[state.attack.index]);
      const age =
        scene.complete
          ? clock - victoryAt
          : state.dash
            ? now - state.dash.since
            : state.attack
              ? now - state.attack.since
              : state.throw
                ? now - state.throw.since
                : now - started;
      const duration =
        clips[name] ??
        spec?.duration ??
        (state.dash ? DASH.duration : SHURIKEN.duration);
      const looping = name === "idle" || name === "run" || name==='sprintLoop' || name==='wallSlide';
      const impactAge =
        spec && state.lastHit ? state.lastHit.time - state.attack.since : -1;
      const holdStrike =
        !reduced &&
        now < state.holdUntil &&
        spec &&
        impactAge >= spec.open &&
        impactAge < spec.close &&
        age < spec.close;
      const anchoredAge =
        reduced && name === "idle"
          ? 0
          : name==='sprintLoop' ? runDistance*clips.sprintLoop/32
          : technique ? technique[1]
          : name==='comboLink' ? Math.max(0,age-(spec.duration-45))
          : name === "run"
            ? (runDistance * clips.run) / 32
            : holdStrike
              ? impactAge
              : age;
      if (
        now >= state.holdUntil ||
        reduced ||
        name === "victory" ||
        state.dash ||
        state.attack
      ) {
        hero.setFrame(
          clipFrame(shadowClips, name, anchoredAge, duration, looping),
        );
      }
      hero
        .setPosition(Math.round(player.x), Math.round(player.y))
        .setFlipX(player.flipX);

      if ((state.dash || state.special?.kind==='execution' && now-state.special.since>=56 &&
        now-state.special.since<360) && !reduced && now - lastTrail >= 35) {
        const ghost = trail[cursor++ % trail.length];
        ghost.time = now;
        lastTrail = now;
        ghost.image
          .setFrame(hero.frame.name)
          .setFlipX(hero.flipX)
          .setPosition(hero.x, hero.y);
      }
      for (const { image, time } of trail) {
        const fade = Math.max(0, (time + 100 - now) / 100);
        image.setVisible(!reduced && fade > 0).setAlpha(0.32 * fade);
      }
      if (dying) {
        const age = now - dying.since;
        const name = age < 57 ? "hurt" : age < 154 ? "knockback" : "death";
        const duration = name === "hurt" ? 57 : name === "knockback" ? 97 : 250;
        const progress =
          name === "hurt" ? age : name === "knockback" ? age - 57 : age - 154;
        echo.setVisible(!reduced && age < 407);
        if (echo.visible)
          echo
            .setFrame(clipFrame(shadowClips, name, progress, duration))
            .setFlipX(dying.flip)
            .setPosition(
              dying.x +
                (dying.flip ? 1 : -1) * Math.min(7, Math.floor(age / 23)),
              dying.y,
            )
            .setAlpha(age < 282 ? 1 : (408 - age) / 126);
      }
      paintEffects(scene,hero,name);
      if (hitboxes) {
        hitboxes.clear();
        const { attack, special, projectiles } = state;
        if (attack) {
          const attackSpec = attack.dive ? AIR_DIVE : KATANA[attack.index];
          const age = now - attack.since;
          if (age >= attackSpec.open && age < attackSpec.close) {
            const reach = attack.sprint || attack.counter ? { ...attackSpec, w:attackSpec.w + 6 } : attackSpec;
            const box = strikeBox(reach, player.x, player.y, attack.direction);
            hitboxes.lineStyle(1, 0x64e5ff, .85)
              .strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
          }
        }
        if (special && !special.interrupted && special.kind !== 'charged' && activeWindows(special, now).length) {
          const radius = special.kind === 'execution' ? 48 : 30 + (scene.ui.shadowTier('cyclone') ? 6 : 0);
          hitboxes.lineStyle(1, 0xfcbedd, .85).strokeCircle(player.x, player.y - 14, radius);
        }
        for (const shot of projectiles) {
          if (shot.active) hitboxes.lineStyle(1, 0xfdd29a, .85).strokeCircle(shot.x, shot.y, shot.kind === 'charged' ? 5 : 3);
        }
        scene.ui.onShadowStatus(name, state);
      }
    },
  };
}

function paintEffects(scene,hero,pose) {
  const { attack, effect, spark, lastHit } = scene.ninja;
  const now = scene.elapsed;
  const reduced = scene.ui.reduceMotion;
  if (effect.commandBuffer.length) effect.clear();
  const {special,charging}=scene.ninja;
  if(charging) {
    effect.fillStyle(0xeb92ba,.85).fillRect(hero.x-12,hero.y-4,
      Math.min(24,(now-charging.since-320)/20),2);
  }
  const spec = attack && (attack.dive ? AIR_DIVE : KATANA[attack.index]);
  const swing = spec && now-attack.since>=spec.open && now-attack.since<spec.close;
  const phase = special && now - special.since;
  const tracing = special && !special.interrupted &&
    SPECIALS[special.kind].windows.some(([open, close]) => phase >= open && phase < close);
  if(swing || tracing){
    const frame=Number(hero.frame.name.slice(pose.length));
    const frames=shadowFrames[pose];
    const current=frames?.[frame],previous=frames?.[Math.max(0,frame-1)];
    if(current?.blade&&previous?.blade){
      const side=hero.flipX?-1:1;
      const x=value=>hero.x+(value-32)*SIZE*side;
      const y=value=>hero.y+(value-74)*SIZE;
      const heavy = attack?.index === 2 || pose === 'executionFinal';
      const costume = scene.ui.costume;
      const trail = costume === 'jade' ? 0x84e3ab : costume === 'plum' ? 0xe2acff
        : costume === 'dawn' ? 0xffcf91 : costume === 'silver' ? 0xd9f6ff : special || heavy ? 0xef7498 : 0xaedfed;
      effect.fillStyle(trail,.65);
      effect.fillTriangle(x(current.hand[0]),y(current.hand[1]),x(previous.blade[0]),y(previous.blade[1]),x(current.blade[0]),y(current.blade[1]));
      effect.lineStyle(1,0xffecd1,.92).lineBetween(x(current.hand[0]),y(current.hand[1]),x(current.blade[0]),y(current.blade[1]));
      if (!reduced) effect.fillStyle(0xd9f1fa, .75)
        .fillRect(Math.round(x(current.blade[0])) - 1, Math.round(y(current.blade[1])), heavy ? 3 : 2, 1);
    }
  }
  if (spark.commandBuffer.length) spark.clear();
  if (!lastHit || now >= lastHit.time + 120) return;
  const { x, y, direction, heavy } = lastHit;
  const radius = heavy ? 10 : 6;
  spark
    .fillStyle(
      heavy ? 0xffbb90 : 0xe1fbff,
      reduced ? 0.75 : 1 - (now - lastHit.time) / 150,
    )
    .fillTriangle(x - 2, y - 4, x + direction * radius, y - 2, x - 2, y + 3)
    .fillRect(x - 1, y - 5, 2, 10);
}
