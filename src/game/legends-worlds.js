import { trap } from './level-scripts.js';

export const REALMS = [
  { id:'bamboo', name:'Haunted Bamboo Forest', theme:'jungle', colors:['#13192e','#313851','#657f79','#b5ffe4'],
    story:'Lanterns carry the names of those who vanished. Follow the lights that still cast a shadow.',
    boss:['phantom','Phantom Samurai',6], enemies:['spectral','lantern','phantomArcher'] },
  { id:'sunken', name:'Sunken Temple', theme:'crystal', colors:['#112d48','#225779','#47a4aa','#b4f9dc'],
    story:'The temple bells ring below the surface. Follow the currents to the chamber that still holds air.',
    boss:['abyss','Abyss Guardian',6], enemies:['coral','abyssStalker','tideCaster'] },
  { id:'sky', name:'Sky Islands', theme:'canyon', colors:['#39436c','#7f80ae','#edb28b','#fdf3c0'],
    story:'The storm cracked the bridge between islands. Watch the streamers before stepping into a gust.',
    boss:['dragon','Storm Dragon',6], enemies:['harpy','skySentinel','stormWisp'] },
  { id:'neon', name:'Neon City', theme:'thunder', colors:['#15162f','#342657','#9b4bad','#76ffee'],
    story:'The city sent its last distress call in a loop. Time your crossing between the patrol lights.',
    boss:['cyber','Cyber Shogun',6], enemies:['securityDrone','cyberNinja','shieldRobot'] },
  { id:'eclipse', name:'Eclipse Realm', theme:'castle', colors:['#180f23','#4d183a','#ad4268','#ffb28b'],
    story:'The Emperor has fastened the twelve realms to his eclipse. Break the seal before the shadow reaches the village.',
    boss:['emperor','Eclipse Emperor',9], enemies:['shadowKnight','voidHunter','eclipseWraith'] },
];

// Entries specify the name, island widths, authored crossings, and encounters.
// Crossings use [gap, ledge type, height] and optional secondary ledges.
const courses = [
  [
    ['Lantern Crossing',[244,229,236],[[91,'vanish',154],[84,'fixed',148]],['barrier']],
    ['Whispering Stalks',[236,206,250],[[92,'fixed',147],[103,'vanish',149]],['ghost','barrier']],
    ['The Missing Path',[253,214,191,198],[[107,'vanish',151],[91,'fixed',146],[97,'crumble',154]],['barrier','ghost']],
    ['Watch of the Departed',[257,310,202],[[97,'fixed',149],[98,'vanish',153]],['duel','ghost','barrier']],
    ['Veil of Lanterns',[221,249,241,224],[[101,'vanish',152],[96,'fixed',147],[103,'moving',152]],['ghost','barrier','duel']],
    ['Phantom Gate',[231,215,376],[[104,'vanish',152],[98,'fixed',148]],['ghost','barrier']],
  ],
  [
    ['Tidewater Steps',[201,235,241],[[81,'fixed',151],[95,'moving',153]],['water']],
    ['Coral Galleries',[262,201,216],[[103,'moving',148],[83,'fixed',153]],['water','duel']],
    ['The Bell Divers',[243,196,208,198],[[92,'fixed',148],[102,'moving',152],[93,'crumble',153]],['water','tide','water']],
    ['The Flooded Court',[201,326,205],[[88,'moving',154],[101,'fixed',146]],['duel','water','tide']],
    ['Siphon Chambers',[240,224,211,213],[[98,'fixed',151],[104,'moving',151],[98,'vanish',151]],['water','tide','duel']],
    ['Abyssal Throne',[237,232,385],[[99,'moving',153],[96,'fixed',147]],['water','duel']],
  ],
  [
    ['Windward Arrival',[248,217,223],[[98,'moving',151],[91,'fixed',153]],['wind']],
    ['Kitekeeper Ruins',[215,245,236],[[92,'fixed',150],[106,'moving',153]],['wind','duel']],
    ['Broken Aerie',[218,222,199,214],[[106,'moving',153],[101,'crumble',155],[108,'moving',155]],['wind','wind','duel']],
    ['Cloudbridge Outpost',[230,315,201],[[99,'fixed',150],[104,'moving',151]],['duel','wind','duel']],
    ['The Updraft Stair',[211,202,229,249],[[106,'moving',152],[98,'fixed',149],[107,'crumble',154]],['wind','wind','thunder']],
    ['Eye of the Tempest',[244,233,382],[[106,'moving',152],[99,'fixed',148]],['wind','thunder']],
  ],
  [
    ['Signal Rooftops',[224,216,246],[[90,'fixed',149],[95,'moving',154]],['laser']],
    ['Drone Array',[241,228,237],[[97,'moving',151],[100,'fixed',149]],['duel','laser']],
    ['Relay Tower Climb',[221,201,209,230],[[103,'fixed',148],[97,'moving',153],[106,'crumble',154]],['laser','thunder','laser']],
    ['Security Foundry',[262,293,193],[[98,'fixed',151],[101,'moving',152]],['duel','thunder','duel']],
    ['Blackout Circuit',[204,249,219,232],[[106,'moving',153],[104,'vanish',152],[97,'fixed',146]],['laser','thunder','laser']],
    ['Citadel of Circuits',[238,262,387],[[102,'crumble',153],[105,'moving',154]],['laser','duel']],
  ],
  [
    ['The Crimson Divide',[225,229,249],[[98,'vanish',152],[102,'crumble',152]],['barrier','duel']],
    ['Mirror of Dusk',[220,225,238],[[107,'moving',153],[102,'vanish',151]],['water','thunder']],
    ['Throne Road',[211,226,217,230],[[105,'crumble',155],[104,'moving',151],[99,'vanish',153]],['wind','laser','duel']],
    ['March of the Hollow',[226,297,207],[[102,'fixed',148],[111,'vanish',154]],['duel','duel','thunder']],
    ['The Last Shadow',[216,235,231,252],[[109,'moving',154],[108,'crumble',155],[104,'vanish',151]],['barrier','wind','laser']],
    ['Eclipse Ascension',[239,243,426],[[104,'vanish',154],[111,'fixed',151]],['duel','thunder']],
  ],
];

function stage(realm, blueprint, phase) {
  const [name, spans, crossings, encounters] = blueprint;
  const ground = [], platforms = [], coins = [], enemies = [], hazards = [], trees = [];
  const air = [], water = [], routes = [];
  let next = 0;
  let battle;
  for (const [i,length] of spans.entries()) {
    const left = next, right = left + length;
    ground.push([left,right]);
    const bossGround = phase === 5 && i === spans.length - 1;
    const shelf = left + (i ? 69 : 94);
    const shelfY = i % 2 ? 148 : 151;
    if (!bossGround) {
      platforms.push([shelf,shelfY,46 + phase % 3 * 4]);
      coins.push([shelf+15,shelfY-16],[shelf+34,shelfY-16]);
    }
    coins.push([left+51,169],[right-41,170]);
    trees.push([left+25,.65],[right-35,.44]);
    const event = encounters[i];
    if (!bossGround && event) {
      const x = left + (i ? 128 : 152);
      const enemy = realm.enemies[(phase+i)%3];
      if (['duel','ghost'].includes(event) || phase >= 1) enemies.push([x,Math.min(42,right-x-30),32+phase*3,enemy]);
      if (event === 'duel' && length > 275) enemies.push([right-73,33,31,realm.enemies[(phase+i+1)%3],phase===3]);
      if (event === 'water' || event === 'tide') water.push([left+32,right-29,event === 'water' ? 68 : -55,i % 2 ? 147 : 160]);
      if (event === 'wind') air.push([left+62,right+22,(i+phase)%2 ? -38 : 65]);
      if (event === 'barrier' || event === 'laser' || event === 'thunder' || event === 'tide') {
        const kind = {barrier:'laser',laser:'laserGrid',thunder:'electricFloor',tide:'electricPulse'}[event];
        const y = kind === 'electricFloor' ? 180 : 169;
        hazards.push(trap(kind,left+110,y,kind==='laser'?8:30,kind==='electricFloor'?9:34,
          {spacing:10,warning:1000,active:520+phase*18,period:3100,offset:phase*220+i*510}));
      }
    }
    if (i === spans.length-1 && phase === 5) {
      const [kind,title,hp] = realm.boss;
      battle = {kind,name:title,hp,x:right-120,start:left+101};
    }
    if (!crossings[i]) continue;
    const [gap,kind,y] = crossings[i];
    const x = right + (gap < 95 ? 23 : 28);
    platforms.push(kind==='fixed' ? [x,y,48] : [x,y,48,kind,kind==='moving'?8:0,kind==='moving'?4:0,3150+phase*111]);
    coins.push([x+23,y-16]);
    routes.push([x]);
    next = right+gap;
  }
  const width = ground.at(-1)[1];
  const secret = phase === 2 || phase === 4 ? {
    id:realm.id+'-'+phase, clue:'A violet marker points to the ledges behind the entrance.',
    x:27,y:92,ledges:[[13,148,28],[13,109,28]],wall:[0,99,12,85],
  } : undefined;
  return {name,realm:realm.id,theme:realm.theme,width,spawnX:58,flagX:width-37,ground,platforms,coins,enemies,hazards,trees,
    boss:battle,script:{air},water,routes,secret,story:phase===0?realm.story:phase===5?realm.boss[1]+' guards the seal. Watch for an opening after each attack.':undefined};
}

export const LEGEND_LEVELS = REALMS.flatMap((realm,index)=>courses[index].map((course,phase)=>stage(realm,course,phase)));
