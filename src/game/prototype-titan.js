import { atlas, clipFrame, pixelPen } from './prototype-sprites.js';

const clips = { idle:4, wind:4, wave:4, bolts:4, impact:4, open:4, hurt:2, defeat:5 };
const outline = '#15182c';
const shadow = '#272b4b';
const iron = '#45486a';
const mid = '#687d9d';
const light = '#a8bac8';
const copper = '#b78263';
const humid = '#6674a3';

function forgeTitan(context, ox, oy, pose, frame) {
  const { rect:r, shape:s } = pixelPen(context,ox,oy);
  const smash = pose === 'impact';
  const lift = pose === 'wind' ? Math.min(frame*2,6) : pose === 'bolts' ? 5 : 0;
  const fall = pose === 'defeat' ? frame*9 : 0;
  const lean = pose === 'hurt' ? (frame ? 2 : 4) : 0;
  const drop = smash ? [5,1,7,5][frame] : pose === 'idle' ? frame%2 : 0;
  const x = 48+lean, y = 42+drop+fall;
  const dead = pose === 'defeat';
  const exposed = pose === 'open' || pose === 'hurt';
  const energy = dead ? '#795d61' : exposed ? '#f9c872' : ['#8ae8ed','#abf4ec','#78d5ee','#d4fffa'][frame%4];
  if (dead && frame===4) {
    s(outline,[15,81],[23,71],[38,73],[45,68],[61,72],[75,73],[86,82]);
    s(iron,[20,81],[27,74],[40,75],[45,70],[55,73],[63,78],[74,75],[83,82]);
    r(copper,28,78,8,2);
    r(mid,47,79,13,2);
    r(energy,58,74,2,2);
    return;
  }
  for(const side of [-1,1]) {
    const sx = x+side*17;
    s(outline,[sx-12,63+drop+fall],[sx+9,63+drop+fall],[sx+11,72+fall],[sx+14,74+fall],
      [sx+16,82],[sx-15,82],[sx-15,77],[sx-12,72]);
    s(iron,[sx-9,65+drop+fall],[sx+6,65+drop+fall],[sx+7,73+fall],[sx+12,76+fall],
      [sx+12,80],[sx-12,80],[sx-10,74+fall]);
    r(shadow,sx-10,77+fall,24,3);
    r(copper,sx-7,77+fall,3,2);
    r(light,sx-4,76+fall,14,2);
    r(energy,sx-5,73+fall,7,1);
  }
  // Segmented shoulder coils and braced chassis.
  s(outline,[x-30,y-9],[x-19,y-21],[x+19,y-21],[x+30,y-9],[x+28,y+15],[x+20,y+28],
    [x-20,y+28],[x-28,y+15]);
  s(shadow,[x-27,y-8],[x-17,y-18],[x+17,y-18],[x+28,y-8],[x+24,y+14],[x+18,y+24],[x-18,y+24],[x-24,y+14]);
  s(iron,[x-24,y-7],[x-16,y-15],[x+15,y-15],[x+23,y-7],[x+17,y+7],[x+4,y+15],[x-13,y+12],[x-23,y+6]);
  s(mid,[x-24,y-8],[x-17,y-17],[x+8,y-16],[x+2,y-13],[x-16,y-11],[x-21,y-4]);
  r(light,x-18,y-15,10,1);
  r('#8c6967',x-20,y-3,5,2);
  r('#20243b',x+14,y-9,6,1);
  r(shadow,x-16,y+12,30,2);
  r('#33354e',x-14,y+15,28,7);
  r(copper,x-11,y+20,22,2);
  r(light,x-12,y+14,5,2);
  r(light,x+8,y+14,5,2);
  for (const direction of [-1,1]) {
    const cx=x+direction*26;
    const cy=y-7-lift;
    s(outline,[cx-8,cy+7],[cx-8,cy-17],[cx-5,cy-23],[cx+4,cy-23],[cx+9,cy-17],[cx+10,cy+7]);
    r(iron,cx-5,cy-18,11,25);
    r(mid,cx-4,cy-19,3,20);
    for (let band=0;band<5;band++) {
      r('#4d3a4d',cx-7,cy-17+band*4,15,3);
      r(copper,cx-6,cy-17+band*4,11,1);
      r(band%2?energy:light,cx-3,cy-16+band*4,7,1);
    }
    r(mid,cx-7,cy-23,15,5);
    r(light,cx-5,cy-23,8,2);
    const reach = pose==='wave' ? [0,7,10,3][frame] : smash ? [0,5,7,4][frame] : 0;
    const armX=x+direction*(31+reach);
    const armY=y+(smash?[1,8,20,14][frame]:pose==='bolts'?-4:6)-lift;
    s(outline,[armX-12,armY-9],[armX+10,armY-9],[armX+14,armY+1],[armX+10,armY+17],[armX-9,armY+17],[armX-13,armY+8]);
    s(iron,[armX-10,armY-7],[armX+8,armY-7],[armX+11,armY+2],[armX+8,armY+14],[armX-7,armY+14],[armX-11,armY+7]);
    r(mid,armX-8,armY-7,14,3);
    r(light,armX-9,armY-6,10,1);
    r(shadow,armX-9,armY-3,18,2);
    r(shadow,armX-9,armY+5,17,2);
    r('#594d66',armX-10,armY+10,20,4);
    r(copper,armX-10,armY+8,20,2);
    for(let rivet=0;rivet<3;rivet++) {
      r(outline,armX-8+rivet*6,armY,4,4);
      r(light,armX-7+rivet*6,armY+1,2,1);
      r(energy,armX-6+rivet*5,armY+11,3,1);
    }
    if (!dead && (pose==='bolts'||pose==='wind') && frame%2) {
      s(energy,[cx-2,cy-25],[cx+7,cy-33],[cx+14,cy-32],[cx+11,cy-28],[cx+16,cy-23],[cx+8,cy-26],[cx+10,cy-30]);
    }
  }
  // Inset helm and aperture. The glowing core lives near the existing hit zone.
  s(outline,[x-13,y-7],[x-9,y-15],[x+8,y-15],[x+14,y-7],[x+12,y+7],[x+7,y+11],[x-9,y+11],[x-14,y+6]);
  s(iron,[x-11,y-6],[x-8,y-13],[x+7,y-13],[x+11,y-6],[x+10,y+5],[x+6,y+8],[x-8,y+8],[x-11,y+5]);
  r(light,x-7,y-13,13,2);
  r(copper,x-8,y-10,3,1);
  r(copper,x+5,y-10,3,1);
  r(humid,x-10,y-9,4,10);
  r('#151b32',x-7,y-7,14,6);
  r(energy,x-6,y-6,4,3);
  r(energy,x+2,y-6,4,3);
  r(outline,x-6,y-6,pose==='hurt'?4:2,1);
  r(outline,x+4,y-6,2,1);
  r(light,x-5,y-6,1,1);
  r(light,x+5,y-6,1,1);
  r(shadow,x-4,y+2,8,4);
  r(mid,x-6,y+7,12,1);
  s('#1a2035',[x,y+8],[x+11,y+15],[x+9,y+24],[x,y+28],[x-9,y+24],[x-11,y+15]);
  s(exposed?'#af704e':'#3a6281',[x,y+10],[x+8,y+16],[x+6,y+23],[x,y+25],[x-6,y+23],[x-8,y+16]);
  s(energy,[x,y+13],[x+5,y+17],[x+4,y+21],[x,y+23],[x-4,y+21],[x-5,y+17]);
  r(exposed?'#fff3be':'#d8ffff',x-2,y+16,4,3);
}

export function addTitanPresentation(scene, boss) {
  atlas(scene,'forge-titan',96,82,clips,forgeTitan);
  const sprite=scene.add.image(boss.x,184,'forge-titan','idle0').setOrigin(.5,1).setDepth(3.2);
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
