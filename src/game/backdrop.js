import Phaser from 'phaser';
import { createArt, createThemeArt } from './art.js';
import { VIEW_HEIGHT } from './level-one.js';

export function terrainTexture(theme, key) {
  return theme === 'verdant' ? key : theme + '-' + key;
}

export function createBackdrop(scene, theme = 'verdant') {
  if (!scene.textures.exists('hero-idle')) createArt(scene);
  createThemeArt(scene, theme);
  const sky = scene.add.image(0, 0, terrainTexture(theme, 'sky')).setOrigin(0).setScrollFactor(0).setDepth(-12);
  const sun = scene.add.image(0, theme === 'canyon' ? 42 : 23, terrainTexture(theme, 'sun'))
    .setOrigin(0.5, 0).setScrollFactor(0).setDepth(-11);
  const layers = [
    ['clouds', 0.12], ['mountains', 0.22], ['hills', 0.39], ['pines', 0.58],
  ].map(([key, speed], index) => ({
    speed,
    image: scene.add.tileSprite(0, 0, scene.scale.width, VIEW_HEIGHT, terrainTexture(theme, key))
      .setOrigin(0).setScrollFactor(0).setDepth(-10 + index),
  }));

  return {
    layers,
    resize() {
      sky.setDisplaySize(scene.scale.width, VIEW_HEIGHT);
      layers.forEach(({ image }) => image.setSize(scene.scale.width, VIEW_HEIGHT));
    },
    scroll(position, daylight, drift = 0) {
      sun.x = Math.round(Phaser.Math.Clamp(daylight - position * 0.032, 25, scene.scale.width - 25));
      layers.forEach(({ image, speed }, index) => {
        const offset = Math.floor(position * speed + (index === 0 ? drift : 0));
        // Phaser marks the Canvas tile dirty even when the offset has not moved.
        if (image.tilePositionX !== offset) image.tilePositionX = offset;
      });
    },
  };
}
