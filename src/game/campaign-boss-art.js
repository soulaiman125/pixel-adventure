import { clipFrame } from './prototype-sprites.js';

import { lightProp } from './rendering/light-rig.js';
import { expandedClips, paintedAtlas } from './rendering/painted-atlas.js';
import { paintBoss } from './rendering/painted-boss.js';

const CLIPS = expandedClips({idle:4,wind:4,strike:5,open:4,hurt:3,defeat:6},new Set(['idle','open']));

export function addCampaignBoss(scene, boss) {
  const key = "campaign-boss-" + boss.kind;
  paintedAtlas(scene,key,80,88,CLIPS,(ctx,x,y,clip,frame,count,palette)=>
    paintBoss(palette,ctx,x,y,80,88,boss.kind,clip,frame,count));
  const image = scene.add
    .image(boss.x, 184, key, "idle0")
    .setOrigin(0.5, 1)
    .setDepth(3.2);
  lightProp(scene,image);
  const cue = scene.add.graphics().setDepth(3.4);
  let defeated;
  return {
    update() {
      const time = scene.elapsed,
        state = boss.phase,
        reduced = scene.ui.reduceMotion;
      const exposed = state === "open" && boss.hits < 2;
      if (state === "defeated") defeated ??= time;
      else defeated = undefined;
      const clip =
        state === "defeated"
          ? "defeat"
          : time < boss.flashUntil
            ? "hurt"
            : exposed
              ? "open"
              : state === "warn"
                ? "wind"
                : state === "attack"
                  ? "strike"
                  : "idle";
      const age =
        clip === "defeat"
          ? (boss.finishAge ?? time - defeated)
          : clip === "hurt"
            ? time - (boss.flashUntil - 145)
            : state === "warn" || state === "attack"
              ? time - boss.since
              : time;
      const duration =
        clip === "defeat"
          ? 650
          : clip === "hurt"
            ? 145
            : state === "warn"
              ? boss.profile.warning
              : state === "attack"
                ? boss.profile.attack
                : 900;
      image.setFrame(
        clipFrame(
          CLIPS,
          clip,
          reduced && clip === "idle" ? 0 : age,
          duration,
          ["idle", "open"].includes(clip),
        ),
      );
      cue.clear();
      if (exposed)
        cue.lineStyle(1, 0xffd58b, 0.85).strokeRect(boss.x - 14, 153, 28, 28);
      if (state === "attack")
        cue.lineStyle(1, 0xf7c9d6, 0.9).strokeRect(boss.x - 13.5, 158, 27, 24);
    },
  };
}
