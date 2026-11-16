import { atlas, pixelPen } from './prototype-sprites.js';

// Each line is a native-pixel pose. Hips, chest, hood, rear hand, front hand,
// then knee and ankle for each leg. Sword coordinates are the visible tip.
const pose = (hips, chest, head, rear, hand, backLeg, leadLeg, blade) =>
  ({ hips, chest, head, rear, hand, backLeg, leadLeg, blade });

const ready = pose([32,52],[33,35],[34,22],[22,45],[41,47],[27,61,25,70],[36,62,38,70]);
const crouch = pose([31,59],[37,44],[41,32],[26,53],[47,52],[24,65,23,70],[42,62,42,70]);

export const shadowFrames = {
  idle: [
    ready, pose([32,52],[33,34],[34,21],[22,45],[41,46],[28,61,25,70],[36,62,38,70]),
    pose([32,52],[33,35],[34,22],[23,46],[40,47],[27,61,25,70],[36,62,38,70]), ready,
  ],
  run: [
    pose([32,51],[36,34],[40,22],[24,47],[46,40],[24,61,14,68],[45,59,50,69]),
    pose([32,53],[38,36],[41,25],[26,49],[45,43],[23,59,16,65],[40,62,45,70]),
    pose([32,53],[38,35],[41,24],[32,49],[44,46],[24,55,21,63],[35,63,35,70]),
    pose([33,50],[38,33],[41,22],[40,47],[33,49],[34,57,24,65],[40,59,38,68]),
    pose([32,51],[36,34],[40,22],[48,41],[24,46],[45,59,49,68],[24,61,14,68]),
    pose([32,53],[38,36],[41,25],[45,43],[26,49],[39,62,43,70],[23,59,16,66]),
    pose([32,53],[38,35],[41,24],[42,46],[34,50],[35,63,35,70],[24,55,21,63]),
    pose([33,50],[38,33],[41,22],[34,48],[47,43],[40,59,37,67],[34,57,24,65]),
  ],
  jumpStart: [
    crouch, pose([31,56],[36,39],[40,26],[23,52],[47,34],[24,63,23,70],[44,56,41,66]),
    pose([32,49],[35,33],[38,20],[24,43],[46,26],[24,59,21,66],[44,53,39,62]),
  ],
  rise: [
    pose([32,51],[34,34],[37,21],[24,39],[44,26],[24,57,20,67],[44,52,39,62]),
    pose([32,49],[35,32],[38,19],[24,34],[46,25],[23,57,22,65],[43,49,39,60]),
    pose([33,48],[34,32],[38,19],[23,32],[45,31],[25,59,21,65],[42,51,41,62]),
  ],
  fall: [
    pose([33,51],[34,34],[36,22],[19,30],[48,38],[27,61,23,70],[42,58,45,64]),
    pose([33,53],[34,36],[37,23],[20,37],[50,42],[27,61,24,70],[39,62,46,69]),
    pose([33,55],[36,38],[39,25],[23,45],[47,48],[28,63,23,70],[44,64,49,70]),
  ],
  land: [crouch, pose([30,60],[42,44],[46,33],[25,56],[50,61],[23,66,21,70],[44,63,46,70]),
    pose([31,56],[36,40],[39,28],[25,47],[45,51],[25,64,24,70],[39,62,43,70]), ready],
  slash1: [
    pose([30,53],[31,36],[38,23],[27,45],[26,41],[24,61,20,70],[39,61,42,70],[3,33]),
    pose([33,54],[38,37],[44,26],[28,46],[50,44],[24,61,19,70],[43,62,46,70],[78,43]),
    pose([34,55],[41,38],[47,26],[30,48],[54,47],[26,62,19,70],[45,62,48,70],[79,49]),
    pose([34,54],[40,37],[43,25],[30,48],[46,50],[27,63,21,70],[42,62,47,70],[68,59]),
    pose([32,52],[34,35],[38,22],[23,45],[41,48],[27,61,24,70],[38,62,41,70],[64,56]),
  ],
  slash2: [
    pose([31,57],[37,41],[42,29],[27,52],[47,57],[25,65,21,70],[43,62,46,70],[71,66]),
    pose([32,55],[37,37],[42,25],[25,48],[48,47],[24,63,20,70],[42,63,47,70],[75,39]),
    pose([33,51],[37,34],[42,21],[25,49],[48,33],[24,62,21,70],[42,58,46,70],[70,19]),
    pose([32,51],[35,34],[40,21],[24,48],[44,26],[26,61,21,70],[39,59,45,70],[61,7]),
    pose([31,52],[34,35],[38,22],[24,46],[39,29],[25,61,24,70],[39,61,44,70],[56,12]),
  ],
  slash3: [
    pose([29,54],[32,35],[36,22],[28,29],[35,21],[24,62,21,70],[39,62,42,70],[11,10]),
    pose([28,55],[27,34],[35,21],[26,24],[29,17],[23,62,18,70],[39,61,42,70],[7,5]),
    pose([32,53],[39,35],[43,24],[38,32],[43,26],[24,60,17,70],[45,61,48,70],[69,9]),
    pose([34,58],[43,44],[48,32],[43,48],[55,52],[24,64,17,70],[47,63,51,70],[82,61]),
    pose([34,58],[42,44],[47,32],[43,50],[55,56],[25,65,18,70],[48,64,51,70],[79,65]),
    pose([33,55],[39,41],[43,29],[36,48],[51,55],[24,63,20,70],[44,64,48,70],[74,67]),
    pose([32,53],[34,36],[37,23],[32,48],[42,49],[26,62,23,70],[39,62,43,70],[63,60]),
  ],
  throw: [
    pose([32,53],[31,36],[35,23],[40,46],[26,38],[26,61,22,70],[38,62,43,70]),
    pose([31,53],[29,35],[35,22],[37,46],[21,33],[26,61,22,70],[42,62,45,70]),
    pose([33,53],[38,35],[43,23],[29,46],[54,40],[25,61,21,70],[45,62,48,70]),
    pose([34,54],[39,37],[44,24],[30,47],[51,43],[26,61,22,70],[44,62,47,70]), ready,
  ],
  dashGround: [
    crouch, pose([29,57],[43,45],[53,37],[15,49],[49,55],[19,64,9,69],[43,62,44,70]),
    pose([31,56],[47,43],[55,34],[15,46],[46,54],[17,62,4,69],[43,62,48,68]),
    pose([33,55],[46,42],[53,33],[19,47],[48,51],[20,62,8,68],[45,62,51,70]),
    pose([32,55],[41,40],[46,29],[22,49],[51,48],[24,62,17,69],[44,62,48,70]),
  ],
  dashAir: [
    pose([31,51],[41,37],[49,29],[19,39],[50,43],[22,59,12,63],[40,55,36,64]),
    pose([28,52],[44,41],[55,34],[13,43],[48,47],[14,55,4,60],[38,56,33,64]),
    pose([29,52],[46,41],[55,33],[11,39],[51,42],[12,54,2,58],[34,57,24,62]),
    pose([31,51],[44,39],[53,30],[14,41],[48,44],[18,55,9,62],[42,54,34,63]),
    pose([33,53],[40,37],[46,26],[22,42],[51,40],[24,58,17,65],[43,58,41,68]),
  ],
  hurt: [
    pose([32,53],[29,35],[27,22],[21,32],[42,42],[26,62,22,69],[40,60,45,68]),
    pose([31,54],[25,37],[22,24],[19,25],[39,44],[23,60,19,68],[41,62,44,69]),
    pose([32,54],[27,37],[24,25],[19,34],[41,44],[25,61,21,69],[40,62,45,69]),
  ],
  knockback: [
    pose([33,54],[23,41],[18,28],[13,28],[33,42],[26,60,17,69],[43,59,49,65]),
    pose([32,55],[20,47],[15,36],[11,38],[31,49],[24,63,15,69],[45,59,50,65]),
    pose([32,56],[18,49],[11,39],[9,46],[31,53],[23,65,15,69],[47,61,51,67]),
  ],
  death: [
    pose([31,61],[20,51],[14,42],[18,59],[35,60],[24,65,17,70],[46,63,49,69]),
    pose([31,64],[17,55],[10,48],[16,64],[35,65],[23,67,18,70],[45,63,49,69]),
    pose([32,65],[19,62],[9,58],[15,69],[35,68],[24,67,17,70],[45,64,51,70]),
    pose([33,66],[20,65],[8,62],[15,70],[35,70],[24,69,17,71],[46,66,52,71]),
    pose([33,67],[20,67],[8,64],[15,71],[35,71],[25,69,18,71],[46,67,53,71]),
  ],
  respawn: [
    pose([32,59],[30,47],[26,37],[21,56],[42,55],[23,66,20,70],[42,64,46,70]),
    pose([32,57],[30,42],[28,31],[20,53],[43,51],[24,65,22,70],[43,62,46,70]),
    pose([32,54],[31,38],[32,26],[22,48],[40,49],[26,63,23,70],[38,62,44,70]),
    ready,
  ],
  victory: [
    pose([32,52],[34,35],[36,22],[22,45],[45,40],[27,61,24,70],[36,62,42,70],[66,30]),
    pose([32,52],[34,34],[37,22],[23,42],[47,32],[27,61,24,70],[36,62,42,70],[61,11]),
    pose([32,52],[34,33],[37,20],[23,42],[47,28],[27,61,24,70],[36,62,42,70],[59,4]),
    pose([32,52],[34,34],[37,21],[23,43],[46,31],[27,61,24,70],[36,62,42,70],[58,8]),
  ],
};

export const SHADOW_WIDTH = 112;
export const SHADOW_HEIGHT = 80;
export const shadowClips = Object.fromEntries(Object.entries(shadowFrames).map(([name, frames]) => [name, frames.length]));

const ink = '#101321';
const fold = '#242739';
const navy = '#333d57';
const edge = '#556785';
const rim = '#8997aa';
const red = '#9b2546';
const scarlet = '#d74961';
const stitch = '#e9a180';

function drawNinja(context, ox, oy, name, frame) {
  const { rect: dot, shape: area } = pixelPen(context, ox + 24, oy + 5);
  const { hips, chest, head, rear, hand, backLeg, leadLeg, blade } = shadowFrames[name][frame];
  const [x,y] = head;
  const [cx,cy] = chest;
  const [hx,hy] = hips;
  const aim = ['run','dashGround','dashAir','rise','jumpStart'].includes(name);
  const ripple = [0,2,4,3,1,-1,-2,-1][frame];
  const neckX = Math.round((x + cx) / 2);
  const neckY = cy - 4;
  const trail = aim ? 42 : name === 'fall' ? 34 : 28;
  const tailX = Math.max(-22, neckX - trail);
  const tailY = Math.min(70, neckY + (aim ? -4 : name === 'fall' ? -13 : 15) + ripple);

  function band(a, b, top, toe, color) {
    const [ax,ay] = a, [bx,by] = b;
    const length = Math.hypot(bx - ax, by - ay) || 1;
    const sx = (by - ay) / length, sy = (ax - bx) / length;
    area(color, [Math.round(ax + sx*top),Math.round(ay + sy*top)], [Math.round(bx + sx*toe),Math.round(by + sy*toe)],
      [Math.round(bx - sx*toe),Math.round(by - sy*toe)], [Math.round(ax - sx*top),Math.round(ay - sy*top)]);
  }

  area(ink,[neckX+2,neckY-2],[neckX-9,neckY-3],[neckX-18,neckY+1],[tailX+10,tailY-1],
    [tailX,tailY-4],[tailX+2,tailY+1],[tailX-1,tailY+4],[tailX+9,tailY+3],[neckX-14,neckY+8],[neckX,neckY+7]);
  area(red,[neckX,neckY],[neckX-10,neckY-1],[neckX-18,neckY+3],[tailX+10,tailY+1],
    [tailX+1,tailY-2],[tailX+4,tailY+1],[tailX+1,tailY+3],[tailX+10,tailY+2],[neckX-13,neckY+7],[neckX,neckY+5]);
  area(scarlet,[neckX-1,neckY],[neckX-10,neckY+1],[neckX-17,neckY+4],[tailX+11,tailY+2],
    [tailX+3,tailY-1],[tailX+12,tailY],[neckX-16,neckY+2],[neckX-9,neckY-1]);
  dot(stitch,neckX-11,neckY+2,5,1);

  function arm(palm, far) {
    const shoulder = [cx+(far?-5:4),cy+2];
    const elbow = [Math.round((shoulder[0]+palm[0])/2)-(far?4:2), Math.round((shoulder[1]+palm[1])/2)+3];
    band(shoulder,elbow,5,4,ink);
    band(elbow,palm,4,3,ink);
    band(shoulder,elbow,3,2,far?fold:navy);
    band(elbow,palm,2,2,far?navy:edge);
    const [px,py] = palm;
    area(ink,[px-3,py-2],[px+3,py-3],[px+5,py],[px+3,py+4],[px-2,py+4],[px-4,py+1]);
    area(far?fold:navy,[px-2,py-1],[px+2,py-2],[px+4,py],[px+2,py+2],[px-2,py+2]);
    dot(rim,px+1,py-2,2,1);
  }
  function leg(limbs, far) {
    const [kx,ky,ax,ay] = limbs;
    const hip = [hx+(far?-3:4),hy-1];
    band(hip,[kx,ky],6,4,ink);
    band([kx,ky],[ax,ay],4,3,ink);
    band(hip,[kx,ky],4,3,far?fold:navy);
    band([kx,ky],[ax,ay-2],2,2,far?fold:edge);
    dot(far?navy:rim,kx-1,ky-2,3,1);
    area(ink,[ax-4,ay-4],[ax+3,ay-4],[ax+4,ay-1],[ax+8,ay],[ax+9,ay+3],[ax+8,ay+4],[ax-4,ay+4],[ax-6,ay+2]);
    area(far?fold:navy,[ax-3,ay-3],[ax+2,ay-3],[ax+3,ay],[ax+7,ay+1],[ax+7,ay+2],[ax-3,ay+2]);
    dot(edge,ax-2,ay-2,4,1);
    dot(far?edge:rim,ax-2,ay+2,9,1);
  }
  if (!blade && !['death','knockback','throw'].includes(name)) {
    band([hx-11,hy+6],[cx+2,cy-10],3,2,ink);
    band([hx-10,hy+5],[cx+2,cy-9],1.5,1,edge);
    dot('#bd995c',cx,cy-12,5,2);
  }
  arm(rear,true);
  leg(backLeg,true);
  leg(leadLeg,false);
  area(ink,[cx-7,cy-4],[cx+5,cy-5],[cx+10,cy+2],[cx+8,cy+9],[hx+8,hy-3],[hx+11,hy+3],
    [hx+4,hy+8],[hx-6,hy+5],[hx-9,hy-3],[cx-9,cy+8],[cx-11,cy+1]);
  area(fold,[cx-6,cy-2],[cx+4,cy-3],[cx+8,cy+2],[cx+6,cy+9],[hx+6,hy-2],[hx+8,hy+2],
    [hx+3,hy+5],[hx-5,hy+3],[hx-7,hy-4],[cx-8,cy+8],[cx-8,cy+2]);
  area(navy,[cx-6,cy-2],[cx+4,cy-3],[cx+6,cy+2],[cx+4,cy+7],[hx+2,hy-4],[hx-5,hy-4],[cx-6,cy+4]);
  area(edge,[cx-6,cy-2],[cx+4,cy-2],[cx+1,cy],[cx-6,cy+2],[cx-7,cy+1]);
  area(navy,[hx-6,hy],[hx+6,hy-2],[hx+8,hy+1],[hx+3,hy+4],[hx-5,hy+2]);
  dot('#594058',hx-6,hy-3,12,2);
  dot('#aa9185',hx+1,hy-4,5,3);
  dot(ink,hx+2,hy-3,2,1);
  dot(edge,hx-4,hy+1,3,1);

  area(ink,[x-10,y-3],[x-6,y-10],[x+3,y-11],[x+9,y-7],[x+11,y-2],[x+11,y+5],
    [x+7,y+9],[x+2,y+12],[x-6,y+10],[x-10,y+5]);
  area(fold,[x-8,y-4],[x-5,y-8],[x+3,y-9],[x+8,y-6],[x+9,y],[x+9,y+5],[x+4,y+8],[x-5,y+8],[x-8,y+4]);
  area(navy,[x-7,y-5],[x-4,y-8],[x+3,y-8],[x+7,y-5],[x+2,y-5],[x-2,y-3],[x-6,y+1],[x-7,y+4]);
  dot(edge,x-4,y-8,6,1);
  area('#9f8389',[x+1,y-1],[x+8,y-2],[x+10,y],[x+9,y+3],[x+5,y+4],[x,y+3]);
  area('#1a2333',[x-2,y+3],[x+6,y+1],[x+10,y+2],[x+9,y+6],[x+4,y+9],[x-4,y+8],[x-6,y+5]);
  area(edge,[x-2,y+4],[x+6,y+2],[x+9,y+3],[x+6,y+4],[x+2,y+4],[x-3,y+6]);
  if (name !== 'death' && !(name === 'idle' && frame===2)) {
    dot('#b4f7f5',x+5,y,3,1);
    dot('#67b4ba',x+8,y,1,1);
  }
  area(red,[x-7,y+7],[x+3,y+9],[x+6,y+8],[x+8,y+10],[x+3,y+13],[x-5,y+12],[x-10,y+10]);
  dot(scarlet,x-6,y+9,8,1);
  dot(stitch,x-3,y+10,3,1);

  arm(hand,false);
  if (blade) {
    const [bx,by] = blade;
    const base = [hand[0]+3, hand[1]-1];
    band(base,[bx,by],3,0,ink);
    band(base,[bx,by],2,0,'#c6d9e4');
    band([base[0],base[1]-1],[bx,by],.8,0,'#fff3d7');
    dot('#cfaa73',base[0]-2,base[1]-3,3,6);
  } else if (name==='throw' && frame<2) drawStar(context,ox+24+hand[0]-5,oy+hand[1],frame);
}

function drawStar(context, x, y, frame) {
  const { rect:r, shape:s } = pixelPen(context,x,y);
  const tips = [[6,0,12,6,6,12,0,6],[9,1,11,9,3,11,1,3],[11,1,11,11,1,11,1,1],[11,3,9,11,1,9,3,1]][frame];
  s(ink,[tips[0],tips[1]],[8,4],[tips[2],tips[3]],[8,8],[tips[4],tips[5]],[4,8],[tips[6],tips[7]],[4,4]);
  s('#b2cbd6',[tips[0],tips[1]],[7,5],[tips[2],tips[3]],[7,7],[tips[4],tips[5]],[5,7],[tips[6],tips[7]],[5,5]);
  r('#fff2cd',5,4,2,2);
  r(navy,6,6,1,1);
}

export function loadShadowArt(scene) {
  atlas(scene,'shadow-ninja',SHADOW_WIDTH,SHADOW_HEIGHT,shadowClips,drawNinja);
  atlas(scene,'shadow-weapons',12,12,{star:4},(ctx,x,y,_clip,frame)=>drawStar(ctx,x,y,frame));
}
