export function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Combine the alpha silhouette's bevel with luminance variations in the source.
export function reliefNormals(pixels, width, height) {
  const count = width * height;
  const distance = new Float32Array(count);
  const heights = new Float32Array(count);
  const normals = new Uint8ClampedArray(pixels.length);
  const depth = 5;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (!pixels[i * 4 + 3]) continue;
    let d = Math.min(depth, x + 1, y + 1, width - x, height - y);
    if (x) d = Math.min(d, distance[i - 1] + 1);
    if (y) d = Math.min(d, distance[i - width] + 1);
    if (x && y) d = Math.min(d, distance[i - width - 1] + 1.414);
    if (x + 1 < width && y) d = Math.min(d, distance[i - width + 1] + 1.414);
    distance[i] = d;
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x, j = i * 4;
    if (!distance[i]) continue;
    let d = distance[i];
    if (x + 1 < width) d = Math.min(d, distance[i + 1] + 1);
    if (y + 1 < height) d = Math.min(d, distance[i + width] + 1);
    if (x && y + 1 < height) d = Math.min(d, distance[i + width - 1] + 1.414);
    if (x + 1 < width && y + 1 < height) d = Math.min(d, distance[i + width + 1] + 1.414);
    distance[i] = d;
    heights[i] = Math.sin(Math.PI * .5 * d / depth) * 2.5 +
      (pixels[j] * .24 + pixels[j + 1] * .65 + pixels[j + 2] * .11) * .0033;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, j = i * 4;
    if (!distance[i]) continue;
    const dx = (x ? heights[i - 1] : 0) - (x + 1 < width ? heights[i + 1] : 0);
    const dy = (y ? heights[i - width] : 0) - (y + 1 < height ? heights[i + width] : 0);
    const length = Math.hypot(dx, dy, 2.1);
    normals[j] = 128 + 127 * dx / length;
    normals[j + 1] = 128 + 127 * dy / length;
    normals[j + 2] = 128 + 127 * 2.1 / length;
    normals[j + 3] = pixels[j + 3];
  }
  return normals;
}

export function swampLight(scene, x, y) {
  const lamp = scene.swamp.lamps.find(light => Math.abs(x - light.x) < 106);
  const influence = lamp ? Math.max(0, 1 - Math.hypot(lamp.x - x, lamp.y - y) / 115) : 0;
  const local = lamp ? Math.max(-1, Math.min(1, (lamp.x - x) / 39)) : 0;
  return { direction: -.58 + (local + .58) * influence, strength: .54 + influence * .39 };
}

export function createNormalLighting(scene) {
  const maps = new WeakMap(), variants = new Map();
  let serial = 0;
  function mapFor(frame) {
    if (maps.has(frame)) return maps.get(frame);
    const canvas = makeCanvas(frame.cutWidth, frame.cutHeight);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(frame.source.image, frame.canvasData.x, frame.canvasData.y, canvas.width, canvas.height,
      0, 0, canvas.width, canvas.height);
    const albedo = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const map = { id: serial++, albedo, normals: reliefNormals(albedo.data, canvas.width, canvas.height) };
    maps.set(frame, map);
    return map;
  }

  function shadeFrame(frame, light, mirrored) {
    const direction = Math.round(light.direction * (mirrored ? -5 : 5)) / 5;
    const strength = Math.round(light.strength * 6) / 6;
    const { id, albedo, normals } = mapFor(frame);
    const key = id + ':' + direction + ':' + strength;
    if (variants.has(key)) return variants.get(key);
    const canvas = makeCanvas(albedo.width, albedo.height);
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    const scale = 127 * Math.hypot(direction, .65, .72);
    const { data } = image;
    for (let i = 0; i < normals.length; i += 4) {
      if (!normals[i + 3]) continue;
      const incident = Math.max(0, ((normals[i] - 128) * direction - (normals[i + 1] - 128) * .65 +
        (normals[i + 2] - 128) * .72) / scale);
      const diffuse = .62 + incident * (.54 + strength * .38);
      const rim = Math.max(0, incident - .72) ** 2 * 68;
      data[i] = albedo.data[i] * diffuse * 1.07 + rim;
      data[i + 1] = albedo.data[i + 1] * diffuse * 1.05 + rim * .83;
      data[i + 2] = albedo.data[i + 2] * diffuse * .91 + rim * .51;
      data[i + 3] = normals[i + 3];
    }
    ctx.putImageData(image, 0, 0);
    const { cutWidth, cutHeight, customPivot, realWidth, realHeight, x, y } = frame;
    const lit = { cutWidth, cutHeight, customPivot, realWidth, realHeight, x, y,
      canvasData: { x: 0, y: 0 },
      source: { image: canvas, resolution: frame.source.resolution, scaleMode: frame.source.scaleMode },
    };
    if (variants.size >= 144) variants.delete(variants.keys().next().value);
    variants.set(key, lit);
    return lit;
  }

  return sprite => {
    sprite.renderCanvas = (renderer, source, camera, parent) => {
      const x = source.x + (source.parentContainer?.x ?? 0);
      const y = source.y + (source.parentContainer?.y ?? 0);
      if (!source.alpha || (source.scrollFactorX === 1 &&
        (x + source.displayWidth < camera.scrollX - 24 ||
          x - source.displayWidth > camera.scrollX + camera.width + 24))) return;
      camera.addToRenderList(source);
      const light = swampLight(scene, x + source.displayWidth * (.5 - source.originX), y - source.displayHeight * .5);
      const frame = source.isCropped ? source.frame : shadeFrame(source.frame, light, source.flipX);
      renderer.batchSprite(source, frame, camera, parent);
    };
  };
}
