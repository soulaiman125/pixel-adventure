import { createThemeArt } from "./art.js";
import { VIEW_HEIGHT } from "./level-one.js";

export function preloadWorlds(scene) {
  for (const theme of [
    "canyon",
    "crystal",
    "fire",
    "castle",
    "jungle",
    "thunder",
  ]) {
    const key = "campaign-world-" + theme;
    if (!scene.textures.exists(key))
      scene.load.image(
        key,
        import.meta.env.BASE_URL + "worlds/" + theme + ".webp",
      );
  }
}

export function createCampaignBackdrop(scene, theme) {
  const key = "campaign-world-" + theme;
  if (!scene.textures.exists(key)) return null;
  createThemeArt(scene, theme);
  const vista = scene.add
    .image(0, 0, key)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-12);
  const mist = scene.add
    .tileSprite(0, 0, scene.scale.width, VIEW_HEIGHT, theme + "-pines")
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-10)
    .setAlpha(0.18);
  if (!scene.textures.exists("campaign-vignette")) {
    const texture = scene.textures.createCanvas(
      "campaign-vignette",
      2,
      VIEW_HEIGHT,
    );
    const gradient = texture.context.createLinearGradient(
      0,
      90,
      0,
      VIEW_HEIGHT,
    );
    gradient.addColorStop(0, "rgba(9,16,32,0)");
    gradient.addColorStop(1, "rgba(9,16,32,.24)");
    texture.context.fillStyle = gradient;
    texture.context.fillRect(0, 0, 2, VIEW_HEIGHT);
    texture.refresh();
  }
  const shade = scene.add
    .image(0, 0, "campaign-vignette")
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-9);
  let span = 0;
  let visible = true;
  return {
    layers: [{ image: vista }, { image: mist }],
    resize() {
      span = Math.max(360, scene.scale.width + 80);
      const height = Math.ceil((span * 2) / 3);
      vista
        .setDisplaySize(span, height)
        .setY(-Math.round((height - VIEW_HEIGHT) * 0.18));
      mist.setSize(scene.scale.width, VIEW_HEIGHT);
      shade.setDisplaySize(scene.scale.width, VIEW_HEIGHT);
    },
    scroll(position) {
      vista.x =
        Math.round((scene.scale.width - span) / 2) -
        Math.min(28, Math.round(position * 0.018));
      const offset = Math.round(position * 0.31);
      if (mist.tilePositionX !== offset) mist.tilePositionX = offset;
    },
    setVisible(next) {
      if (visible === next) return;
      visible = next;
      vista.setVisible(next);
      mist.setVisible(next);
      shade.setVisible(next);
    },
  };
}
