import { makeCanvas } from '../rendering/lighting.js';
import { canvasLayer } from '../rendering/projected-shadows.js';
import { VIEW_HEIGHT, GROUND_Y } from '../level-one.js';
import { softenDistance } from './post.js';
import { paintedSpriteTier } from '../rendering/painted-parts.js';

export function randomFrom(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export function shape(ctx, fill, points) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fill();
}

export function treeTexture(ctx, x, y, height, seed, palette) {
  const random = randomFrom(seed);
  const lean = (random() - .5) * height * .31;
  const width = 7 + random() * height * .12;
  const top = x + lean;
  const wood = ctx.createLinearGradient(x - width, 0, x + width, 0);
  palette.forEach((color, index) => wood.addColorStop(index / (palette.length - 1), color));
  shape(ctx, wood, [[x-width*1.9,y],[x-width*.78,y-15],[x-width*.55,y-height*.46],
    [top-width*.43,y-height],[top+width*.46,y-height],[x+width*.55,y-height*.42],
    [x+width,y-12],[x+width*2.2,y]]);
  for (const side of [-1,1]) {
    const tip = x + side * height * (.28 + random() * .22);
    shape(ctx, palette[1], [[x,y-height*.49],[tip,y-height*.79],[tip+side*7,y-height*.83],
      [x+side*width*.35,y-height*.68],[x,y-height*.61]]);
  }
  for (let i = 0; i < 24; i++) {
    const radius = 5 + random() * height * .11;
    const ux = top + (random() - .5) * height * 1.22;
    const uy = y - height * (.78 + random() * .36);
    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.ellipse(ux, uy, radius * 1.22, radius * .42, random() - .5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const offset = (random() - .55) * width * 1.35;
    ctx.strokeStyle = palette[i % palette.length];
    ctx.lineWidth = .55;
    ctx.beginPath();
    ctx.moveTo(top + offset, y - height * .82);
    ctx.quadraticCurveTo(x + offset * 1.3, y - height * .34, x + offset, y - 4);
    ctx.stroke();
  }
}

function arch(ctx, x, y, width, height) {
  ctx.save();
  ctx.translate(x, y);
  const stone = ctx.createLinearGradient(0, 0, width, height);
  stone.addColorStop(0, '#9e9a69');
  stone.addColorStop(.48, '#637764');
  stone.addColorStop(1, '#324e46');
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, 18);
  ctx.quadraticCurveTo(width * .5, -18, width, 18);
  ctx.lineTo(width, height);
  ctx.lineTo(width * .73, height);
  ctx.lineTo(width * .73, 30);
  ctx.quadraticCurveTo(width * .5, 6, width * .27, 30);
  ctx.lineTo(width * .27, height);
  ctx.closePath();
  ctx.fill();
  for (let row = 24; row < height; row += 8) {
    ctx.fillStyle = '#31463a';
    ctx.fillRect(1, row, width * .247, 1);
    ctx.fillRect(width * .75, row, width * .23, 1);
  }
  ctx.restore();
}

export function createSwampBackdrop(scene) {
  const source = scene.textures.get(scene.textures.exists('swamp-distance') ? 'swamp-distance' : 'campaign-world-jungle').getSourceImage();
  const width = 720;
  const layers = [];
  const layer = (speed, paint) => {
    const canvas = makeCanvas(width, VIEW_HEIGHT);
    paint(canvas.getContext('2d'));
    layers.push({ canvas, speed });
  };
  layer(.12,ctx=>{
    for(let x=-28;x<width+45;x+=53){
      treeTexture(ctx,x,161,96+(x*2%37),x+73,['#29483b','#43705a','#53806a']);
    }
  });
  layer(.28,ctx=>{
    for(let x=28;x<width;x+=136){
      arch(ctx,x,83+(x%24),55+(x%33),77);
      ctx.fillStyle='#6c8661';
      ctx.fillRect(x-7,156+(x%15),78,7);
    }
  });
  layer(.48,ctx=>{
    for(let x=-45;x<width+45;x+=111){
      treeTexture(ctx,x,177,135+(x%39),x+364,['#182e24','#2d5038','#527048']);
    }
  });
  layer(.70,ctx=>{
    const random=randomFrom(930);
    for(let i=0;i<73;i++){
      const x=random()*width,y=154+random()*25,r=6+random()*19;
      shape(ctx,i%3?'#21452f':'#42784f',[[x,y+8],[x-r*.4,y-r],[x-1,y-2],[x+r*.62,y-r*.7],[x+3,y+10]]);
    }
  });
  const base = scene.swamp.options.post ? softenDistance(source) : source;
  const opacity = [.15, .40, .27, .48];
  const mobile = paintedSpriteTier(scene.textures).density === 3;
  const render=canvasLayer(scene,-13,(ctx,camera)=>{
    const span=Math.max(camera.width+164,VIEW_HEIGHT*source.width/source.height);
    const slide=(scene.level.width-camera.width)>0 ? camera.scrollX/(scene.level.width-camera.width) : 0;
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(base,-(span-camera.width)*(.2+.57*slide),0,span,VIEW_HEIGHT);
    // The two tree overlays are full-screen blends. Keep the vista, ruins and
    // near foliage when a mobile device has hit the minimum render resolution.
    const underLoad = mobile && scene.game.canvas.height <= VIEW_HEIGHT;
    layers.forEach(({canvas,speed},i)=>{
      if (underLoad && (i === 0 || i === 2)) return;
      const shift=(camera.scrollX*speed)%width;
      ctx.globalAlpha=opacity[i];
      for(let x=-shift;x<camera.width;x+=width)ctx.drawImage(canvas,x,0);
    });
  },false);
  return { layers, resize(){}, scroll(){},
    setVisible(visible){render.setVisible(visible);} };
}

export function addSwampRuins(scene, weather) {
  scene.level.ground.forEach(([left,right],index)=>{
    const key='swamp-arch-'+index+(weather?'-moss':'');
    if(!scene.textures.exists(key)){
      const texture=scene.textures.createCanvas(key,110,101);
      const { context:ctx }=texture;
      arch(ctx,12,10,78,91);
      const random=randomFrom(index+10);
      for(let i=0;i<60;i++){
        const x=random()*105,y=70+random()*30;
        if(x>15&&x<88){ctx.fillStyle=i%3?'#435744':'#72865b';ctx.fillRect(x,y,2+random()*5,1+random()*3);}
      }
      weather?.(ctx, 110, 101, index + 1, 34);
      texture.refresh();
    }
    const ruin=scene.add.image(left+(right-left)*.65,GROUND_Y+1,key).setOrigin(.5,1).setDepth(-2.6);
    scene.swamp.light?.(ruin);
    scene.swamp.cast?.(ruin,false,true);
  });
}
