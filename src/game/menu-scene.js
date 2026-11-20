import Phaser from 'phaser';
import { createArt } from './art.js';
import { preloadPrototype } from './prototype-world.js';
import { preloadPaintedSprites } from './rendering/painted-parts.js';
import { preloadWorlds } from './campaign-backdrop.js';

export class MenuScene extends Phaser.Scene {
  constructor(onReady, onFailure) {
    super('menu');
    this.onReady = onReady;
    this.onFailure = onFailure;
  }

  preload() {
    this.load.on('loaderror', this.failed, this);
    this.load.once('complete', () => this.load.off('loaderror', this.failed, this));
    preloadPrototype(this);
    preloadWorlds(this);
    preloadPaintedSprites(this);
  }

  failed(file) {
    this.onFailure(new Error('Could not load game artwork: ' + file.key));
  }

  create() {
    try {
      if (!this.textures.exists('hero-idle')) createArt(this);
      this.onReady();
    } catch (error) {
      this.onFailure(error);
    }
  }
}
