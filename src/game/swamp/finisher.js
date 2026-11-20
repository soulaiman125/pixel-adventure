import { paintedEffect } from '../rendering/painted-parts.js';

const HIT_STOP_MS = 190;
const DISSOLVE_MS = 840;
const accents = {
  crown: [0xf2ca8d,0xae80df], queen: [0xe9ff96,0x8bc951], titan: [0xddfaff,0x6ce5ff],
  phantom: [0xeedcff,0xa68be6], abyss: [0xbeffef,0x659fbf], dragon: [0xe6f5ff,0x9ed3ef],
  cyber: [0x9cffff,0xf775e1], emperor: [0xffc2d8,0xe87a90],
};

const rays=Array.from({length:24},(_,i)=>{
  const angle=i*2.39996;
  return [Math.cos(angle),Math.sin(angle),20+i%7*7];
});

export function beginBossFinisher(scene, boss) {
  if (!scene.swampOptions?.finisher || scene.ui.reduceMotion || scene.bossFinisher) return false;
  const camera = scene.cameras.main, originalZoom = camera.zoom;
  const [light, color] = accents[boss.kind] ?? accents.crown;
  const graphics = scene.add.graphics().setDepth(9);
  const halo=paintedEffect(scene,'halo',8.95).setPosition(boss.x,159);
  const wasPaused = scene.physics.world.isPaused;
  scene.physics.pause();
  scene.controls.discardActions();
  camera.flash(156, light >> 16, light >> 8 & 255, light & 255, true);
  let time = 0;
  boss.finishAge = 0;
  scene.bossFinisher = delta => {
    time += Math.min(50, delta);
    const release = Math.max(0, time - HIT_STOP_MS);
    const t = Math.min(1, release / DISSOLVE_MS);
    boss.finishAge = release * .82;
    const punch = Math.min(1, time / 85) * (1 - t) ** 3;
    camera.setZoom(originalZoom * (1 + .12 * punch));
    const x = boss.x, y = 159;
    graphics.clear();
    if (release > 0) {
      const flare=(1-t)**2;
      halo.setVisible(true).setAlpha(flare*.65).setDisplaySize(20+110*t,13+50*t);
      graphics.lineStyle(2,light,.72*flare).strokeCircle(x,y,8+51*t)
        .lineStyle(.8,color,.64*flare).strokeEllipse(x,y,24+95*t,9+38*t)
        .fillStyle(light,.3*flare).fillEllipse(x,y,16+24*t,5+12*t);
      for (let i = 0; i < rays.length; i++) {
        const [dx,dy,distance]=rays[i];
        const travel=distance*(1-flare);
        const px=x+dx*travel;
        const py=y+dy*travel*.83-20*t+16*t*t;
        const size = (1.4 + i % 4) * (1 - t * .72), lightness = (1 - t) ** 1.15;
        graphics.fillStyle(i % 3 ? color : light, lightness)
          .fillTriangle(px-dx*size*2,py-dy*size*2,px+size*.7,py-size,px+size,py+size*.5);
        if(i%3===0)graphics.fillStyle(light,.66*lightness).fillCircle(px,py,Math.max(.5,size*.38));
      }
    }
    if (t === 1) {
      graphics.destroy();
      halo.destroy();
      camera.setZoom(originalZoom);
      boss.finishAge = Infinity;
      scene.bossFinisher = null;
      scene.controls.discardActions();
      if (!wasPaused) scene.physics.resume();
    }
  };
  return true;
}
