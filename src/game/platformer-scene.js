import Phaser from 'phaser';
import { drawMeadow } from './art.js';
import { createBackdrop, terrainTexture } from './backdrop.js';
import { GROUND_Y, VIEW_HEIGHT } from './level-one.js';
import { addObstacles, updatePlatforms } from './obstacles.js';
import { addCombat, updateCombat } from './combat.js';
import { EXPANSION_ENEMIES } from './expansion-enemies.js';
import { resetExpansionBoss } from './expansion-bosses.js';
import { createFeedback } from './feedback.js';
import { heroPose, heroTexture } from './hero-art.js';
import { monsters } from './monster-ai.js';
import { isCheckpoint } from './challenges.js';
import { createPrototypeActors } from './prototype-actors.js';
import { createTitanHall, createValley, isVerdantPrototype, valleyObjects, valleyProps } from './prototype-world.js';
import { clearShadow, createShadow, parryAttack, specialMovement, updateDash } from './shadow-combat.js';
import { SPRINT_SPEED } from './combat-techniques.js';
import { createShadowPresentation } from './shadow-presentation.js';
import { campaignSurface, createCampaignActors } from './campaign-art.js';
import { createCampaignBackdrop } from './campaign-backdrop.js';
import { canWallJump, wallSide, WALL_FALL, WALL_JUMP_SPEED, WALL_LOCK } from './wall-movement.js';
import { createTally } from './ultimate-progress.js';
import { createSurvival } from './ultimate-levels.js';
import { flyingUltimate, loadUltimateEnemies, ultimateEnemyFrame, ultimateFallFrame, ULTIMATE_ENEMIES } from './ultimate-enemies.js';
import { createLegendVista } from './legends-vista.js';
import { DEFAULT_HERO } from './legends-heroes.js';
import { paintVillage, VILLAGE_STATIONS } from './ninja-village.js';
import { createCacheArt } from './rendering/cache-art.js';
import { pruneVisualTextures } from './rendering/texture-budget.js';
import { addBiomeProps, paintedSurface } from './rendering/world-materials.js';
import { createLightRig, lightProp } from './rendering/light-rig.js';
import { SWAMP_STAGE } from './swamp/options.js';
import { addSwampRuins, createSwampBackdrop } from './swamp/scenery.js';
import { addSwampLamps, addSwampPost } from './swamp/post.js';
import { addSwampWater, swampSurface, swampTree, weatherStone } from './swamp/materials.js';
import { addReactiveFerns } from './swamp/motion.js';

const MOVE_SPEED = 132;
const JUMP_SPEED = 263;
const JUMP_BUFFER = 115;
const COYOTE_TIME = 90;
const RESPAWN_GRACE = 750;
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

  init({ level, shadow, hero=DEFAULT_HERO, swampOptions, normalCampaign, afterFailure = false }) {
    this.level = level;
    this.swampOptions = swampOptions;
    this.holdSpawnPickup = afterFailure;
    this.deathLimit = normalCampaign && level.name === SWAMP_STAGE && swampOptions?.retryLimit ? swampOptions.deaths : 0;
    this.shadowEnabled = Boolean(shadow);
    this.hero=hero;
  }

  create() {
    this.valleyPrototype = isVerdantPrototype(this.level);
    this.titanPrototype = this.level.boss?.kind === 'titan';
    this.collected = 0;
    this.runTally = createTally();
    this.deaths = 0;
    this.checkpoint = this.level.spawnX;
    this.complete = false;
    this.failed = false;
    this.bossFinisher = null;
    this.invulnerableUntil = 0;
    this.cameraX = 0;
    this.elapsed = 0;
    this.lastSecond = 0;
    this.wasGrounded = false;
    this.lastFallSpeed = 0;
    this.landUntil = 0;
    this.launchUntil = 0;
    this.animationState = {};
    this.swingUntil = 0;
    this.visualPose = 'idle';
    this.ambientFrame = -1;
    this.riding = null;
    this.specialPlatforms = [];
    this.resetJump();
    this.swamp = this.level.name === SWAMP_STAGE && this.swampOptions ? {
      options: this.swampOptions,
      lamps: this.level.ground.map(([start]) => ({ x: start + 89, y: 148 })),
    } : null;
    this.lightRig = createLightRig(this);

    this.backdrop = (this.swamp?.options.depth && createSwampBackdrop(this)) || createLegendVista(this) || ((this.valleyPrototype || this.shadowEnabled && this.level.theme==='verdant') && createValley(this))
      || (this.shadowEnabled && createCampaignBackdrop(this,this.level.theme))
      || createBackdrop(this, this.level.theme);
    this.physics.world.setBounds(0, 0, this.level.width, VIEW_HEIGHT, true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.level.width, VIEW_HEIGHT);
    if (this.valleyPrototype) valleyObjects(this);
    this.createTerrain();
    this.createActors();
    if(this.level.village)paintVillage(this);
    this.villageStation=null;
    this.ninja = this.shadowEnabled ? createShadow(this) : null;
    this.shadowPresentation = this.ninja ? createShadowPresentation(this) : null;
    this.survival = this.level.survival && this.ninja ? createSurvival(this) : null;
    this.campaignActors = this.ninja && !this.valleyPrototype ? createCampaignActors(this) : null;
    this.prototypeActors = this.valleyPrototype || this.titanPrototype ? createPrototypeActors(this,this.valleyPrototype) : null;
    this.hall = this.titanPrototype ? createTitanHall(this) : null;
    this.feedback = createFeedback(this);
    this.obstacleUpdates = addObstacles(this, this.level.hazards);
    addCombat(this);
    this.createAmbient();
    if (this.swamp && (this.swamp.options.normals || this.swamp.options.shadows || this.swamp.options.post)) addSwampLamps(this);
    if (this.swamp?.options.post) addSwampPost(this);
    if (this.swamp?.options.materials) addSwampWater(this);
    if (this.swamp?.options.motion) this.swamp.sway = addReactiveFerns(this);
    this.resizeBackdrop();
    this.createContacts();
    pruneVisualTextures(this);
    const paintPrototype = (time, delta) => {
      this.swamp?.sway?.(delta);
      this.prototypeActors?.update();
      this.boss?.presentation?.update();
      this.hall?.update();
      this.campaignActors?.update();
      this.shadowPresentation?.update(time);
    };
    if (this.prototypeActors || this.shadowPresentation || this.swamp?.sway) this.events.on(Phaser.Scenes.Events.POST_UPDATE,paintPrototype);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.ui.onPlayfieldPress);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeBackdrop, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.ui.onPlayfieldPress);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeBackdrop, this);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE,paintPrototype);
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
    this.fieldProps=this.valleyPrototype?valleyProps(this):null;
    if (!this.valleyPrototype && !this.swamp) {
      addBiomeProps(this);
      drawMeadow(this,this.level.ground,GROUND_Y,this.level.theme);
    }
    if (this.swamp) {
      for (const [index, [x, scale]] of this.level.trees.entries()) {
        const detail = this.swamp?.options.materials;
        const texture = detail ? swampTree(this,index) : terrainTexture(this.level.theme, 'tree');
        const tree = this.add.image(x, GROUND_Y + 1, texture).setOrigin(0.5, 1).setScale(detail ? scale * .74 : scale).setDepth(-4);
        lightProp(this,tree,'fixed');
      }
      drawMeadow(this, this.level.ground, GROUND_Y, this.level.theme);
      if (this.swamp?.options.depth || this.swamp?.options.materials)
        addSwampRuins(this, this.swamp.options.materials ? weatherStone : undefined);
    }
    const ice = this.add.graphics().setDepth(1);
    for (const [start, end] of this.level.ice ?? []) {
      ice.fillStyle(0x9bdcee).fillRect(start, GROUND_Y, end - start, 3);
      for (let x = start + 4; x < end - 9; x += 16) ice.fillStyle(0xeaffff).fillRect(x, GROUND_Y, 9, 1);
    }
    this.checkpointFlags = new Map();
    this.windZones = this.level.script?.air ?? [];
    this.ground = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.solidWalls = this.level.solidWalls ? this.physics.add.staticGroup() : null;
    for (const [index, [start, end]] of this.level.ground.entries()) {
      this.addSurface(this.ground, start, GROUND_Y, end - start, 40, 'ground');
      if (isCheckpoint(this.level, index)) {
        const flag=this.valleyPrototype ? this.add.image(start+19,GROUND_Y,'field-signs','checkpoint0').setOrigin(.5,1)
          : this.add.image(start+19,GROUND_Y,'checkpoint').setOrigin(.25,1);
        this.checkpointFlags.set(start,lightProp(this,flag.setDepth(1),false));
      }
    }
    for (const [left, right, force] of this.windZones) {
      const arrows = this.add.graphics().setDepth(-1).fillStyle(0x99d9df, .72);
      for (let x = left + 4; x < right; x += 11) {
        arrows.fillTriangle(x - 3, 142, x + 4 * Math.sign(force), 145, x - 3, 148);
      }
    }
    for(const [left,right,flow,surface] of this.level.water??[]){
      const tide=this.add.graphics().setDepth(-.35);
      tide.fillStyle(0x63c8df,.17).fillRect(left,surface,right-left,184-surface)
        .fillStyle(0xa8edfa,.55).fillRect(left,surface,right-left,1);
      for(let x=left+12;x<right-8;x+=23){
        const b=Math.sign(flow)*5,y=surface+Math.round((184-surface)*.57);
        tide.fillStyle(0x70bcd9,.56).fillTriangle(x-3,y-3,x+b,y,x-3,y+3);
        tide.fillStyle(0xd3fffa,.45).fillRect(x+4,y-6,2,2);
      }
    }
    for (const [x, y, width, kind, a, b, period] of this.level.platforms) {
      const objects = this.addSurface(this.platforms, x, y, width, 12, 'platform', kind);
      if (kind) this.specialPlatforms.push({ ...objects, x, y, kind, a, b, period });
    }
    for (const [x, y, width, height] of this.level.solidWalls ?? []) {
      this.addSurface(this.solidWalls, x, y, width, height, 'platform');
    }
  }

  addSurface(group, x, y, width, height, key, kind) {
    let visual = !this.swamp ? paintedSurface(this,x,y,width,height)
      : this.swamp.options.materials ? swampSurface(this,x,y,width,height)
        : campaignSurface(this,x,y,width,height);
    this.lightRig.light?.(visual);
    if (key === 'platform') this.lightRig.cast?.(visual,true,!kind);
    if (kind) {
      const marker = this.add.graphics();
      marker.fillStyle(0xffe998).fillRect(4, 3, 4, 2).fillRect(width - 8, 3, 4, 2);
      visual = this.add.container(x, y, [visual.setPosition(0, 0), marker]);
    } else if (key === 'platform' && !this.valleyPrototype && !this.shadowEnabled) {
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
    if (!this.shadowEnabled) {
      lightProp(this,this.player);
    }

    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    this.level.coins.forEach(([x, y], index) => {
      const coin = this.coins.create(x, y, 'coin-wide').setDepth(2);
      coin.body.setSize(11, 12);
      lightProp(this,coin,false);
      this.tweens.add({
        targets: coin, y: y - 3, duration: 540 + (index % 3) * 95, yoyo: true, repeat: -1,
        ease: 'Sine.inOut',
      });
    });

    this.enemies = this.physics.add.group({ allowGravity: false, immovable: true });
    loadUltimateEnemies(this,this.level.enemies.map(enemy=>enemy[3]));
    for (const [left, distance, speed, type, captain] of this.level.enemies) {
      const monster = monsters[type];
      const ultimate = Object.hasOwn(ULTIMATE_ENEMIES,type);
      const expansion = EXPANSION_ENEMIES.has(type) || monster;
      const texture = ultimate ? type : type === 'dummy' ? 'target-dummy' : expansion ? `${type}-rest` : terrainTexture(this.level.theme, 'slime-rest');
      if (type === 'dummy' && !this.textures.exists(texture)) {
        const dummy = this.textures.createCanvas(texture, 24, 30);
        const context = dummy.context;
        for (const [color, x, y, width, height] of [
          ['#24232e', 3, 5, 18, 16], ['#806148', 5, 6, 14, 14], ['#b39261', 7, 8, 10, 10],
          ['#c85850', 9, 10, 6, 6], ['#f2c38a', 11, 12, 2, 2], ['#533d37', 10, 21, 4, 9],
          ['#8a6e52', 5, 27, 14, 3],
        ]) { context.fillStyle = color; context.fillRect(x, y, width, height); }
        dummy.refresh();
      }
      const homeY = type === 'flying' || type === 'bat' || flyingUltimate(type) || monster?.flying ? 148 : GROUND_Y;
      const slime = this.enemies.create(left, homeY, texture, ultimate ? 'patrol0' : undefined)
        .setOrigin(0.5, 1).setDepth(3).setVelocityX(speed);
      if (ultimate) slime.body.setSize(16,22,false).setOffset(11,11);
      else if (type === 'dummy') slime.body.setSize(18, 17, false).setOffset(3, 5);
      else slime.body.setSize(15, expansion ? 13 : 11, false).setOffset(1, expansion ? 5 : 2);
      lightProp(this,slime);
      slime.setData({ left, right: left + distance, speed, type, homeY });
      if (ultimate) {
        slime.setData({ ultimateState:{phase:'patrol',until:0,facing:1}, signal:this.add.graphics().setDepth(6), captain });
      } else if (monster) {
        slime.setData({ brain: { phase: 'patrol', until: 0, facing: 1 }, signal: this.add.graphics().setDepth(6) });
      } else if (type === 'shooter' || expansion) {
        const glow = this.add.rectangle(left, GROUND_Y - 16, 4, 4, 0xffcf78).setDepth(5).setVisible(false);
        slime.setData('warning', glow);
      }
    }

    this.cacheArt=null;
    if (this.level.secret) {
      const {x,y}=this.level.secret;
      this.cacheArt=createCacheArt(this,this.level.secret);
      this.secret = this.add.zone(x,y,17,15);
      this.physics.add.existing(this.secret,true);
    } else this.secret = null;
    this.finish = null;
    if (this.level.survival || this.level.village) return;
    const flag=this.valleyPrototype ? this.add.image(this.level.flagX,GROUND_Y,'field-signs','exit0').setOrigin(.5,1)
      : this.add.image(this.level.flagX-10,GROUND_Y,'flag').setOrigin(0,1);
    lightProp(this,flag.setDepth(1),false);
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
    if (this.solidWalls) this.physics.add.collider(this.player, this.solidWalls);
    this.physics.add.collider(this.player, this.ground, (_player, ground) => {
      const start = ground.body.left;
      if (!this.complete && !this.failed && this.checkpointFlags.has(start) && start > this.checkpoint && this.player.x > start + 15) {
        this.checkpoint = start + 19;
        const flag = this.checkpointFlags.get(start);
        if(this.valleyPrototype) flag.setFrame('active0');
        else flag.setTexture('checkpoint-active');
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
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      if (enemy.getData('type') !== 'dummy') this.hitSlime(enemy);
    });
    if (this.finish) this.physics.add.overlap(this.player, this.finish, () => this.finishLevel());
    if (this.secret) this.physics.add.overlap(this.player,this.secret,() => {
      this.secret.body.enable = false;
      this.cacheArt.setVisible(false);
      this.burst(this.secret.x,this.secret.y,0xeebaff,12);
      this.ui.playSound('secret');
      this.ui.onSecret?.(this.level.secret);
    });
  }

  collect(coin) {
    if (this.complete || this.failed || this.holdSpawnPickup) return;
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
    if (this.complete || this.failed || this.bossFinisher || this.elapsed < this.invulnerableUntil) return;
    if (this.ninja && this.elapsed < (enemy.getData('shadowHitUntil') ?? 0)) return;
    const body = this.player.body;
    if (enemy.getData('ultimateState')) return;
    if (body.velocity.y > 0 && body.prev.y + body.height <= enemy.body.top + 4) {
      this.defeatEnemy(enemy);
      if (!this.ninja?.attack?.dive) this.player.setVelocityY(-172);
      this.jumpUntil = -Infinity;
      this.groundedUntil = -Infinity;
      this.cuttableJump = false;
      return;
    }
    this.damage();
  }

  defeatEnemy(enemy) {
    this.runTally.defeats++;
    this.survival?.defeat();
    enemy.disableBody(true, true);
    enemy.getData('warning')?.setVisible(false);
    enemy.getData('signal')?.clear();
    this.burst(enemy.x, enemy.y - 6, 0xa9e169);
    if (enemy.getData('ultimateState')) {
      const echo = this.add.image(enemy.x,enemy.y,enemy.texture.key,'fall0').setOrigin(.5,1).setDepth(4).setFlipX(enemy.flipX);
      this.tweens.addCounter({ from:0, to:4, duration:210, onUpdate:tween=>{
        const age = tween.getValue();
        echo.setFrame(ultimateFallFrame(age/4)).setAlpha(1-age/4);
      }, onComplete:()=>echo.destroy() });
      this.ui.playSound('stomp');
      return;
    }
    const updated = this.prototypeActors?.foeHit(enemy) || Boolean(this.campaignActors);
    if(updated && !this.ui.reduceMotion) this.cameras.main.shake(90,.0028);
    if (!updated && !this.ui.reduceMotion) {
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
    if (this.bossFinisher || this.failed) return;
    this.deaths++;
    if (this.deathLimit && this.deaths >= this.deathLimit) {
      this.failed = true;
      this.physics.pause();
      this.ui.onStageFailed(this.deaths);
      return;
    }
    const x = this.player.x;
    const y = this.player.y;
    this.riding = null;
    if (this.shadowPresentation) this.shadowPresentation.collapse();
    else if(!this.prototypeActors?.collapse(this.player)) this.feedback.death(this.player);
    this.clearProjectiles();
    clearShadow(this, true);
    this.player.body.reset(this.checkpoint, GROUND_Y - 2);
    for (const enemy of this.enemies.getChildren()) {
      const { brain, ultimateState, signal, left, homeY, speed } = enemy.data.values;
      if (!(brain || ultimateState) || this.survival || left <= this.checkpoint + 28) continue;
      enemy.enableBody(true, left, homeY, true, true).setVelocityX(speed).setFlipX(false);
      this.ninja?.enemyHp.delete(enemy);
      Object.assign(brain ?? ultimateState, { phase:'patrol', until:0, facing:1 });
      enemy.setData({shadowHitUntil:0,shadowStaggerReady:0});
      signal.clear();
    }
    this.player.setTexture(heroTexture('respawn', this.ui.costume)).setFlipX(false);
    this.visualPose='respawn';
    this.resetJump();
    this.landUntil = 0;
    this.swingUntil = 0;
    this.controls.consumeAttack();
    this.invulnerableUntil = this.elapsed + RESPAWN_GRACE;
    this.moveCamera(1);
    this.burst(x, Math.min(y, VIEW_HEIGHT)-6, 0xffa7b5,10);
    if (this.boss?.kind && this.boss.hp > 0 && this.boss.phase !== 'waiting') resetExpansionBoss(this, this.boss);
    this.ui.onRespawn(this.deaths, reason);
  }

  damage() {
    if (this.complete || this.elapsed < this.invulnerableUntil) return;
    this.runTally.hurt();
    if (this.survival && !this.survival.hurt()) {
      this.invulnerableUntil = this.elapsed + 900;
      clearShadow(this);
      this.burst(this.player.x,this.player.y-10,0xffa7a4,8);
      this.ui.playSound('respawn');
      return;
    }
    this.respawn();
  }

  finishLevel() {
    if (this.complete || this.failed || this.bossFinisher || (this.boss && this.boss.hp !== 0)) return;
    this.complete = true;
    clearShadow(this);
    this.player.setVelocity(0);
    this.player.setAcceleration(0);
    this.player.setTexture(heroTexture('victory', this.ui.costume));
    this.physics.pause();
    this.ui.onComplete(this.collected, this.level.coins.length, this.elapsed, this.deaths);
  }

  updatePlayer(time) {
    const player = this.player;
    const body = player.body;
    // Arcade overlap callbacks (coins and enemies) can set touching.down in midair.
    const grounded = body.velocity.y >= 0 && body.blocked.down;
    if (grounded && !this.wasGrounded) {
      if (this.ninja || this.lastFallSpeed > 145) this.landUntil = time + (this.ninja ? 138 : 115);
      if (this.lastFallSpeed > 145) this.dust(player.x, player.y);
    }
    this.wasGrounded = grounded;
    this.lastFallSpeed = body.velocity.y;
    const jumpDown = this.controls.isDown('jump');
    const dropDown = this.controls.isDown('drop');
    const direction = Number(this.controls.isDown('right')) - Number(this.controls.isDown('left'));
    const ninja = this.ninja;
    const wall = !grounded && ninja && !ninja.dash && time >= (ninja.wallJumpUntil ?? 0)
      ? wallSide(body,this.solidWalls,direction) : 0;
    if (ninja) ninja.wallSlide = wall && body.velocity.y > 0 && !ninja.attack?.dive ? wall : 0;
    if (grounded) this.groundedUntil = time + COYOTE_TIME+(this.hero.bonus.coyote??0);
    if (this.controls.consumeJump()) this.jumpUntil = time + JUMP_BUFFER+(this.hero.bonus.buffer??0);

    if (dropDown && !this.dropWasDown && grounded && player.y < GROUND_Y - 3) {
      this.dropUntil = time + 190;
      this.groundedUntil = -Infinity;
      player.setVelocityY(45);
    }
    if (time <= this.jumpUntil && time <= this.groundedUntil && this.ninja?.special?.kind!=='execution') {
      player.setVelocityY(-JUMP_SPEED);
      this.jumpUntil = -Infinity;
      this.groundedUntil = -Infinity;
      this.cuttableJump = true;
      this.launchUntil = time + 75;
      this.dust(player.x, player.y);
      this.ui.playSound('jump');
      if (ninja?.sprint) ninja.sprintJumpUntil = time + 240;
    } else if (ninja && canWallJump(ninja,wall,time <= this.jumpUntil)) {
      ninja.wallJumpUsed = true;
      ninja.wallJumpUntil = time + WALL_LOCK;
      ninja.wallJumpDirection = -wall;
      ninja.wallSlide = 0;
      this.jumpUntil = -Infinity;
      this.groundedUntil = -Infinity;
      this.cuttableJump = true;
      player.setFlipX(wall > 0).setVelocity(-wall * MOVE_SPEED,-WALL_JUMP_SPEED);
      this.ui.playSound('jump');
    }
    if (ninja?.wallSlide) body.velocity.y = Math.min(body.velocity.y,WALL_FALL);
    if (!jumpDown && this.cuttableJump && body.velocity.y < -116) {
      player.setVelocityY(-116);
      this.cuttableJump = false;
    }
    this.dropWasDown = dropDown;

    const onIce = grounded && player.y >= GROUND_Y - 1
      && this.level.ice?.some(([start, end]) => player.x >= start && player.x < end);
    const wind = !grounded && this.windZones.find(([left, right]) => player.x >= left && player.x <= right);
    const dashing = ninja && updateDash(this, grounded && body.velocity.y >= 0 && time >= this.dropUntil, direction);
    if (!dashing) {
      const state=this.ninja;
      const sprint=state && grounded && body.velocity.y>=0 && direction!==0 && this.controls.isDown('sprint') && !state.special;
      const sprintTier=this.ui.shadowTier?.('sprint')??0;
      if(state){
        if(sprint&&!state.sprint){
          state.sprintSince=time;
          state.uses.sprint=(state.uses.sprint??0)+1;
        }
        if(state.sprint&&!sprint)state.sprintStop=time;
        state.sprint=sprint;
        if(sprint&&!this.ui.reduceMotion&&time>=(state.nextDust??0)){
          this.dust(player.x,player.y);
          state.nextDust=time+100;
        }
      }
      const cap=sprint?this.hero.sprint:this.hero.speed;
      body.maxVelocity.x=cap;
      // Sprint does not carry extra horizontal reach into jumps.
      if(!grounded || body.velocity.y<0)body.velocity.x=Math.max(-cap,Math.min(cap,body.velocity.x));
      const turning = sprint && Math.sign(body.velocity.x) === -direction;
      const braking = grounded && time - (state?.sprintStop ?? -Infinity) < 135;
      const accel = (sprint ? sprintTier >= 2 && turning ? 1810 : sprintTier >= 1 ? 1450 : 1140 : onIce ? 540 : 880)+(grounded?(this.hero.bonus.accel??0):0);
      const drag = sprintTier >= 2 && braking ? 1520 : onIce ? 300 : this.hero.brakes;
      const kick = time < (state?.wallJumpUntil ?? 0);
      const motion=kick ? state.wallJumpDirection : state?specialMovement(this,direction,grounded):direction;
      const current=this.level.water?.find(([left,right,,surface])=>player.x>=left&&player.x<right&&player.y>=surface);
      player.setAccelerationX(motion*accel+(wind?wind[2]:0)+(current?current[2]:0)).setDragX(current?Math.max(drag,1440):drag);
      if(direction!==0&&!kick&&!state?.attack&&!state?.throw&&!state?.special&&!state?.charging&&!state?.parry)player.setFlipX(direction<0);
    }
    const visual = this.animationState;
    visual.time = time;
    visual.grounded = grounded;
    visual.vx = body.velocity.x;
    visual.vy = body.velocity.y;
    visual.direction = direction;
    visual.reduced = this.ui.reduceMotion;
    visual.landing = this.landUntil;
    visual.launch = this.launchUntil;
    visual.swing = this.swingUntil;
    visual.grace = this.invulnerableUntil;
    this.visualPose = heroPose(visual);
    const texture = heroTexture(this.visualPose, this.ui.costume);
    if (player.texture.key !== texture) player.setTexture(texture);
  }

  update(_time, delta) {
    if (this.complete || this.failed) return;
    if (!this.bossFinisher) this.elapsed += delta;
    this.controls.readGamepad?.();
    if (this.controls.consume?.('pause') && this.ui.onPause?.()) return;
    if (this.bossFinisher) { this.bossFinisher(delta); return; }
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
    // A stationary hero starts over with zero until moving into the pre-existing spawn pickup.
    if (this.holdSpawnPickup && (Math.abs(this.player.x - this.level.spawnX) > 1 || this.player.y < GROUND_Y - 2))
      this.holdSpawnPickup = false;
    if(this.level.village){
      const next=VILLAGE_STATIONS.find(station=>Math.abs(this.player.x-station.x)<32)??null;
      if(next!==this.villageStation){this.villageStation=next;this.ui.onVillageNear?.(next);}
    }
    this.updateAmbient();
    this.fieldProps?.update(this.ui.reduceMotion?0:this.elapsed);
    updatePlatforms(this);
    this.obstacleUpdates.forEach((update) => update(this.elapsed));
    updateCombat(this, delta);
    if (this.bossFinisher || this.failed) return;
    this.survival?.update();
    this.feedback.update();
    this.enemies.children.iterate((enemy) => {
      if (!enemy.active) return;
      const { left, right, speed, type } = enemy.data.values;
      if (this.ninja) {
        const hit = enemy.getData('shadowHitUntil') > this.elapsed;
        enemy.setAlpha(hit && !this.ui.reduceMotion ? .76 : 1);
      }
      if (type === 'dummy') return;
      if (enemy.getData('ultimateState')) {
        enemy.setFrame(ultimateEnemyFrame(enemy,this.elapsed,this.ui.reduceMotion));
        return;
      }
      if (type === 'ice') {
        const velocity = speed * (1 + 0.4 * Math.sin(this.elapsed / 380 + left));
        enemy.setVelocityX(enemy.body.velocity.x < 0 ? -velocity : velocity);
      }
      if (!monsters[type]) {
        if (enemy.x <= left) enemy.setVelocityX(speed);
        if (enemy.x >= right) enemy.setVelocityX(-speed);
      }
      const pose = Math.floor((this.elapsed + left) / 180) % 2 ? 'hop' : 'rest';
      const texture = EXPANSION_ENEMIES.has(type) || monsters[type]
        ? `${type}-${pose}` : terrainTexture(this.level.theme, `slime-${pose}`);
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
