import { loadHeroPortrait, shadowClips } from '../game/shadow-art.js';

export function showPortrait(canvas, textures, hero, cosmetic, { active = () => true, motion = () => false, animated = true } = {}) {
  const texture = textures.get(loadHeroPortrait({ textures }, hero, cosmetic));
  const source = texture.getSourceImage();
  const ctx = canvas.getContext('2d');
  const start = performance.now();
  let request;
  let last = -1;
  function draw(time) {
    if (!active()) return;
    const index = animated && motion() ? Math.floor(Math.max(0, time - start) / 186) % shadowClips.idle : 0;
    if (index !== last) {
      last = index;
      const frame = texture.get('idle' + index);
      ctx.clearRect(0, 0, 112, 80);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, frame.cutX, frame.cutY, 112, 80, 0, 0, 112, 80);
    }
    if (animated) request = requestAnimationFrame(draw);
  }
  draw(start);
  return () => cancelAnimationFrame(request);
}
