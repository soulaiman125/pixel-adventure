const PARTICLE_LIMIT = 32;
const PULSE_LIMIT = 5;
const POINT_LIFE = 270;

export function createFeedback(scene) {
  const art=scene.add.graphics().setName('feedback-bursts').setVisible(false).setDepth(6);
  const particles=Array.from({length:PARTICLE_LIMIT},()=>({until:0}));
  const pulses=Array.from({length:PULSE_LIMIT},()=>({until:0}));
  const echo=scene.add.image(0,0,'hero-fall').setOrigin(.5,1).setVisible(false).setDepth(5);
  const shield=scene.add.graphics().setDepth(5);
  let cursor=0, nextPulse=0, echoUntil=0, echoY=0, shownUntil=0;

  function emit(x,y,color,count,dust=false) {
    if (scene.ui.reduceMotion) return;
    const time=scene.elapsed;
    const life=dust?210:POINT_LIFE;
    shownUntil=time+POINT_LIFE;
    for(let index=0;index<count;index++){
      const item=particles[cursor];
      cursor=(cursor+1)%particles.length;
      const angle=index*Math.PI*2/count-Math.PI/2;
      item.x=x;
      item.y=y;
      item.dx=dust?(index-1.5)*7:Math.cos(angle)*(13+index%4*3);
      item.dy=dust?-4:Math.sin(angle)*(10+index%3*4)-4;
      item.color=color;
      item.life=life;
      item.until=time+life;
      item.size=dust?2.6:1.15+(index%3)*.45;
      item.dust=dust;
    }
    if(!dust&&count>=8){
      Object.assign(pulses[nextPulse],{x,y,color,until:time+150,size:count>=11?14:9});
      nextPulse=(nextPulse+1)%pulses.length;
    }
  }

  function paint(now) {
    if (now>=shownUntil || scene.ui.reduceMotion) {
      if(art.visible)art.clear().setVisible(false);
      return;
    }
    art.clear().setVisible(true);
    for(const {x,y,color,until,size} of pulses){
      if(until<=now)continue;
      const t=1-(until-now)/150;
      art.lineStyle(1.1,color,.58*(1-t)**2).strokeEllipse(x,y,(4+size*t)*2,6+size*t);
    }
    for(const item of particles){
      if(item.until<=now)continue;
      const t=1-(item.until-now)/item.life;
      const flight=1-(1-t)**2;
      const x=item.x+item.dx*flight,y=item.y+item.dy*flight+6*t*t;
      const size=item.size*(1-t*.72);
      const alpha=(1-t)**1.3;
      if(item.dust) {
        art.fillStyle(item.color,.42*alpha).fillEllipse(x,y,size*2.5,size);
        continue;
      }
      art.fillStyle(item.color,.78*alpha)
        .fillTriangle(x-item.dx*.16,y-item.dy*.16,x+size,y+size*.48,x-size*.55,y-size);
      art.fillStyle(0xfff4d7,.9*alpha).fillCircle(x,y,Math.max(.45,size*.54));
    }
  }

  return {
    emit,
    death(player) {
      if (scene.ui.reduceMotion) return;
      echoY=player.y;
      echoUntil=scene.elapsed+245;
      echo.setPosition(player.x,echoY).setTexture('hero-fall')
        .setFlipX(player.flipX).setAlpha(.85).setVisible(true);
    },
    update() {
      const now=scene.elapsed;
      paint(now);
      if(echo.visible){
        const left=Math.max(0,(echoUntil-now)/245);
        echo.setVisible(!scene.ui.reduceMotion&&left>0).setAlpha(left*.85).setY(echoY-(1-left)*8);
      }
      if(shield.commandBuffer.length)shield.clear();
      if(now<scene.invulnerableUntil){
        const {x,y}=scene.player;
        const strength=scene.ui.reduceMotion?.86:.60+.22*Math.sin(now/105)**2;
        shield.lineStyle(1,0xffeca9,strength).strokeRoundedRect(Math.round(x-10),Math.round(y-23),20,22,4);
      }
    },
  };
}
