import Phaser from 'phaser';
import { drawMeadow } from './art.js';
import { createBackdrop } from './backdrop.js';

export class MenuScene extends Phaser.Scene {
  constructor(reduceMotion) {
    super('menu');
    this.reduceMotion = reduceMotion;
  }

  create() {
    this.backdrop = createBackdrop(this);
    this.elapsed = 0;
    this.drawLandscape();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.drawLandscape, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.drawLandscape, this);
      this.foreground = undefined;
    });
  }

  drawLandscape() {
    const width = this.scale.width;
    const narrow = width < 220;
    const center = Math.round(width * (narrow ? 0.53 : 0.722));
    const ground = narrow ? 118 : 183;
    const start = Math.max(0, center - 79);
    this.foreground?.destroy(true);
    this.foreground = this.add.container().setDepth(1);
    const add = (object) => this.foreground.add(object);
    const ledge = (x, y, size, key) => add(this.add.tileSprite(x, y, size, key === 'ground' ? 40 : 12, key).setOrigin(0));
    const image = (x, y, key, scale = 1) => {
      const sprite = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale);
      add(sprite);
      return sprite;
    };

    for (const [offset, size] of [[-52, 0.57], [52, 0.83], [87, 0.61]]) {
      image(center + offset, ground + 1, 'tree', size);
    }
    ledge(start, ground, width - start, 'ground');
    add(drawMeadow(this, [[start, width]], ground));
    if (!narrow) ledge(0, ground + 18, Math.max(1, start - 29), 'ground');
    ledge(center - 30, ground - 32, 48, 'platform');
    ledge(center + 34, ground - 59, 39, 'platform');
    image(center + 10, ground - 32, 'hero-idle', 1.25);
    image(center + 49, ground, 'slime-rest');
    image(center + 53, ground - 59, 'flag', 0.58);
    this.coins = [[center - 19, ground - 42], [center + 29, ground - 51], [center + 43, ground - 72]]
      .map(([x, y]) => ({ y, sprite: image(x, y, 'coin-wide', 0.85) }));
    this.backdrop.resize();
    this.paint();
  }

  paint() {
    const time = this.reduceMotion() ? 0 : this.elapsed;
    this.backdrop.scroll(time * 0.007, this.scale.width * 0.77, time * 0.006);
    this.coins.forEach(({ y, sprite }, index) => {
      sprite.y = Math.round(y + Math.sin(time / 270 + index) * 2);
      sprite.setTexture(Math.floor(time / 155 + index) % 4 === 2 ? 'coin-narrow' : 'coin-wide');
    });
  }

  update(_time, delta) {
    this.elapsed = (this.elapsed + delta) % 7680000;
    this.paint();
  }
}
