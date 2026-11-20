import { clipFrame, pixelPen } from "./prototype-sprites.js";
import { lightProp } from './rendering/light-rig.js';
import { expandedClips, paintedAtlas } from './rendering/painted-atlas.js';
import { paintEnemy } from './rendering/painted-enemy.js';

const loops = new Set(['idle','patrol']);
const CLIPS = expandedClips({idle:5,patrol:8,air:4,prepare:4,strike:4,hurt:3,death:5},loops);
const PALETTES = {
  verdant: ["#263330", "#4d5b48", "#83916d", "#c8d4a3", "#a98b5b"],
  canyon: ["#372d3e", "#75525c", "#af8075", "#edbf92", "#ce9b63"],
  crystal: ["#202b46", "#4b668a", "#7fabc1", "#d5edf0", "#a6aecc"],
  fire: ["#332639", "#6d414f", "#bd6e61", "#f4bf8c", "#da8a54"],
  castle: ["#242437", "#4c4265", "#8b7197", "#d9c1cc", "#b6a071"],
  jungle: ["#252d35", "#4e6252", "#85a571", "#d4d8a1", "#ac8663"],
  thunder: ["#22263e", "#455776", "#839eb2", "#d2eeeb", "#ae885f"],
};

export function createCampaignActors(scene) {
  const actors = scene.enemies
    .getChildren()
    .map((body) => {
      const type = body.getData("type");
      if (type === "dummy" || body.getData('ultimateState')) return null;
      const key = "campaign-" + scene.level.theme + "-" + (type ?? "slime");
      paintedAtlas(scene,key,44,40,CLIPS,(ctx,x,y,clip,frame,count,palette)=>
        paintEnemy(palette,ctx,x,y,44,40,type??'slime',clip,frame,count));
      return {
        body,
        image: scene.add
          .image(body.x, body.y, key, "patrol0")
          .setOrigin(0.5, 1)
          .setScale(0.86)
          .setDepth(3.1),
      };
    })
    .filter(Boolean);
  for (const { image } of actors) lightProp(scene,image);
  return {
    update() {
      const now = scene.elapsed,
        reduced = scene.ui.reduceMotion;
      const camera = scene.cameras.main;
      for (const actor of actors) {
        const { body, image } = actor;
        body.setVisible(false);
        const visible = body.x >= camera.scrollX - 32
          && body.x <= camera.scrollX + camera.width + 32;
        if (!body.active) {
          if (actor.death === undefined) actor.death = now;
          const age = now - actor.death;
          image.setVisible(visible && !reduced && age < 360);
          if (image.visible)
            image.setFrame(clipFrame(CLIPS, "death", age, 350));
          continue;
        }
        actor.death = undefined;
        image.setVisible(visible);
        if (!visible) continue;
        image.setAlpha(body.alpha);
        const data = body.data.values;
        const brain = data.brain;
        const hurt = now < (data.shadowHitUntil ?? 0);
        const ready =
          brain?.phase === "prepare" ||
          data.actionAt > now ||
          data.warning?.visible;
        const attacking =
          brain?.phase === "attack" || now < (data.chargeUntil ?? 0);
        const clip = hurt
          ? "hurt"
          : ready
            ? "prepare"
            : attacking
              ? "strike"
              : Math.abs(body.body.velocity.y)>54 ? 'air'
                : Math.abs(body.body.velocity.x)>5 ? 'patrol' : 'idle';
        if (actor.pose !== clip) {
          actor.pose = clip;
          actor.poseAt = now;
        }
        const age = now-actor.poseAt;
        const duration = {idle:850,patrol:560,air:370,prepare:650,strike:240,hurt:240}[clip];
        image
          .setFrame(
            clipFrame(
              CLIPS,
              clip,
              reduced && loops.has(clip) ? 0 : age,
              duration,
              loops.has(clip),
            ),
          )
          .setPosition(Math.round(body.x), Math.round(body.y))
          .setFlipX(body.flipX || body.body.velocity.x < 0);
      }
    },
  };
}

export function campaignSurface(scene, x, y, width, height) {
  const theme = scene.level.theme,
    key =
      "campaign-surface-" + theme + "-" + width + "-" + height + "-" + (x % 31);
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, width, height),
      ctx = texture.context;
    const { rect: r, shape: s } = pixelPen(ctx);
    const [ink, shade, metal, light, gold] = PALETTES[theme];
    const stone = ["castle", "thunder"].includes(theme),
      snow = theme === "crystal";
    r(ink, 0, 0, width, height);
    r(shade, 1, 3, width - 2, height - 4);
    let seed = (x + 31) * 173 + y;
    const next = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    if (stone) {
      for (let row = 3; row < height; row += 9) {
        for (let col = row % 2 ? -9 : 0; col < width; col += 23) {
          r(
            metal,
            Math.max(1, col + 1),
            row,
            Math.min(21, width - Math.max(1, col + 1)),
            1,
          );
          r(ink, Math.max(0, col), row, 1, 8);
          if (theme === "thunder" && next() > 0.6)
            r("#72c8cd", col + 5, row + 3, 6, 1);
        }
      }
    } else {
      for (let n = 0; n < (width * height) / 20; n++) {
        const px = 1 + Math.floor(next() * (width - 3)),
          py = 4 + Math.floor(next() * (height - 6));
        r(next() > 0.55 ? metal : ink, px, py, Math.min(5, width - px - 1), 1);
      }
      for (let col = 3; col < width - 9; col += 17) {
        const py = 7 + Math.floor(next() * Math.max(1, height - 12));
        s(
          ink,
          [col, py + 2],
          [col + 3, py],
          [col + 7, py + 1],
          [col + 9, py + 5],
          [col + 1, py + 6],
        );
        r(metal, col + 2, py + 1, 4, 1);
        r(gold, col + 3, py + 2, 2, 1);
      }
    }
    r(metal, 1, 1, width - 2, 2);
    r(light, 2, 0, width - 4, 1);
    for (let col = 4; col < width - 5; col += 7 + Math.floor(next() * 6)) {
      r(snow ? "#f3fcff" : gold, col, 1, 3, 1);
      if (snow) r("#91c7df", col + 1, 2, 1, 3 + Math.floor(next() * 3));
      if (theme === "verdant" || theme === "jungle")
        r("#627e4e", col, 2, 1, 3 + Math.floor(next() * 4));
    }
    r(ink, 0, 0, 1, 2);
    r(ink, width - 1, 0, 1, 2);
    texture.refresh();
  }
  return scene.add.image(x, y, key).setOrigin(0);
}
