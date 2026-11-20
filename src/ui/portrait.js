import { loadHeroPortrait, detailedShadowClips } from '../game/shadow-art.js';

export function showPortrait(canvas, textures, hero, cosmetic, { active = () => true, motion = () => false, animated = true } = {}) {
  const texture = textures.get(loadHeroPortrait({ textures }, hero, cosmetic));
  const source = texture.getSourceImage();
  const density = texture.source[0].resolution;
  canvas.width = 112*density;
  canvas.height = 80*density;
  const ctx = canvas.getContext('2d');
  const start = performance.now();
  let request;
  let last = -1;
  function draw(time) {
    if (!active()) return;
    const index = animated && motion() ? Math.floor(Math.max(0, time - start) / 93) % detailedShadowClips.idle : 0;
    if (index !== last) {
      last = index;
      const frame = texture.get('idle' + index);
      const { cutX,cutY,cutWidth,cutHeight } = frame;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(source,cutX,cutY,cutWidth,cutHeight,0,0,canvas.width,canvas.height);
    }
    if (animated) request = requestAnimationFrame(draw);
  }
  draw(start);
  return () => cancelAnimationFrame(request);
}
