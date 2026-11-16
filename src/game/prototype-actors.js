import { brambleAtlas, brambleClips, clipFrame, heroAtlas, heroClips } from './prototype-sprites.js';

const heroPoses = { step:'run', stride:'run', accelerate:'run', brake:'land', launch:'rise', jump:'rise' };

export function createPrototypeActors(scene, valley) {
  if (valley) brambleAtlas(scene);
  const hero = scene.add.image(0,0,heroAtlas(scene,scene.ui.costume),'idle0')
    .setOrigin(.5,1).setDepth(4.3);
  const echo = scene.add.image(0,0,hero.texture.key,'recoil0').setOrigin(.5,1).setDepth(4.5).setVisible(false);
  const impacts = scene.add.graphics().setDepth(7);
  const enemies = valley ? scene.enemies.getChildren().map(body=>({
    body, visual:scene.add.image(body.x,body.y,'brambleback','idle0').setOrigin(.5,1).setDepth(3.1),
  })) : [];
  const coins = valley ? scene.coins.getChildren().map(body=>({
    body, visual:scene.add.image(body.x,body.y,'field-coins','spin0').setDepth(2.05),
  })) : [];
  for (const { body } of [...enemies,...coins]) body.setVisible(false);
  const arenaStart=scene.level.ground.at(-1)[0];
  let lastPose;
  let started=0;
  let hold=0;
  let death;
  let impact;

  return {
    enabled() { return valley || scene.player.x>=arenaStart-5; },
    hit(x,y,strong) {
      const time=scene.elapsed;
      hold=time+(strong?58:42);
      impact={x,y,until:time+170,strong,flipped:scene.player.flipX};
    },
    foeHit(body) {
      const actor=enemies.find(item=>item.body===body);
      if (!actor) return false;
      actor.defeated=scene.elapsed;
      this.hit(body.x,body.y-8,false);
      return true;
    },
    collapse(player) {
      if (!this.enabled()) return false;
      death={x:player.x,y:Math.min(player.y,214),since:scene.elapsed,flip:player.flipX,
        direction:player.body.velocity.x<0?1:-1};
      this.hit(death.x,death.y-9,false);
      return true;
    },
    update() {
      const now=scene.elapsed;
      const reduced=scene.ui.reduceMotion;
      const active=this.enabled();
      const player=scene.player;
      player.setVisible(!active);
      hero.setVisible(active);
      const key=heroAtlas(scene,scene.ui.costume);
      if (hero.texture.key!==key) hero.setTexture(key,'idle0');
      hero.setPosition(Math.round(player.x),Math.round(player.y)).setFlipX(player.flipX);
      const motion=scene.visualPose ?? 'idle';
      const pose=scene.complete?'victory':heroPoses[motion]??motion;
      if (pose!==lastPose) { started=now; lastPose=pose; }
      const duration={ idle:950,run:464,rise:260,fall:330,land:115,attack:150,hurt:130,respawn:600,victory:760 }[pose];
      const loop=pose==='idle'||pose==='run'||pose==='victory';
      if (now>=hold||reduced||!active) hero.setFrame(clipFrame(heroClips,pose,reduced&&pose==='idle'?0:now-started,duration,loop));
      if (death) {
        const age=now-death.since;
        echo.setVisible(!reduced&&age<375);
        if (echo.visible) {
          const clip=age<145?'recoil':'death';
          echo.setTexture(key,clipFrame(heroClips,clip,clip==='recoil'?age:age-145,clip==='recoil'?145:230))
            .setFlipX(death.flip).setAlpha(1-age/430)
            .setPosition(death.x+Math.round(death.direction*Math.min(age,230)/22),death.y-Math.round(Math.sin(Math.min(age,340)/340*Math.PI)*7));
        }
      }
      for(const {body,visual,defeated} of enemies) {
        if(defeated!==undefined) {
          const age=now-defeated;
          visual.setVisible(!reduced&&age<305).setAlpha(Math.max(0,1-age/310));
          if(visual.visible) visual.setFrame(age<62?'hurt0':clipFrame(brambleClips,'death',age-62,230));
          continue;
        }
        const { velocity }=body.body;
        const flip=velocity.x<0;
        const separation=player.x-body.x;
        const approaching=Math.abs(separation)<54 && Math.sign(separation)===Math.sign(velocity.x)&&Math.abs(player.y-body.y)<21;
        const pose=approaching?(Math.abs(separation)<23?'lunge':'windup'):Math.abs(velocity.x)>8?'patrol':'idle';
        const frameAge=approaching?(54-Math.abs(separation))*8:now;
        visual.setPosition(Math.round(body.x),Math.round(body.y)).setFlipX(flip)
          .setFrame(clipFrame(brambleClips,pose,reduced&&pose==='idle'?0:frameAge,pose==='patrol'?550:390,!approaching));
      }
      for(const {body,visual} of coins) {
        visual.setVisible(body.active);
        if(body.active) visual.setPosition(Math.round(body.x),Math.round(body.y))
          .setFrame(reduced?'spin0':'spin'+Math.floor((now+body.x*3)/105)%6);
      }
      impacts.clear();
      if (impact && now<impact.until) {
        const fraction=1-(impact.until-now)/170;
        const radius=(impact.strong?17:10)+(reduced?0:Math.round(fraction*7));
        const cx=impact.x;
        const cy=impact.y;
        const direction=impact.flipped?-1:1;
        impacts.fillStyle(0xffe6b0,reduced?.65:1-fraction*.8)
          .fillTriangle(cx-2,cy+4,cx+direction*radius,cy-6,cx+direction*2,cy+1)
          .fillRect(cx-1,cy-5,2,9);
        if (!reduced) {
          impacts.fillStyle(0x9de7d2,.7).fillRect(cx+direction*Math.round(fraction*19),cy-7,4,2);
          impacts.lineStyle(1,0xffe9b5,.46).strokeCircle(cx,cy,Math.round(radius*.55));
        }
      }
    },
  };
}

export function paintPrototypeSlash(art,x,y,sign,remaining,reduced) {
  const alpha=reduced?.87:Math.min(1,remaining/90);
  const reach=reduced?26:remaining>100?26:remaining>46?31:25;
  art.fillStyle(0xd78249,.73*alpha).fillTriangle(x+sign*6,y+10,x+sign*reach,y-4,x+sign*18,y+14);
  art.fillStyle(0xffdc94,alpha).fillTriangle(x+sign*7,y+6,x+sign*reach,y-4,x+sign*19,y+11);
  art.fillStyle(0xfff5c9,.95*alpha).fillTriangle(x+sign*13,y+4,x+sign*reach,y-4,x+sign*22,y+6);
  if(!reduced) art.fillRect(x+sign*(reach-4),y-7,3,2).fillRect(x+sign*19,y+12,4,1);
}
