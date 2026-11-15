import Phaser from 'phaser';
import { drawMeadow } from './art.js';
import { createBackdrop, terrainTexture } from './backdrop.js';
import { GROUND_Y, VIEW_HEIGHT } from './level-one.js';
import { addObstacles, updatePlatforms } from './obstacles.js';
import { addCombat, updateCombat } from './combat.js';
import { EXPANSION_ENEMIES } from './expansion-enemies.js';
import { resetExpansionBoss } from './expansion-bosses.js';
import { createFeedback } from './feedback.js';

const MOVE_SPEED = 132;
const JUMP_SPEED = 263;
const JUMP_BUFFER = 115;
const COYOTE_TIME = 90;
const RESPAWN_GRACE = 750;
const RUN_FRAMES = ['step', 'idle', 'stride', 'idle'];
const COIN_FRAMES = ['wide', 'wide', 'narrow', 'edge', 'narrow'];
const PLATFORM_EDGES = {
  verdant: [0x313f3a, 0xadc975],
  canyon: [0x583644, 0xf4b575],
  crystal: [0x35485f, 0xcaecf7],
  fire: [0x4c293c, 0xffa76d],
  castle: [0x372d4a, 0xc5a3c5],
  jungle: [0x53475b, 0xd4e498],
  thunder: [0x404968, 0xc1f9ff],
};

export class PlatformerScene extends Phaser.Scene {
  constructor(controls, ui) {
    super('platformer');
    this.controls = controls;
    this.ui = ui;
  }

  init({ level }) {
    this.level = level;
  }

  create() {
    this.collected = 0;
    this.deaths = 0;
    this.checkpoint = this.level.spawnX;
    this.complete = false;
    this.invulnerableUntil = 0;
    this.cameraX = 0;
    this.elapsed = 0;
    this.lastSecond = 0;
    this.wasGrounded = false;
    this.lastFallSpeed = 0;
    this.landUntil = 0;
    this.swingUntil = 0;
    this.ambientFrame = -1;
    this.riding = null;
    this.specialPlatforms = [];
    this.resetJump();

    this.backdrop = createBackdrop(this, this.level.theme);
    this.physics.world.setBounds(0, 0, this.level.width, VIEW_HEIGHT, true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.level.width, VIEW_HEIGHT);
    this.createTerrain();
    this.createActors();
    this.feedback = createFeedback(this);
    this.obstacleUpdates = addObstacles(this, this.level.hazards);
    addCombat(this);
    this.createAmbient();
    this.resizeBackdrop();
    this.createContacts();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.ui.onPlayfieldPress);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeBackdrop, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.ui.onPlayfieldPress);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeBackdrop, this);
    });
    this.ui.onReady(this.level.coins.length);
  }

  resetJump() {
    this.controls.consumeJump();
    this.dropWasDown = this.controls.isDown('drop');
    this.jumpUntil = -Infinity;
    this.groundedUntil = -Infinity;
    this.dropUntil = -Infinity;
    this.cuttableJump = false;
  }

  resizeBackdrop() {
    this.backdrop.resize();
    this.moveCamera(1);
  }

  moveCamera(blend) {
    const camera = this.cameras.main;
    const maxScroll = Math.max(0, this.level.width - camera.width);
    const leading = this.ui.reduceMotion ? 0 : this.player.body.velocity.x * 0.13;
    const target = Phaser.Math.Clamp(this.player.x - camera.width * 0.42 + leading, 0, maxScroll);
    this.cameraX = Phaser.Math.Clamp(Phaser.Math.Linear(this.cameraX, target, blend), 0, maxScroll);
    const scroll = Math.round(this.cameraX);
    camera.setScroll(scroll, 0);
    this.backdrop.scroll(scroll, camera.width * 0.79, this.ui.reduceMotion ? 0 : this.elapsed * 0.002);
  }

  createTerrain() {
    for (const [x, scale] of this.level.trees) {
      this.add.image(x, GROUND_Y + 1, terrainTexture(this.level.theme, 'tree')).setOrigin(0.5, 1).setScale(scale).setDepth(-4);
    }
    drawMeadow(this, this.level.ground, GROUND_Y, this.level.theme);
    const ice = this.add.graphics().setDepth(1);
    for (const [start, end] of this.level.ice ?? []) {
      ice.fillStyle(0x9bdcee).fillRect(start, GROUND_Y, end - start, 3);
      for (let x = start + 4; x < end - 9; x += 16) ice.fillStyle(0xeaffff).fillRect(x, GROUND_Y, 9, 1);
    }
    this.checkpointFlags = new Map();
    this.ground = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    for (const [start, end] of this.level.ground) {
      this.addSurface(this.ground, start, GROUND_Y, end - start, 40, 'ground');
      if (start > 0) {
        this.checkpointFlags.set(start, this.add.image(start + 19, GROUND_Y, 'checkpoint').setOrigin(0.25, 1).setDepth(1));
      }
    }
    for (const [x, y, width, kind, a, b, period] of this.level.platforms) {
      const objects = this.addSurface(this.platforms, x, y, width, 12, 'platform', kind);
      if (kind) this.specialPlatforms.push({ ...objects, x, y, kind, a, b, period });
    }
  }

  addSurface(group, x, y, width, height, key, kind) {
    let visual = this.add.tileSprite(x, y, width, height, terrainTexture(this.level.theme, key)).setOrigin(0);
    if (kind) {
      const marker = this.add.graphics();
      marker.fillStyle(0xffe998).fillRect(4, 3, 4, 2).fillRect(width - 8, 3, 4, 2);
      visual = this.add.container(x, y, [visual.setPosition(0, 0), marker]);
    } else if (key === 'platform') {
      const edges = this.add.graphics();
      const [shadow, light] = PLATFORM_EDGES[this.level.theme];
      edges.fillStyle(shadow).fillRect(x, y + 10, width, 2);
      edges.fillStyle(light).fillRect(x, y + 1, 2, 4).fillRect(x + width - 2, y + 1, 2, 4);
    }
    const surface = this.add.zone(x + width / 2, y + height / 2, width, height);
    group.add(surface);
    return { surface, visual };
  }

  createActors() {
    this.player = this.physics.add.sprite(this.checkpoint, GROUND_Y, 'hero-idle')
      .setOrigin(0.5, 1).setDepth(4).setCollideWorldBounds(true).setMaxVelocity(MOVE_SPEED, 370);
    this.player.body.setSize(12, 18, false).setOffset(2, 3);

    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    this.level.coins.forEach(([x, y], index) => {
      const coin = this.coins.create(x, y, 'coin-wide').setDepth(2);
      coin.body.setSize(11, 12);
      this.tweens.add({
        targets: coin, y: y - 3, duration: 540 + (index % 3) * 95, yoyo: true, repeat: -1,
        ease: 'Sine.inOut',
      });
    });

    this.enemies = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const [left, distance, speed, type] of this.level.enemies) {
      const expansion = EXPANSION_ENEMIES.has(type);
      const texture = expansion ? `${type}-rest` : terrainTexture(this.level.theme, 'slime-rest');
      const slime = this.enemies.create(left, type === 'flying' || type === 'bat' ? 148 : GROUND_Y, texture)
        .setOrigin(0.5, 1).setDepth(3).setVelocityX(speed);
      slime.body.setSize(15, expansion ? 13 : 11, false).setOffset(1, expansion ? 5 : 2);
      slime.setData({ left, right: left + distance, speed, type });
      if (type === 'shooter' || expansion) {
        const glow = this.add.rectangle(left, GROUND_Y - 16, 4, 4, 0xffcf78).setDepth(5).setVisible(false);
        slime.setData('warning', glow);
      }
    }

    this.add.image(this.level.flagX - 10, GROUND_Y, 'flag').setOrigin(0, 1).setDepth(1);
    this.finish = this.add.zone(this.level.flagX + 1, GROUND_Y - 21, 21, 42);
    this.physics.add.existing(this.finish, true);
  }

  createAmbient() {
    const tint = { verdant: 0xe4f6b3, canyon: 0xffbd72, crystal: 0xc6f1ff, fire: 0xff925c,
      castle: 0xd5bde4, jungle: 0xcde080, thunder: 0x93d4f8 }[this.level.theme];
    this.ambient = Array.from({ length: 10 }, (_, index) =>
      this.add.rectangle(0, 0, index % 4 === 0 ? 2 : 1, 1, tint, .48).setScrollFactor(0).setDepth(-4));
  }

  updateAmbient() {
    const time = this.ui.reduceMotion ? 0 : this.elapsed;
    const frame = Math.floor(time / 90);
    if (frame === this.ambientFrame && this.scale.width === this.ambientWidth) return;
    this.ambientFrame = frame;
    this.ambientWidth = this.scale.width;
    this.ambient.forEach((particle, index) => {
      const x = (index * 49 + Math.floor(time / (150 + index * 7))) % this.scale.width;
      particle.setPosition(x, 62 + ((index * 29 + Math.floor(time / 220)) % 98));
    });
  }

  createContacts() {
    this.physics.add.collider(this.player, this.ground, (_player, ground) => {
      const start = ground.body.left;
      if (!this.complete && start > this.checkpoint && this.player.x > start + 15) {
        this.checkpoint = start + 19;
        const flag = this.checkpointFlags.get(start);
        flag.setTexture('checkpoint-active');
        this.burst(flag.x + 6, flag.y - 17, 0xd5f77e, 8);
        this.ui.onCheckpoint();
      }
    });
    this.physics.add.collider(this.player, this.platforms, (_player, platform) => {
      this.riding = platform;
    }, (player, platform) => {
      return this.elapsed >= this.dropUntil && player.body.velocity.y >= 0
        && player.body.prev.y + player.body.height <= platform.body.top + 2;
    });
    this.physics.add.overlap(this.player, this.coins, (_player, coin) => this.collect(coin));
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => this.hitSlime(enemy));
    this.physics.add.overlap(this.player, this.finish, () => this.finishLevel());
  }

  collect(coin) {
    if (this.complete) return;
    this.collected += 1;
    this.burst(coin.x, coin.y, 0xffe184, 8);
    this.tweens.killTweensOf(coin);
    coin.disableBody(true, true);
    this.ui.onScore(this.collected);
    this.ui.playSound('coin');
    if (!this.ui.reduceMotion) {
      const points = this.add.text(coin.x, coin.y - 6, '+100', {
        fontFamily: 'monospace', fontSize: '8px', fontStyle: 'bold', color: '#fff0a0',
        stroke: '#3b3431', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(7);
      this.tweens.add({ targets: points, y: points.y - 14, alpha: 0, duration: 460, onComplete: () => points.destroy() });
    }
  }

  burst(x, y, color, count = 5) {
    this.feedback.emit(x, y, color, count);
  }

  dust(x, y) {
    this.feedback.emit(x, y - 1, 0xffe6ba, 4, true);
  }

  hitSlime(enemy) {
    if (this.complete || this.elapsed < this.invulnerableUntil) return;
    const body = this.player.body;
    if (body.velocity.y > 0 && body.prev.y + body.height <= enemy.body.top + 4) {
      this.defeatEnemy(enemy);
      this.player.setVelocityY(-172);
      this.jumpUntil = -Infinity;
      this.groundedUntil = -Infinity;
      this.cuttableJump = false;
      return;
    }
    this.respawn();
  }

  defeatEnemy(enemy) {
    enemy.disableBody(true, true);
    enemy.getData('warning')?.setVisible(false);
    this.burst(enemy.x, enemy.y - 6, 0xa9e169);
    if (!this.ui.reduceMotion) {
      const fall = this.add.image(enemy.x, enemy.y, enemy.texture.key).setOrigin(.5, 1).setFlipX(enemy.flipX).setDepth(4);
      this.tweens.add({ targets: fall, y: enemy.y - 9, scaleY: .25, alpha: 0, duration: 235, onComplete: () => fall.destroy() });
    }
    this.ui.playSound('stomp');
  }

  clearProjectiles() {
    for (const shot of this.projectiles) shot.dot.setActive(false).setVisible(false);
    this.projectiles.length = 0;
  }

  respawn(reason = 'damage') {
    this.deaths++;
    const x = this.player.x;
    const y = this.player.y;
    this.riding = null;
    this.feedback.death(this.player);
    this.clearProjectiles();
    this.player.body.reset(this.checkpoint, GROUND_Y - 2);
    this.player.setTexture('hero-idle').setFlipX(false);
    this.resetJump();
    this.landUntil = 0;
    this.swingUntil = 0;
    this.controls.consumeAttack();
    this.invulnerableUntil = this.elapsed + RESPAWN_GRACE;
    this.moveCamera(1);
    this.burst(x, Math.min(y, VIEW_HEIGHT), 0xffa7a4);
    if (this.boss?.kind && this.boss.hp > 0 && this.boss.phase !== 'waiting') resetExpansionBoss(this, this.boss);
    this.ui.onRespawn(this.deaths, reason);
  }

  damage() {
    if (!this.complete && this.elapsed >= this.invulnerableUntil) this.respawn();
  }

  finishLevel() {
    if (this.complete || this.boss?.hp > 0) return;
    this.complete = true;
    this.player.setVelocity(0);
    this.player.setAcceleration(0);
    this.physics.pause();
    this.ui.onComplete(this.collected, this.level.coins.length, this.elapsed, this.deaths);
  }

  updatePlayer(time) {
    const player = this.player;
    const body = player.body;
    // Arcade overlap callbacks (coins and enemies) can set touching.down in midair.
    const grounded = body.velocity.y >= 0 && body.blocked.down;
    if (grounded && !this.wasGrounded && this.lastFallSpeed > 145) {
      this.landUntil = time + 115;
      this.dust(player.x, player.y);
    }
    this.wasGrounded = grounded;
    this.lastFallSpeed = body.velocity.y;
    const jumpDown = this.controls.isDown('jump');
    const dropDown = this.controls.isDown('drop');
    const direction = Number(this.controls.isDown('right')) - Number(this.controls.isDown('left'));
    if (grounded) this.groundedUntil = time + COYOTE_TIME;
    if (this.controls.consumeJump()) this.jumpUntil = time + JUMP_BUFFER;

    if (dropDown && !this.dropWasDown && grounded && player.y < GROUND_Y - 3) {
      this.dropUntil = time + 190;
      this.groundedUntil = -Infinity;
      player.setVelocityY(45);
    }
    if (time <= this.jumpUntil && time <= this.groundedUntil) {
      player.setVelocityY(-JUMP_SPEED);
      this.jumpUntil = -Infinity;
      this.groundedUntil = -Infinity;
      this.cuttableJump = true;
      this.dust(player.x, player.y);
      this.ui.playSound('jump');
    }
    if (!jumpDown && this.cuttableJump && body.velocity.y < -116) {
      player.setVelocityY(-116);
      this.cuttableJump = false;
    }
    this.dropWasDown = dropDown;

    const onIce = grounded && player.y >= GROUND_Y - 1
      && this.level.ice?.some(([start, end]) => player.x >= start && player.x < end);
    player.setAccelerationX(direction * (onIce ? 540 : 880)).setDragX(onIce ? 300 : 1250);
    if (direction !== 0) player.setFlipX(direction < 0);
    const frame = Math.floor(time / 82);
    let pose = 'idle';
    if (!grounded || body.velocity.y < -30) pose = body.velocity.y < 0 ? 'jump' : 'fall';
    else if (Math.abs(body.velocity.x) > 16) pose = RUN_FRAMES[frame % RUN_FRAMES.length];
    if (!this.ui.reduceMotion && grounded && time < this.landUntil && body.velocity.y >= 0) pose = 'land';
    if (time < this.swingUntil) pose = 'attack';
    const texture = 'hero-' + pose;
    if (player.texture.key !== texture) player.setTexture(texture);
  }

  update(_time, delta) {
    if (this.complete) return;
    this.elapsed += delta;
    const second = Math.floor(this.elapsed / 1000);
    if (second !== this.lastSecond) {
      this.lastSecond = second;
      this.ui.onTime(this.elapsed);
    }
    if (this.player.y >= VIEW_HEIGHT + 36) {
      this.respawn();
      return;
    }
    this.updatePlayer(this.elapsed);
    this.updateAmbient();
    updatePlatforms(this);
    this.obstacleUpdates.forEach((update) => update(this.elapsed));
    updateCombat(this, delta);
    this.feedback.update();
    this.enemies.children.iterate((enemy) => {
      if (!enemy.active) return;
      const { left, right, speed, type } = enemy.data.values;
      if (type === 'ice') {
        const velocity = speed * (1 + 0.4 * Math.sin(this.elapsed / 380 + left));
        enemy.setVelocityX(enemy.body.velocity.x < 0 ? -velocity : velocity);
      }
      if (enemy.x <= left) enemy.setVelocityX(speed);
      if (enemy.x >= right) enemy.setVelocityX(-speed);
      const pose = Math.floor((this.elapsed + left) / 180) % 2 ? 'hop' : 'rest';
      const texture = EXPANSION_ENEMIES.has(type) ? `${type}-${pose}` : terrainTexture(this.level.theme, `slime-${pose}`);
      if (enemy.texture.key !== texture) enemy.setTexture(texture);
    });
    this.coins.children.iterate((coin, index) => {
      if (!coin.active) return;
      const frame = Math.floor((this.elapsed + index * 87) / 100) % COIN_FRAMES.length;
      const texture = 'coin-' + COIN_FRAMES[frame];
      if (coin.texture.key !== texture) coin.setTexture(texture);
    });
    this.moveCamera(1 - Math.exp(-delta / 108));
  }
}
