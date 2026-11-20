import { configureDenseTexture } from './actor-art.js';
import { makeCanvas } from './lighting.js';
import { paintedSpriteTier } from './painted-parts.js';
import { rememberVisualTexture } from './texture-budget.js';
const caches = new WeakMap();

export function expandedClips(counts,loops,subframes=3){
  return Object.fromEntries(Object.entries(counts).map(([clip,count])=>
    [clip,count===1?1:count*subframes-(loops.has(clip)?0:subframes-1)]));
}

function reserveFrame(cache, source, footprint, create) {
  // Phaser keeps the named frame and animation timing, while we bake only poses
  // actually rendered and share a raster budget across characters and biomes.
  Object.defineProperty(source, 'image', {
    get() {
      const saved = cache.frames.get(source);
      if (saved) {
        cache.frames.delete(source);
        cache.frames.set(source, saved);
        return saved.canvas;
      }
      while (cache.frames.size && cache.bytes + footprint > cache.maxBytes) {
        const oldest = cache.frames.keys().next().value;
        cache.bytes -= cache.frames.get(oldest).footprint;
        cache.frames.delete(oldest);
      }
      const canvas = create();
      cache.frames.set(source, { canvas, footprint });
      cache.bytes += footprint;
      return canvas;
    },
    set() {
      const saved = cache.frames.get(source);
      if (saved) {
        cache.bytes -= saved.footprint;
        cache.frames.delete(source);
      }
    },
  });
}

export function paintedAtlas(scene,key,width,height,clips,paint) {
  const textures = scene.textures;
  let texture;
  if (textures.exists(key)) {
    texture = textures.get(key);
  } else {
    const frames = Object.entries(clips).flatMap(([clip,count]) =>
      Array.from({length:count}, (_,n) => [clip,n,count]));
    const { density, canvasBudget } = paintedSpriteTier(textures);
    const pixelWidth = width * density;
    const pixelHeight = height * density;
    const footprint = pixelWidth * pixelHeight * 4;
    const palette = { textures, level: scene.level };
    // The Canvas renderer consumes each source directly. The placeholder
    // provides its dimensions until the first access to its raster.
    const placeholder = new Image(pixelWidth, pixelHeight);
    texture = textures.create(key, frames.map(() => placeholder));
    configureDenseTexture(texture, density);
    texture.add('__BASE', 0, 0, 0, pixelWidth, pixelHeight);
    let cache = caches.get(textures);
    if (!cache) {
      cache = { frames: new Map(), bytes: 0, maxBytes: canvasBudget };
      caches.set(textures, cache);
    }
    for (const [index, [clip, n, count]] of frames.entries()) {
      const source = texture.source[index];
      reserveFrame(cache, source, footprint, () => {
        const canvas = makeCanvas(pixelWidth, pixelHeight);
        const ctx = canvas.getContext('2d');
        ctx.scale(density, density);
        ctx.imageSmoothingQuality = 'high';
        paint(ctx, 0, 0, clip, n, count, palette);
        return canvas;
      });
      texture.add(clip + n, index, 0, 0, pixelWidth, pixelHeight).setTrim(width,height,0,0,width,height);
    }
    texture.paintedClips = clips;
  }
  rememberVisualTexture(scene,key);
  return texture;
}
