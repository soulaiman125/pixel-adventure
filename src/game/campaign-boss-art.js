import { atlas, clipFrame, pixelPen } from "./prototype-sprites.js";

const CLIPS = { idle: 4, wind: 4, strike: 5, open: 4, hurt: 3, defeat: 6 };

function paint(ctx, ox, oy, clip, frame, queen) {
  const { rect: r, shape: s } = pixelPen(ctx, ox, oy);
  const ink = "#171b2e",
    shadow = queen ? "#293d3d" : "#302740",
    mid = queen ? "#607a64" : "#65546f";
  const edge = queen ? "#a7c28b" : "#a99ab2",
    gold = queen ? "#e1cb8c" : "#d9af70";
  const y =
    clip === "defeat"
      ? frame * 4
      : clip === "hurt"
        ? 1
        : clip === "idle"
          ? frame % 2
          : clip === "wind"
            ? -Math.min(3, frame)
            : 0;
  const x = 40 + (clip === "hurt" ? -frame : 0);
  const dead = clip === "defeat";
  const reach =
    clip === "wind"
      ? frame * 2
      : clip === "strike"
        ? [5, 9, 8, 3, 0][frame]
        : 0;
  const core =
    clip === "open" || clip === "hurt"
      ? "#ffe4a4"
      : queen
        ? "#b8e48b"
        : "#c6acdd";
  if (dead && frame === 5) {
    s(ink, [4, 78], [12, 68], [23, 71], [33, 65], [49, 69], [58, 67], [75, 78]);
    r(mid, 14, 73, 21, 4);
    r(gold, 38, 71, 14, 3);
    r(edge, 51, 75, 12, 2);
    return;
  }
  for (const side of [-1, 1]) {
    const arm = x + side * (23 + reach);
    if (queen) {
      s(
        ink,
        [x + side * 10, 43 + y],
        [arm + side * 10, 20 + y - reach],
        [arm + side * 14, 12 + y - reach],
        [arm + side * 13, 40 + y],
        [x + side * 25, 63 + y],
        [x + side * 14, 67 + y],
      );
      s(
        mid,
        [x + side * 13, 43 + y],
        [arm + side * 10, 23 + y - reach],
        [arm + side * 11, 18 + y - reach],
        [arm + side * 10, 39 + y],
        [x + side * 23, 58 + y],
      );
      s(
        edge,
        [arm + side * 10, 24 + y - reach],
        [arm + side * 6, 39 + y],
        [x + side * 17, 50 + y],
        [arm + side * 7, 33 + y],
      );
      r(gold, arm + side * 6, 34 + y, 2, 4);
    } else {
      s(
        ink,
        [x + side * 11, 26 + y],
        [arm + side * 5, 30 + y],
        [arm + side * 8, 47 + y],
        [x + side * 28, 59 + y],
        [x + side * 22, 56 + y],
        [arm, 43 + y],
        [x + side * 13, 40 + y],
      );
      s(
        mid,
        [x + side * 13, 28 + y],
        [arm + side * 3, 32 + y],
        [arm + side * 5, 44 + y],
        [x + side * 26, 55 + y],
        [x + side * 23, 52 + y],
        [arm - side * 3, 42 + y],
      );
      r(edge, arm - 3, 34 + y, 6, 2);
      r(gold, arm - 3, 42 + y, 6, 2);
    }
  }
  // Segmented robe and overlapping armor give the silhouette weight.
  s(
    ink,
    [x - 14, 30 + y],
    [x + 14, 30 + y],
    [x + 20, 48 + y],
    [x + 18, 63 + y],
    [x + 27, 78],
    [x - 28, 78],
    [x - 18, 64 + y],
    [x - 20, 49 + y],
  );
  s(
    shadow,
    [x - 12, 33 + y],
    [x + 12, 33 + y],
    [x + 17, 49 + y],
    [x + 15, 63 + y],
    [x + 21, 76],
    [x - 22, 76],
    [x - 15, 63 + y],
    [x - 17, 49 + y],
  );
  for (let strip = -2; strip <= 2; strip++) {
    const xx = x + strip * 7;
    s(
      strip % 2 ? mid : shadow,
      [xx - 3, 51 + y],
      [xx + 3, 51 + y],
      [xx + 5, 74],
      [xx - 5, 74],
    );
    r(edge, xx - 2, 56 + y, 1, 10);
    r(gold, xx - 2, 73, 4, 1);
  }
  s(
    ink,
    [x - 15, 31 + y],
    [x + 15, 31 + y],
    [x + 14, 45 + y],
    [x + 8, 54 + y],
    [x - 8, 54 + y],
    [x - 14, 45 + y],
  );
  s(
    mid,
    [x - 12, 33 + y],
    [x + 12, 33 + y],
    [x + 10, 44 + y],
    [x + 4, 50 + y],
    [x - 4, 50 + y],
    [x - 10, 44 + y],
  );
  r(edge, x - 10, 34 + y, 8, 2);
  r(edge, x + 4, 34 + y, 5, 1);
  r(gold, x - 12, 42 + y, 24, 2);
  s(
    ink,
    [x, 39 + y],
    [x + 8, 45 + y],
    [x + 6, 53 + y],
    [x, 57 + y],
    [x - 6, 53 + y],
    [x - 8, 45 + y],
  );
  s(
    core,
    [x, 42 + y],
    [x + 5, 46 + y],
    [x + 3, 51 + y],
    [x, 53 + y],
    [x - 3, 51 + y],
    [x - 5, 46 + y],
  );
  r("#f7f5d9", x - 1, 46 + y, 2, 3);
  const maskY = queen ? 24 + y : 22 + y;
  s(
    ink,
    [x - 13, maskY - 9],
    [x - 8, maskY - 16],
    [x + 7, maskY - 16],
    [x + 13, maskY - 9],
    [x + 12, maskY + 3],
    [x + 6, maskY + 10],
    [x - 6, maskY + 10],
    [x - 12, maskY + 3],
  );
  s(
    mid,
    [x - 10, maskY - 8],
    [x - 6, maskY - 13],
    [x + 6, maskY - 13],
    [x + 10, maskY - 8],
    [x + 9, maskY + 2],
    [x + 5, maskY + 6],
    [x - 5, maskY + 6],
    [x - 9, maskY + 2],
  );
  s(
    edge,
    [x - 9, maskY - 8],
    [x - 5, maskY - 12],
    [x + 5, maskY - 12],
    [x + 8, maskY - 9],
    [x + 2, maskY - 10],
    [x - 6, maskY - 6],
  );
  r(ink, x - 7, maskY - 3, 14, 4);
  r(core, x - 6, maskY - 2, 4, 1);
  r(core, x + 3, maskY - 2, 4, 1);
  r(shadow, x - 3, maskY + 3, 6, 2);
  if (queen) {
    for (const side of [-1, 1]) {
      s(
        ink,
        [x + side * 3, maskY - 13],
        [x + side * 10, maskY - 24],
        [x + side * 20, maskY - 26],
        [x + side * 17, maskY - 17],
        [x + side * 8, maskY - 10],
      );
      s(
        mid,
        [x + side * 6, maskY - 13],
        [x + side * 12, maskY - 22],
        [x + side * 17, maskY - 23],
        [x + side * 14, maskY - 17],
      );
      r(gold, x + side * 12, maskY - 20, 2, 2);
    }
  } else {
    s(
      ink,
      [x - 16, maskY - 10],
      [x - 18, maskY - 23],
      [x - 10, maskY - 18],
      [x - 4, maskY - 28],
      [x, maskY - 19],
      [x + 7, maskY - 27],
      [x + 12, maskY - 17],
      [x + 19, maskY - 23],
      [x + 16, maskY - 10],
    );
    s(
      gold,
      [x - 13, maskY - 11],
      [x - 15, maskY - 20],
      [x - 9, maskY - 15],
      [x - 4, maskY - 24],
      [x, maskY - 16],
      [x + 7, maskY - 23],
      [x + 11, maskY - 14],
      [x + 16, maskY - 20],
      [x + 14, maskY - 11],
    );
    r("#fff0ba", x - 10, maskY - 12, 20, 1);
  }
  if (clip === "wind" || clip === "strike") {
    const glow = queen ? "#c4e9a2" : "#ead5fa";
    r(glow, x - 23 - reach, 26 + y, 2, 3);
    r(glow, x + 22 + reach, 31 + y, 2, 2);
  }
}

export function addCampaignBoss(scene, boss) {
  const key = "campaign-boss-" + boss.kind;
  // Top padding preserves crown and horn tips during the lifted wind-up.
  // The equal atlas/paint offset keeps the feet at their original anchor.
  atlas(scene, key, 80, 88, CLIPS, (ctx, x, y, clip, frame) =>
    paint(ctx, x, y + 8, clip, frame, boss.kind === "queen"),
  );
  const image = scene.add
    .image(boss.x, 184, key, "idle0")
    .setOrigin(0.5, 1)
    .setDepth(3.2);
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
