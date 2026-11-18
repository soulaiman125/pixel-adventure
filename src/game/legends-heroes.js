import { KATANA } from './shadow-rules.js';
import { SPECIALS } from './combat-techniques.js';

const entry=(id,name,role,weapon,alternate,ultimate,bio,colors,stats,combat) =>
  ({id,name,role,weapon,alternate,ultimate,bio,colors,stats,...combat});

export const HEROES = {
  shadow:entry('shadow','Shadow Ninja','Balanced speed','Katana','Dual Katana','Shadow Execution',
    'Kaito follows the shadow left by his missing teacher.',
    ['#242739','#333d57','#556785','#8997aa','#bd3654','#ff8b86'],[4,3,3,3],
    {speed:132,sprint:176,dash:252,damage:[10,12,20],timing:1,reach:0,shot:[245,630,8,0],radius:30,control:0,
      abilities:['Katana Rush','Charged Slash','Shuriken','Shadow Dash','Blade Cyclone']}),
  flame:entry('flame','Flame Samurai','Heavy damage','Flame Katana','Heavy Greatsword','Inferno Judgment',
    'Akari guards a forge whose fires have burned since the first eclipse.',
    ['#371c2b','#883942','#d96a3b','#ffce78','#7d2333','#ffe1a4'],[2,5,4,2],
    {speed:129,sprint:168,dash:247,damage:[15,18,27],timing:1.23,reach:3,shot:[195,505,15,0],radius:35,control:180,
      abilities:['Heavy Katana Combo','Flame Cleave','Fire Wave','Flame Dash','Flame Burst']}),
  frost:entry('frost','Frost Assassin','Technical mobility','Twin Daggers','Ice Chakrams','Frozen Mirage',
    'Yuki tracks the spirits that crossed a frozen pass without leaving footprints.',
    ['#1b294a','#345886','#5ca7cd','#c8fbff','#315c93','#9be8fe'],[5,2,2,3],
    {speed:141,sprint:187,dash:267,damage:[7,9,14],timing:.78,reach:-2,shot:[270,620,7,1],radius:30,control:620,
      abilities:['Rapid Dagger Combo','Rime Sweep','Frost Blades','Ice Dash','Freeze Trap']}),
  thunder:entry('thunder','Thunder Ronin','Area control','Lightning Spear','Thunder Staff','Thunderfall',
    'Raiden follows the storms that stopped obeying the old mountain shrine.',
    ['#252331','#5f503a','#b99245','#ffef9d','#69533a','#fbca59'],[3,4,4,4],
    {speed:134,sprint:174,dash:252,damage:[11,14,21],timing:1.10,reach:13,shot:[288,600,10,1],radius:41,control:290,
      field:true,abilities:['Spear Combo','Charged Thrust','Lightning Spear','Thunder Dash','Shock Field']}),
  ranger:entry('ranger','Forest Ranger','Ranged precision','Bow','Twin Crossbows','Nature’s Wrath',
    'Mori has seen the trees turn toward a light no one else can see.',
    ['#23392d','#39724e','#72a866','#e0e9a1','#47784d','#a2ee8c'],[4,3,2,5],
    {speed:137,sprint:180,dash:258,damage:[8,10,15],timing:1.01,reach:8,shot:[310,760,9,0],radius:42,control:430,
      field:true,bow:true,abilities:['Rapid Arrow','Piercing Arrow','Vine Shot','Evasive Roll','Arrow Rain']}),
};

// Six single-purchase nodes in each branch, with the previous node as prerequisite.
const perks = {
  combat:[['edge','Weapon Edge','Primary hit damage',2],['reach','Weapon Reach','Primary reach or arrow life',3],
    ['windup','Quick Draw','Attack startup in milliseconds',-12],['recovery','Ready Stance','Attack recovery in milliseconds',-22],
    ['projectile','Keen Shot','Projectile speed',22],['stagger','Unsteady Guard','Hit stagger in milliseconds',75]],
  mobility:[['accel','Sure Foot','Ground acceleration',95],['sprint','Stride','Sprint speed',7],
    ['dash','Evasion','Dash speed',11],['dashWait','Recover Footing','Dash cooldown in milliseconds',-85],
    ['coyote','Ledge Step','Coyote time in milliseconds',16],['buffer','Prepared Jump','Jump buffer in milliseconds',26]],
  special:[['power','Force','Special hit damage',3],['radius','Field Control','Special radius',6],
    ['reachSpecial','Focus','Ultimate acquisition range',11],['chargeWait','Breathe','Charge cooldown in milliseconds',-200],
    ['specialWait','Repeat Technique','Special cooldown in milliseconds',-320],['ultimateWait','Final Form','Ultimate cooldown in milliseconds',-650]],
};
export const HERO_UPGRADES=Object.fromEntries(Object.values(HEROES).filter(hero=>hero.id!=='shadow').map((hero,slot)=>[
  hero.id,Object.fromEntries(Object.entries(perks).map(([branch,nodes])=>[
    branch,nodes.map(([id,name,label,amount],index)=>{
      const value=amount+(id==='edge'?Number(hero.id==='flame'):id==='radius'?slot:0);
      return {id, name, detail:label+' '+(value>0?'+':'')+value, amount:value, cost:index<2?1:index<4?2:3, previous:nodes[index-1]?.[0]};
    }),
  ])),
]));

export function heroKit(id='shadow', weapon='standard', purchases=[], honing=0) {
  const hero=HEROES[id] ?? HEROES.shadow;
  const bonus=Object.fromEntries(Object.values(HERO_UPGRADES[hero.id] ?? {}).flat()
    .filter(node=>purchases.includes(node.id)).map(node=>[node.id,node.amount]));
  const alternate=weapon==='alternate';
  const heavy=hero.id==='flame' && alternate;
  const alternateReach=alternate ? (heavy?9:hero.id==='thunder'? -4:hero.id==='frost'?7:4) : 0;
  const combo=KATANA.map((rule,index)=>{
    const pace=hero.timing*(alternate ? heavy?1.10:hero.id==='ranger'?.92:1.08 : 1);
    const open=Math.max(30,Math.round(rule.open*pace)+(bonus.windup??0));
    const close=Math.round(rule.close*pace);
    const duration=Math.max(close+24,Math.round(rule.duration*pace)+(bonus.recovery??0));
    const buffer=Math.min(duration-15,Math.round(rule.buffer*pace));
    return {...rule, open,close,duration,buffer,w:rule.w+hero.reach+alternateReach+(bonus.reach??0)+honing,
      damage:hero.damage[index]+(heavy?4:alternate&&index===2?-2:0)+(bonus.edge??0)+honing};
  });
  return {...hero,alternate,bonus,combo,bow:hero.bow || hero.id==='frost'&&alternate,
    speed:hero.speed,sprint:hero.sprint+(bonus.sprint??0),dash:hero.dash+(bonus.dash??0),
    playWeapon:alternate?hero.alternate:hero.weapon,
    brakes: hero.id==='flame'?1040:hero.id==='frost'?1410:1250,
    guard:hero.id==='flame'?22:hero.id==='thunder'?16:hero.id==='ranger'?-9:0,
    stagger:bonus.stagger??0,
    specials:hero.id==='shadow'?SPECIALS:{
      charged:SPECIALS.charged,
      cyclone:{duration: hero.id==='frost'?585:hero.id==='ranger'?645:525,
        windows:hero.id==='ranger'?[[145,194,7],[255,311,7],[408,461,12]]:hero.id==='frost'?[[124,212,8],[324,405,9]]:[[135,210,hero.id==='flame'?18:13],[281,350,hero.id==='flame'?12:13]]},
      execution:{duration:hero.id==='flame'?735:hero.id==='thunder'?690:640,
        windows:hero.id==='thunder'?[[360,432,28]]:hero.id==='ranger'?[[210,250,6],[320,370,7],[455,510,19]]:
          hero.id==='flame'?[[180,225,8],[310,350,9],[470,530,27]]:[[157,200,6],[242,286,6],[353,421,18]]},
    },
  };
}

export const DEFAULT_HERO = heroKit();
