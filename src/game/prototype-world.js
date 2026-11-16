import { VIEW_HEIGHT } from './level-one.js';
import { atlas, pixelPen } from './prototype-sprites.js';

export const isVerdantPrototype = level => level?.name === 'Verdant Hills';

export function preloadPrototype(scene) {
  for (const [name, file] of [['field-valley','verdant-valley'], ['field-hall','titan-hall']]) {
    if (!scene.textures.exists(name)) scene.load.image(name, import.meta.env.BASE_URL + 'prototype/' + file + '.webp');
  }
}

function seeded(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

export function createValley(scene) {
  if (!scene.textures.exists('field-valley')) return null;
  const vista = scene.add.image(0, 0, 'field-valley').setOrigin(0).setScrollFactor(0).setDepth(-12);
  const mid = scene.add.graphics().setScrollFactor(0).setDepth(-10);
  const seed = seeded(91);
  const grove = Array.from({ length: 38 }, (_, index) => ({
    x: index * 23 + Math.floor(seed() * 17), y: 184 + Math.floor(seed() * 22),
    height: 15 + Math.floor(seed() * 30), width: 11 + Math.floor(seed() * 10),
  }));
  let span = 0;
  let drift = -1;
  return {
    layers: [{ image: vista }],
    resize() {
      span = Math.max(scene.scale.width + 92, 350);
      const height = Math.ceil(span * 2 / 3);
      vista.setDisplaySize(span, height).setY(Math.floor((VIEW_HEIGHT - height) * .55));
      drift = -1;
    },
    scroll(position) {
      vista.x = -Math.min(span - scene.scale.width, Math.round(position * .048));
      const offset = Math.floor(position * .18);
      if (offset === drift) return;
      drift = offset;
      mid.clear();
      for (const tree of grove) {
        const x = (tree.x - offset % 875 + 875) % 875 - 23;
        if (x > scene.scale.width + 15) continue;
        const { y, height, width } = tree;
        mid.fillStyle(0x102f35, .40).fillRect(x - 1, y-height, 3, height+30);
        for (let tier=0;tier<4;tier++) {
          const t = Math.floor(tier*height/6);
          const w = 4 + Math.floor(width * (tier+1)/4);
          mid.fillStyle(tier%2 ? 0x294d48 : 0x1a403e, .58)
            .fillTriangle(x,y-height+t-5,x-w,y-height+t+10,x+w,y-height+t+10);
        }
      }
    },
  };
}

export function createTitanHall(scene) {
  if (!scene.textures.exists('field-hall')) return null;
  const image = scene.add.image(0, 0, 'field-hall').setScrollFactor(0).setDepth(-6).setOrigin(0);
  const floor = scene.add.graphics().setDepth(.2);
  const left = scene.level.ground.at(-1)[0];
  const right = scene.level.width;
  let previousWidth;
  floor.fillStyle(0x24213f).fillRect(left,184,right-left,36);
  for (let x=left;x<right;x+=23) {
    const width = Math.min(22,right-x);
    floor.fillStyle(0x464963).fillRect(x,184,width,4).fillRect(x+2,191,Math.max(0,width-4),2);
    floor.fillStyle(0x323950).fillRect(x+1,188,Math.max(0,width-2),11);
    floor.fillStyle(0xaa8b69).fillRect(x,184,Math.min(width,5),2);
    if (width > 15) floor.fillStyle(0x66b6bf).fillRect(x+8,192,7,1);
  }
  return {
    update() {
      const width = scene.scale.width;
      if (width !== previousWidth) {
        previousWidth = width;
        const cover = Math.max(width, 330);
        const height = Math.ceil(cover * 2 / 3);
        image.setDisplaySize(cover,height).setPosition(Math.round((width-cover)/2),Math.round((VIEW_HEIGHT-height)*.56));
      }
      const alpha = Math.max(0, Math.min(1, (scene.player.x - left + 20)/76));
      image.setAlpha(alpha).setVisible(alpha > 0);
      scene.backdrop.setVisible(alpha < 1);
    },
  };
}

export function valleySurface(scene, x, y, width, height) {
  const key = `field-surface-${x}-${y}-${width}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, width, height);
    const { rect:r, shape:s } = pixelPen(texture.context);
    const random = seeded(x * 6959 + y);
    const soil = ['#3d3033','#544039','#63463c','#79553e','#9d6f48','#bd8c57'];
    r('#2b2b2e',0,0,width,height);
    r(soil[1],1,3,width-2,height-5);
    for (let i=0;i<width*height/13;i++) {
      const px=1+Math.floor(random()*(width-3));
      const py=4+Math.floor(random()*Math.max(1,height-6));
      const color=soil[Math.floor(random()*soil.length)];
      r(color,px,py,Math.min(width-px-1,2+Math.floor(random()*5)),py>height-3?1:2);
    }
    for (let px=0;px<width;px++) {
      const root = 2+Math.floor(random()*5);
      r('#244b3f',px,1,1,root+2);
      if (px>1 && px<width-2) r(random()>.35?'#5c9c55':'#91b95c',px,0,1,2);
      if (random()>.7 && px>2 && px<width-2) r('#bed67a',px,0,1,1);
    }
    s('#263d36',[0,0],[4,2],[3,4],[1,7],[0,8]);
    s('#213530',[width,0],[width-4,2],[width-3,4],[width-1,7],[width,8]);
    for (let px=10;px<width-8;px+=Math.round(14+random()*18)) {
      const py = Math.min(height-4,6+Math.floor(random()*(height-5)));
      s('#302831',[px-3,py+3],[px-1,py],[px+5,py],[px+8,py+4],[px+3,py+5],[px-3,py+5]);
      s('#8f7c6f',[px-1,py+1],[px+3,py],[px+5,py+2],[px+1,py+3],[px-1,py+3]);
      r('#d0ad8b',px,py+1,2,1);
    }
    texture.refresh();
  }
  return scene.add.image(x,y,key).setOrigin(0);
}

function foliage(context,x,y,kind) {
  const {rect:r,shape:s} = pixelPen(context,x,y);
  if (kind === 'tree') {
    s('#1b3a35',[20,63],[25,36],[27,20],[22,15],[34,10],[39,24],[35,42],[43,63]);
    s('#5e5941',[25,63],[28,37],[29,22],[34,24],[33,45],[36,63]);
    r('#a48750',29,41,2,17);
    for (const [cx,cy,size] of [[13,25,12],[21,16,14],[33,11,16],[44,20,14],[49,29,10],[31,26,16],[20,32,11]]) {
      s('#1c473d',[cx-size,cy],[cx-size+5,cy-8],[cx-2,cy-12],[cx+8,cy-10],[cx+size,cy-2],[cx+size-3,cy+6],[cx-6,cy+8]);
      s('#3b764b',[cx-size+2,cy-2],[cx-size+7,cy-8],[cx,cy-10],[cx+8,cy-8],[cx+size-1,cy-1],[cx+2,cy-2],[cx-5,cy+1]);
      r('#6c9c53',cx-5,cy-8,6,2);
      r('#8db565',cx-4,cy-9,3,1);
    }
  } else if (kind === 'shrub') {
    s('#24493c',[0,18],[3,11],[8,10],[10,6],[15,4],[18,7],[22,7],[26,12],[28,18]);
    s('#4d814c',[3,14],[8,12],[10,8],[15,5],[19,8],[22,8],[24,13],[16,11],[11,13]);
    r('#abc76c',12,7,4,1);
    r('#dfae84',19,11,2,2);
    r('#dfae84',8,12,2,2);
  } else {
    for (let i=0;i<4;i++) {
      const dx = 2+i*4;
      const height = [8,13,10,6][i];
      r('#497a47',dx,18-height,1,height);
      r(i%2?'#e3a860':'#e3babb',dx-1,18-height,3,2);
      r('#eee0ab',dx,17-height,1,1);
    }
  }
}

export function valleyProps(scene) {
  atlas(scene, 'field-flora',64,63,{ tree:1,shrub:1,flowers:1 },foliage);
  const branches = [];
  for (const [x, scale] of scene.level.trees) {
    const image = scene.add.image(x,184,'field-flora','tree0').setOrigin(.5,1).setDepth(-3).setScale(scale*1.3);
    branches.push(image);
  }
  const random=seeded(436);
  for (const [left,right] of scene.level.ground) {
    for (let x=left+14;x<right-14;x+=25+Math.floor(random()*38)) {
      scene.add.image(x,229,'field-flora',random()>.45?'shrub0':'flowers0').setOrigin(.25,1).setDepth(-2);
    }
  }
  return {
    update(time) {
      for (const [index, tree] of branches.entries()) {
        tree.setRotation(Math.round(Math.sin(time/1050+index)*2)*.011);
      }
    },
  };
}

export function valleyObjects(scene) {
  atlas(scene, 'field-coins',20,20,{ spin:6 },(ctx,x,y,_pose,frame)=>{
    const {rect:r,shape:s}=pixelPen(ctx,x,y);
    const half=[6,5,3,1,3,5][frame];
    const a = 10-half;
    const b = 10+half;
    s('#603f31',[a+1,2],[b-1,2],[b+2,6],[b+2,14],[b-1,18],[a+1,18],[a-2,14],[a-2,6]);
    s('#d99141',[a+1,3],[b-1,3],[b+1,7],[b+1,13],[b-1,17],[a+1,17],[a-1,13],[a-1,7]);
    s('#f9cc5e',[a+1,4],[b-1,4],[b,7],[b,12],[b-1,15],[a+1,15],[a,12],[a,7]);
    r('#fff4ad',a+1,5,Math.max(1,half),1);
    r('#fff4ad',a,7,1,5);
    if (half>=3) s('#b1743f',[10,6],[13,10],[10,14],[7,10]);
    r('#fff4ad',10,8,1,3);
  });
  atlas(scene,'field-signs',38,42,{ checkpoint:1,active:1,exit:1 },(ctx,x,y,pose)=>{
    const {rect:r,shape:s}=pixelPen(ctx,x,y);
    const lit=pose!=='checkpoint';
    s('#263333',[3,42],[3,35],[7,30],[7,10],[13,4],[24,4],[30,10],[30,30],[34,35],[34,42]);
    r('#6c7864',6,37,26,3);
    r('#9f9973',8,34,22,2);
    r('#908561',8,12,4,20);
    r('#556054',25,12,4,20);
    r('#525e58',12,13,13,19);
    s(lit?'#c3ba71':'#7d8567',[18,9],[24,16],[18,25],[13,16]);
    s(lit?'#f8ec9b':'#a7a17f',[18,11],[22,16],[18,21],[15,16]);
    r('#b28c5e',12,7,12,2);
    if (pose==='exit') {
      s('#454e39',[15,3],[36,6],[29,13],[37,19],[14,17]);
      s('#d6b273',[16,4],[34,7],[28,13],[33,17],[16,16]);
      r('#fff0b2',17,5,1,10);
    }
  });
}
