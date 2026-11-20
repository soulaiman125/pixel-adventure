import { atlas, clipFrame, pixelPen } from "./prototype-sprites.js";

const STEPS = [
  [-4, 4],
  [-2, 3],
  [1, 0],
  [3, -2],
  [4, -4],
  [2, -3],
  [0, 1],
  [-3, 2],
];
const CLIPS = { patrol: 8, prepare: 4, strike: 4, hurt: 3, death: 5 };
const PALETTES = {
  verdant: ["#263330", "#4d5b48", "#83916d", "#c8d4a3", "#a98b5b"],
  canyon: ["#372d3e", "#75525c", "#af8075", "#edbf92", "#ce9b63"],
  crystal: ["#202b46", "#4b668a", "#7fabc1", "#d5edf0", "#a6aecc"],
  fire: ["#332639", "#6d414f", "#bd6e61", "#f4bf8c", "#da8a54"],
  castle: ["#242437", "#4c4265", "#8b7197", "#d9c1cc", "#b6a071"],
  jungle: ["#252d35", "#4e6252", "#85a571", "#d4d8a1", "#ac8663"],
  thunder: ["#22263e", "#455776", "#839eb2", "#d2eeeb", "#ae885f"],
};

function creature(ctx, ox, oy, clip, frame, type, theme) {
  const { rect: r, shape: s } = pixelPen(ctx, ox, oy);
  const [ink, shade, metal, light, gold] = PALETTES[theme];
  const bat = ["flying", "bat", "demon"].includes(type);
  const slug = [undefined, "ice"].includes(type);
  const recoil = clip === "hurt" ? -2 : 0;
  const dead = clip === "death";
  const y = dead
    ? Math.min(11, frame * 3)
    : clip === "patrol"
      ? frame % 4 === 1
        ? 1
        : 0
      : 0;
  if (dead && frame === 4) {
    s(ink, [4, 38], [7, 32], [17, 34], [24, 31], [33, 38]);
    r(metal, 9, 35, 8, 2);
    r(gold, 22, 34, 5, 2);
    return;
  }
  if (bat) {
    const x = 20 + recoil;
    const wing =
      clip === "prepare"
        ? 5
        : clip === "strike"
          ? 0
          : [-7, -4, 2, 6, 5, 1, -3, -6][frame % 8];
    for (const side of [-1, 1]) {
      s(
        ink,
        [x + side * 5, 24 + y],
        [x + side * 12, 13 + wing + y],
        [x + side * 19, 11 + wing + y],
        [x + side * 17, 27 + y],
        [x + side * 12, 23 + y],
        [x + side * 7, 30 + y],
      );
      s(
        type === "demon" ? "#9b5867" : shade,
        [x + side * 6, 24 + y],
        [x + side * 12, 16 + wing + y],
        [x + side * 17, 14 + wing + y],
        [x + side * 14, 24 + y],
        [x + side * 10, 22 + y],
      );
      r(gold, x + side * 12, 17 + wing + y, 2, 1);
    }
    s(
      ink,
      [x - 7, 17 + y],
      [x - 8, 11 + y],
      [x - 2, 15 + y],
      [x + 4, 14 + y],
      [x + 8, 10 + y],
      [x + 7, 24 + y],
      [x + 5, 31 + y],
      [x, 34 + y],
      [x - 5, 30 + y],
    );
    s(
      shade,
      [x - 5, 18 + y],
      [x - 1, 17 + y],
      [x + 5, 17 + y],
      [x + 4, 28 + y],
      [x, 30 + y],
      [x - 4, 28 + y],
    );
    s(
      metal,
      [x - 4, 19 + y],
      [x + 3, 18 + y],
      [x + 4, 22 + y],
      [x, 26 + y],
      [x - 4, 24 + y],
    );
    r("#e9b997", x - 4, 20 + y, 3, 2);
    r("#e9b997", x + 2, 20 + y, 3, 2);
    r(ink, x - 4, 23 + y, 9, 3);
    r(light, x - 2, 24 + y, 1, 3);
    r(light, x + 3, 24 + y, 1, 3);
    return;
  }
  if (slug) {
    const x = 19 + recoil;
    const lean = clip === "strike" ? frame - 1 : 0;
    s(
      ink,
      [x - 15, 37],
      [x - 15, 27 + y],
      [x - 10, 20 + y],
      [x + 1, 18 + y],
      [x + 10, 23 + y],
      [x + 16 + lean, 31 + y],
      [x + 16, 37],
    );
    s(
      shade,
      [x - 13, 35],
      [x - 13, 28 + y],
      [x - 9, 22 + y],
      [x, 20 + y],
      [x + 10, 25 + y],
      [x + 14, 32 + y],
      [x + 13, 35],
    );
    s(
      metal,
      [x - 11, 28 + y],
      [x - 7, 23 + y],
      [x + 1, 22 + y],
      [x + 6, 25 + y],
      [x - 1, 26 + y],
      [x - 6, 30 + y],
    );
    r(light, x - 7, 24 + y, 4, 1);
    r(ink, x + 3, 28 + y, 3, 4);
    r(ink, x + 10, 28 + y, 3, 4);
    r("#f2e6b9", x + 3, 28 + y, 2, 2);
    r("#f2e6b9", x + 10, 28 + y, 2, 2);
    r(gold, x - 12 + (frame % 2), 36, 4, 2);
    r(gold, x + 9 - (frame % 2), 36, 5, 2);
    return;
  }
  const heavy = ["golem", "sentinel", "guard", "knight"].includes(type);
  const machine = ["robot", "sentinel"].includes(type);
  const plant = ["poison", "stalker"].includes(type);
  const x = 20 + recoil + (clip === "strike" ? 2 : 0);
  const step = clip === "patrol" ? STEPS[frame] : [-3, 3];
  for (const [index, offset] of step.entries()) {
    const foot = x + offset * 1.4;
    s(
      ink,
      [x - 6 + index * 8, 25 + y],
      [x - 1 + index * 8, 25 + y],
      [foot + 3, 33 + y],
      [foot + 5, 35 + y],
      [foot + 5, 38],
      [foot - 4, 38],
      [foot - 4, 34 + y],
    );
    s(
      shade,
      [x - 4 + index * 8, 26 + y],
      [x - 1 + index * 8, 26 + y],
      [foot + 1, 34 + y],
      [foot - 2, 35 + y],
    );
    r(metal, foot - 2, 35, 6, 2);
    r(light, foot - 1, 35, 3, 1);
  }
  // A fitted cuirass, layered waist plates and strapped shoulder guards.
  s(
    ink,
    [x - 8, 15 + y],
    [x + 7, 15 + y],
    [x + 11, 21 + y],
    [x + 8, 29 + y],
    [x - 7, 29 + y],
    [x - 11, 21 + y],
  );
  s(
    shade,
    [x - 7, 17 + y],
    [x + 6, 17 + y],
    [x + 8, 21 + y],
    [x + 5, 27 + y],
    [x - 5, 27 + y],
    [x - 8, 21 + y],
  );
  s(
    metal,
    [x - 6, 17 + y],
    [x + 5, 17 + y],
    [x + 4, 21 + y],
    [x, 24 + y],
    [x - 5, 22 + y],
  );
  r(light, x - 5, 17 + y, 7, 1);
  r(gold, x - 6, 25 + y, 12, 2);
  r(ink, x + 1, 25 + y, 2, 2);
  const swing = clip === "prepare" ? frame : clip === "strike" ? 5 - frame : 0;
  const handX = x + 10 + (clip === "strike" ? 4 : 0);
  const handY = 24 + y - swing * 2;
  s(
    ink,
    [x + 6, 17 + y],
    [x + 10, 17 + y],
    [handX + 4, handY - 2],
    [handX + 3, handY + 4],
    [handX - 2, handY + 4],
    [x + 3, 21 + y],
  );
  s(
    metal,
    [x + 6, 18 + y],
    [x + 9, 18 + y],
    [handX + 2, handY],
    [handX, handY + 2],
    [x + 5, 21 + y],
  );
  r(light, handX, handY, 2, 1);
  if (machine) {
    r(ink, handX, handY - 3, 10, 5);
    r(metal, handX + 1, handY - 2, 8, 2);
    r("#99e4ed", handX + 7, handY - 2, 2, 1);
  } else if (plant) {
    s(
      ink,
      [handX - 2, handY],
      [handX + 5, handY - 6],
      [handX + 9, handY - 4],
      [handX + 10, handY],
      [handX + 6, handY + 3],
    );
    s(
      "#8bab68",
      [handX, handY],
      [handX + 5, handY - 4],
      [handX + 8, handY - 3],
      [handX + 7, handY + 1],
    );
    r("#d8c59a", handX + 4, handY - 3, 2, 2);
  } else if (!["charger", "assassin"].includes(type)) {
    s(
      ink,
      [handX, handY],
      [handX + 1, handY - 16],
      [handX + 3, handY - 19],
      [handX + 5, handY - 15],
      [handX + 4, handY],
    );
    s(
      light,
      [handX + 2, handY],
      [handX + 2, handY - 15],
      [handX + 3, handY - 17],
      [handX + 4, handY - 14],
    );
    r(gold, handX - 2, handY, 8, 2);
  }
  s(
    ink,
    [x - 7, 14 + y],
    [x - 8, 5 + y],
    [x - 4, 1 + y],
    [x + 5, 1 + y],
    [x + 9, 5 + y],
    [x + 10, 12 + y],
    [x + 5, 17 + y],
    [x - 4, 17 + y],
  );
  s(
    shade,
    [x - 5, 13 + y],
    [x - 6, 6 + y],
    [x - 3, 3 + y],
    [x + 4, 3 + y],
    [x + 7, 6 + y],
    [x + 7, 12 + y],
    [x + 3, 15 + y],
  );
  s(
    metal,
    [x - 5, 6 + y],
    [x - 2, 3 + y],
    [x + 4, 3 + y],
    [x + 7, 6 + y],
    [x + 2, 6 + y],
    [x - 3, 9 + y],
  );
  r(light, x - 1, 3 + y, 4, 1);
  r(ink, x - 2, 8 + y, 10, 3);
  r(plant ? "#e0e9a7" : machine ? "#9de9f1" : "#eabca5", x + 2, 9 + y, 5, 1);
  r(gold, x - 1, 13 + y, 6, 1);
  if (heavy) {
    s(
      ink,
      [x - 12, 17 + y],
      [x - 6, 15 + y],
      [x - 2, 20 + y],
      [x - 4, 31 + y],
      [x - 8, 34 + y],
      [x - 13, 29 + y],
    );
    s(
      metal,
      [x - 11, 18 + y],
      [x - 7, 17 + y],
      [x - 4, 21 + y],
      [x - 5, 29 + y],
      [x - 8, 31 + y],
      [x - 11, 28 + y],
    );
    r(gold, x - 9, 20 + y, 2, 8);
    r(light, x - 10, 20 + y, 1, 6);
  } else if (plant) {
    s(
      "#9fbd76",
      [x - 7, 6 + y],
      [x - 12, 1 + y],
      [x - 5, 3 + y],
      [x - 1, -1 + y],
      [x + 1, 4 + y],
    );
  } else {
    s(
      "#b14d67",
      [x - 6, 13 + y],
      [x - 13, 16 + y],
      [x - 18, 13 + y],
      [x - 15, 18 + y],
      [x - 8, 18 + y],
      [x - 2, 16 + y],
    );
    r("#dc8792", x - 11, 16 + y, 4, 1);
  }
}

export function createCampaignActors(scene) {
  const actors = scene.enemies
    .getChildren()
    .map((body) => {
      const type = body.getData("type");
      if (type === "dummy" || body.getData('ultimateState')) return null;
      const key = "campaign-" + scene.level.theme + "-" + (type ?? "slime");
      atlas(scene, key, 44, 40, CLIPS, (ctx, x, y, clip, frame) =>
        creature(ctx, x, y, clip, frame, type, scene.level.theme),
      );
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
  for (const { image } of actors) {
    scene.swamp?.light?.(image);
    scene.swamp?.cast?.(image);
  }
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
              : "patrol";
        const age = hurt
          ? now - (data.shadowHitUntil - 240)
          : brain
            ? now - (brain.until - 650)
            : now;
        image
          .setFrame(
            clipFrame(
              CLIPS,
              clip,
              reduced && clip === "patrol" ? 0 : age,
              clip === "patrol" ? 560 : clip === "prepare" ? 650 : 240,
              true,
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
