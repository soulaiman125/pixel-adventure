const caches=new WeakMap();
const MAX_ATLAS_BYTES=48*1024*1024;

export function rememberVisualTexture(scene,key) {
  if(!scene.level)return;
  const textures=scene.textures;
  let cache=caches.get(textures);
  if(!cache){ cache=new Map(); caches.set(textures,cache); }
  const texture = textures.get(key);
  const {width,height} = texture.source[0];
  // Painted rasters have a separate cache. Account for the retained frame metadata here.
  const bytes = texture.paintedClips ? texture.frameTotal * 1024 : width * height * 4;
  cache.delete(key);
  cache.set(key,bytes);
}

export function pruneVisualTextures(scene) {
  const textures=scene.textures, cache=caches.get(textures);
  if(!cache)return;
  const used=new Set();
  function mark(objects) {
    for(const object of objects){
      if(object.texture)used.add(object.texture.key);
      if(object.type==='Container')mark(object.list);
    }
  }
  mark(scene.children.list);
  let total=0;
  for(const [key,bytes] of cache){
    if(textures.exists(key))total+=bytes;
    else cache.delete(key);
  }
  for(const [key,bytes] of cache){
    if(total<=MAX_ATLAS_BYTES)break;
    if(used.has(key))continue;
    textures.remove(key);
    cache.delete(key);
    total-=bytes;
  }
}
