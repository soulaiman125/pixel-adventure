import { clipFrame } from './prototype-sprites.js';

import { lightProp } from './rendering/light-rig.js';
import { expandedClips, paintedAtlas } from './rendering/painted-atlas.js';
import { paintBoss } from './rendering/painted-boss.js';

const clips = expandedClips({idle:4,wind:4,wave:4,bolts:4,impact:4,open:4,hurt:2,defeat:5},new Set(['idle','open']));
export function addTitanPresentation(scene, boss) {
  paintedAtlas(scene,'forge-titan',96,82,clips,(ctx,x,y,pose,frame,count,palette)=>
    paintBoss(palette,ctx,x,y,96,82,'titan',pose,frame,count));
  const sprite=scene.add.image(boss.x,184,'forge-titan','idle0').setOrigin(.5,1).setDepth(3.2);
  lightProp(scene,sprite);
  const mark=scene.add.graphics().setDepth(3.4);
  let defeatAt;
  return {
    update() {
      const time=scene.elapsed;
      const reduced=scene.ui.reduceMotion;
      const age=time-boss.since;
      const activePattern=boss.profile?.pattern;
      const state=boss.phase;
      const open=state==='open'&&boss.hits<2;
      if (state==='defeated') defeatAt ??= time;
      const pose=state==='defeated'?'defeat':time<boss.flashUntil?'hurt':open?'open':
        state==='warn'?'wind':state==='attack'?activePattern:'idle';
      const duration=pose==='defeat'?580:pose==='hurt'?150:state==='warn'?boss.profile.warning:
        state==='attack'?boss.profile.attack:650;
      const loop=pose==='idle'||pose==='open';
      const frameAge=reduced ? (pose==='defeat'?580:0) :
        pose==='defeat'?(boss.finishAge ?? time-defeatAt):pose==='hurt'?150-(boss.flashUntil-time):loop?time:age;
      sprite.setFrame(clipFrame(clips,pose,frameAge,duration,loop));
      mark.clear();
      if (open) {
        mark.lineStyle(1,0xffe3a0,.93)
          .strokeRect(boss.x-14,153,28,28);
      } else if (state==='attack') {
        // Highlight the same contact footprint used by the combat controller.
        mark.lineStyle(1,0xcceeff,.86).strokeRect(boss.x-13.5,158,27,24);
      }
    },
  };
}

export function paintTitanField(art, field, frame, time, reduced) {
  const { x,y,width,height } = frame;
  if (frame.phase==='warning') {
    const left=x-width/2;
    const top=y-height/2;
    const opacity=reduced?.72:.6+Math.floor(time/150)%2*.26;
    art.lineStyle(1,0xffcc7a,opacity)
      .strokeRect(left,top,width,height);
    art.fillStyle(0xffe2a8,opacity)
      .fillRect(left,y+height/2-2,width,2);
    return;
  }
  if (frame.phase!=='active') return;
  const bright=reduced||Math.floor(time/115)%2===0?0xdcffff:0xaecbff;
  if (field.kind==='lightning') {
    const half=Math.max(1,width/2-2);
    art.fillStyle(0x7cc9ff,.32).fillRect(x-half,y-height/2,half*2,height);
    art.lineStyle(2,bright,.98).beginPath().moveTo(x,y-height/2);
    for(let n=1;n<=7;n++) art.lineTo(x+[0,-2,3,-2,2,-3,2,0][n],y-height/2+n*height/7);
    art.strokePath();
  } else if(field.kind==='crusher'||field.kind==='electricPulse') {
    art.lineStyle(1,bright,.94).strokeRect(x-width/2+2,y-height/2+1,width-4,height-2);
    if(field.kind==='crusher') {
      art.fillStyle(0xd3b17b).fillRect(x-width/2+5,y-2,width-10,3);
      for(let tooth=-width/2+4;tooth<width/2-4;tooth+=8) {
        art.fillStyle(bright,.9).fillRect(x+tooth,y+height/2-4,4,3);
      }
    }
  }
}
