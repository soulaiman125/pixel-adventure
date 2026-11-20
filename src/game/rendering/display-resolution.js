const MAX_DENSITY = 4;
const MAX_PIXELS = 1_500_000;
const TOUCH_MAX_PIXELS = 950_000;

export function installDisplayResolution(game, mount) {
  const { canvas, context, scale } = game;
  const setTransform = context.setTransform.bind(context);
  const pixelBudget = matchMedia('(pointer: coarse)').matches ? TOUCH_MAX_PIXELS : MAX_PIXELS;
  let density = 1;
  let limit = MAX_DENSITY;

  // Phaser's camera, input and render coordinates stay in logical pixels.
  // Apply the backing-store scale only to the visible Canvas context.
  context.setTransform = (a = 1, b = 0, c = 0, d = 1, x = 0, y = 0) => {
    if (typeof a === 'object') ({ a, b, c, d, e: x, f: y } = DOMMatrix.fromMatrix(a));
    setTransform(a * density, b * density, c * density, d * density, x * density, y * density);
  };
  context.resetTransform = () => context.setTransform();

  function sync() {
    if (!mount.clientWidth || !mount.clientHeight) return;
    const requested = Math.max(mount.clientWidth / scale.width, mount.clientHeight / scale.height)
      * window.devicePixelRatio;
    const maximum = Math.sqrt(pixelBudget / (scale.width * scale.height));
    density = Math.max(1, Math.min(limit, maximum, Math.ceil(requested)));
    const width = Math.round(scale.width * density);
    const height = Math.round(scale.height * density);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Sustained missed frames lower output density during play. Require more
  // headroom to restore it so borderline devices don't switch back and forth.
  let lastTime = 0;
  let elapsed = 0;
  let samples = 0;
  let stable = 0;
  game.events.on('prestep', time => {
    const interval = time - lastTime;
    lastTime = time;
    if (interval <= 0 || interval > 250) return;
    elapsed += interval;
    samples += 1;
    if (elapsed < 700) return;
    const average = elapsed / samples;
    elapsed = 0;
    samples = 0;
    if (!mount.clientHeight) {
      stable = 0;
      return;
    }
    if (average > 25 && density > 1) {
      limit = average > 36 || density <= 2 ? 1 : 2;
      stable = 0;
      sync();
    } else if (average < 18 && limit < MAX_DENSITY) {
      stable += 1;
      if (stable >= 6) {
        limit += 1;
        stable = 0;
        sync();
      }
    } else {
      stable = 0;
    }
  });

  sync();
  return sync;
}
