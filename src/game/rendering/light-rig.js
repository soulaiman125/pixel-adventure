import { createNormalLighting } from './lighting.js';
import { createProjectedShadows } from './projected-shadows.js';
import { GROUND_Y } from '../level-one.js';
import { actorBiome, biomeLight } from './actor-art.js';

const eastLight = new Set(['castle','canyon','eclipse','fire','neon']);

export function createLightRig(scene) {
  const biome=actorBiome(scene), swamp=scene.swamp, options=swamp?.options;
  const key = eastLight.has(biome) ? .55 : -.58;
  const lamps = swamp?.lamps ?? scene.level.ground.map(([left,right])=>
    ({x:left+Math.min(105,(right-left)*.48),y:GROUND_Y-33}));
  const rig = { key, lamps, color:biomeLight[biome] ?? biomeLight.verdant };
  if (options?.normals!==false) rig.light=createNormalLighting(scene,rig);
  if (options?.shadows!==false) rig.cast=createProjectedShadows(scene,rig);
  if (swamp) Object.assign(swamp,{light:rig.light,cast:rig.cast});
  return rig;
}

export function lightProp(scene,sprite,shadow='moving') {
  scene.lightRig?.light?.(sprite);
  if (shadow) scene.lightRig?.cast?.(sprite,false,shadow==='fixed');
  return sprite;
}
