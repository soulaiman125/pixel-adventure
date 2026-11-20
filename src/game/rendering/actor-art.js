// These are reflected light colors. Costume and species colors stay in their own source palettes.
export const biomeLight = {
  verdant:[255,222,154], canyon:[255,192,136], crystal:[181,221,255],
  fire:[255,170,129], castle:[221,197,246], jungle:[156,233,213], thunder:[154,224,255],
  bamboo:[143,239,191], sunken:[139,230,224], sky:[255,220,170], neon:[170,206,255],
  eclipse:[255,179,199],
};

const surfaces = new WeakMap();
const colorCache = new Map();
export const ACTOR_DENSITY = 2;

function surfaceColors(color, biome) {
  const key = biome+'|'+color;
  if (colorCache.has(key)) return colorCache.get(key);
  const channels = color.slice(1).match(/../g).map(channel=>parseInt(channel,16));
  const light = biomeLight[biome] ?? biomeLight.verdant;
  const value = Math.max(...channels);
  const gain = value < 54 ? .11 : .26;
  const css = (amount,tint) => 'rgb('+channels.map((channel,i)=>Math.round(channel*(1-amount)+tint[i]*amount)).join(',')+')';
  const stops = [css(gain,light), color, css(.27,[12,16,29])];
  colorCache.set(key,stops);
  return stops;
}

export function useActorPalette(context, biome) {
  surfaces.set(context,biome);
}

export function materialPen(ctx, ox, oy) {
  const biome = surfaces.get(ctx);
  if (!biome) return null;
  function fill(color, x, y, width, height) {
    if (!/^#[0-9a-f]{6}$/i.test(color) || !(width*height>=18)) return color;
    const [light,mid,dark] = surfaceColors(color,biome);
    const shade = ctx.createLinearGradient(x,y,x+width*.48,y+Math.max(1,height));
    shade.addColorStop(0,light);
    shade.addColorStop(.49,mid);
    shade.addColorStop(1,dark);
    return shade;
  }
  return {
    rect(color,x,y,w,h) {
      ctx.fillStyle=fill(color,ox+x,oy+y,w,h);
      ctx.fillRect(ox+x,oy+y,w,h);
    },
    shape(color,...points) {
      if (points.some(([x,y])=>!Number.isFinite(x)||!Number.isFinite(y))) return;
      let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
      ctx.beginPath();
      points.forEach(([x,y],i)=>{
        minX=Math.min(minX,x); minY=Math.min(minY,y);
        maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
        if (i) ctx.lineTo(ox+x,oy+y); else ctx.moveTo(ox+x,oy+y);
      });
      ctx.closePath();
      ctx.fillStyle=fill(color,ox+minX,oy+minY,maxX-minX,maxY-minY);
      ctx.fill();
    },
  };
}

export function actorBiome(scene) {
  return scene.level?.realm ?? scene.level?.theme ?? 'verdant';
}

export function configureDenseTexture(texture, fraction = ACTOR_DENSITY) {
  for (const source of texture.source) source.resolution = fraction;
  texture.setFilter(0);
}
