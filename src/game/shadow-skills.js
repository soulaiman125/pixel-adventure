export const SKILLS = {
  katana: ['Katana Rush', '刀', ['Queue the next cut 38 ms earlier.', 'The charged wave travels farther and reaches higher.', 'Heavy cut deals 24 damage.']],
  shuriken: ['Shuriken', '✦', ['Recover charges every 1.7 seconds.', 'A star can pierce one unguarded enemy.', 'Spend three full charges to throw three stars at different heights.']],
  dash: ['Shadow Dash', '»', ['Ground dash recovers 85 ms sooner.', 'Reverse once during a dash to brake and turn. This uses the same dash.', 'A close dodge readies a free counter cut.']],
  sprint: ['Shadow Sprint', '⇢', ['Reach sprint speed quicker.', 'Brake and change direction faster while sprinting.', 'The first cut from a sprint reaches farther.']],
  cyclone: ['Blade Cyclone', '⟳', ['Increase the spin radius by six pixels.', 'Cyclone costs 24 Energy.', 'The closing arc deals four more damage.']],
  execution: ['Shadow Execution', '◇', ['The final strike deals six more damage.', 'Acquire targets 12 pixels farther away.', 'A confirmed final strike refunds ten Energy.']],
};
const COSTS = [1,2,3];
const KEY = 'pixel-adventure.shadow-skills';

export function createShadowSkills(storage) {
  let data = { version:1, tiers:{}, milestones:[] };
  try {
    const saved = JSON.parse(storage.getItem(KEY));
    if (saved?.version === 1) {
      data.milestones = Array.isArray(saved.milestones) ? [...new Set(saved.milestones.filter(id=>typeof id==='string'))] : [];
      for (const id of Object.keys(SKILLS)) {
        if (Number.isInteger(saved.tiers?.[id])) data.tiers[id] = Math.min(3,Math.max(0,saved.tiers[id]));
      }
    }
  } catch { /* Storage may be unavailable in a private window. */ }
  const save = () => { try { storage.setItem(KEY,JSON.stringify(data)); } catch { /* Keep the session usable. */ } };
  const tier = id => data.tiers[id] ?? 0;
  const points = () => data.milestones.length - Object.keys(SKILLS).reduce((used,id)=>used+COSTS.slice(0,tier(id)).reduce((sum,price)=>sum+price,0),0);
  return {
    tier, points, cost: id => COSTS[tier(id)],
    award(id) {
      if (!data.milestones.includes(id)) { data.milestones.push(id); save(); }
    },
    buy(id) {
      if (!Object.hasOwn(SKILLS,id) || tier(id)===3 || points()<COSTS[tier(id)]) return false;
      data.tiers[id]=tier(id)+1;
      save();
      return true;
    },
    reset() { data.tiers={}; save(); },
  };
}
