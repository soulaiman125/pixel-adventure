import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS } from '../src/game/levels.js';
import { LEGEND_LEVELS, REALMS } from '../src/game/legends-worlds.js';
import { LEGEND_BOSSES } from '../src/game/legends-bosses.js';
import { HEROES, HERO_UPGRADES, heroKit } from '../src/game/legends-heroes.js';
import { createLegendsProgress, dailyFor, LEGENDS_KEY } from '../src/game/legends-progress.js';
import { phaseHealthFloor, resetExpansionBoss, updateExpansionBoss } from '../src/game/expansion-bosses.js';
import { createProgress } from '../src/game/progress.js';
import { SKILLS } from '../src/game/shadow-skills.js';
import { createChallengeRecords } from '../src/game/challenges.js';
import { ultimateLevel } from '../src/game/ultimate-levels.js';

function disk(initial={}){
  const data=new Map(Object.entries(initial));
  return {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
}

test('five new realms have six distinct routes with new bosses and a reachable ledge chain for each movement profile',()=>{
  assert.equal(LEGEND_LEVELS.length,30);
  for(const realm of REALMS){
    const stages=LEGEND_LEVELS.filter(level=>level.realm===realm.id);
    assert.equal(stages.length,6);
    assert.equal(new Set(stages.map(stage=>JSON.stringify(stage.ground))).size,6);
    assert.equal(stages.at(-1).boss.kind,realm.boss[0]);
  }
  for(const raw of LEGEND_LEVELS.filter(level=>level.secret)){
    const stage=ultimateLevel(raw,LEVELS.indexOf(raw));
    assert.deepEqual(stage.platforms.slice(-2),raw.secret.ledges);
    assert.deepEqual(stage.solidWalls.at(-1),raw.secret.wall);
  }
  for(const hero of Object.values(HEROES)){
    for(const stage of LEVELS){
      for(let i=1;i<stage.ground.length;i++){
        const lip=stage.ground[i-1][1],landing=stage.ground[i][0];
        const bridges=stage.platforms.map(([x,y,w,kind,offset=0])=>[x-(kind==='moving'?offset:0),y,x+w+(kind==='moving'?offset:0)])
          .filter(([left,,right])=>right>lip&&left<landing);
        const route=[[lip,184,lip],...bridges,[landing,184,landing]];
        const reachable=[0];
        for(let j=1;j<route.length;j++){
          const [x,y]=route[j];
          if(reachable.some(k=>{
            const [,from,end]=route[k], discriminant=263**2+1400*(y-from);
            return discriminant>=0&&x-end<(263+Math.sqrt(discriminant))/700*hero.speed;
          }))reachable.push(j);
        }
        assert(reachable.includes(route.length-1),hero.id+' '+stage.name+' gap '+i);
      }
    }
  }
});

test('each hero has different combat and alternate weapon stats, and all 90 upgrade slots exist',()=>{
  const defaults=Object.keys(HEROES).map(id=>heroKit(id));
  assert.equal(new Set(defaults.map(hero=>hero.combo[0].damage)).size,5);
  assert.equal(defaults.filter(hero=>hero.bow).length,1);
  assert.equal(defaults.filter(hero=>hero.field).length,2);
  for(const hero of defaults){
    const alternate=heroKit(hero.id,'alternate');
    assert.notEqual(hero.playWeapon,alternate.playWeapon);
    assert.notDeepEqual(hero.combo,alternate.combo);
    assert(hero.combo.every(spec=>spec.open<spec.close&&spec.close<spec.duration));
  }
  const shadowCount=Object.values(SKILLS).reduce((n,[,,perks])=>n+perks.length,0);
  assert.equal(shadowCount,18);
  let total=shadowCount;
  for(const [id,branches] of Object.entries(HERO_UPGRADES)){
    assert.deepEqual(Object.values(branches).map(nodes=>nodes.length),[6,6,6]);
    for(const node of Object.values(branches).flat()){
      total++;
      const result=heroKit(id,'standard',[node.id]);
      assert.equal(result.bonus[node.id],node.amount,node.id);
    }
  }
  assert.equal(total,90);
});

test('v2/v3 campaign records are migration inputs and an existing finale unlocks the new realm only',()=>{
  const storage=disk({'pixel-adventure.progress':JSON.stringify({version:2,unlocked:30,
    records:Array.from({length:30},(_,i)=>i===29?{coins:6,elapsed:21000}:null)}),
    'pixel-adventure.shadow-skills':'{"version":2,"tiers":{"dash":2},"milestones":["a","b","c"]}'});
  const progress=createProgress(LEVELS,storage);
  const expansion=createLegendsProgress(storage,{levels:LEVELS,record:index=>progress.record(index)});
  assert(progress.canPlay(30));
  assert(!progress.canPlay(31));
  assert.equal(expansion.coins,6);
  assert(expansion.select('ranger'));
  assert.equal(JSON.parse(storage.getItem(LEGENDS_KEY)).selected,'ranger');
  assert.equal(JSON.parse(storage.getItem('pixel-adventure.shadow-skills')).tiers.dash,2);
  assert.equal(JSON.parse(storage.getItem('pixel-adventure.progress')).unlocked,30);
  assert.equal(createLegendsProgress(storage,{levels:LEVELS,record:index=>progress.record(index)}).coins,6);
});

test('economy pays coin improvements, mastery and quests once and persists equipment and skill purchases',()=>{
  const storage=disk(),settings={levels:LEVELS,record:()=>null};
  const expansion=createLegendsProgress(storage,settings);
  const tally={hits:5};
  for(let i=0;i<9;i++)expansion.campaign('flame',i,5,12000,tally,false);
  const xp=expansion.profile('flame').xp;
  assert.equal(expansion.coins,45);
  expansion.campaign('flame',0,5,10000,tally,false);
  assert.equal(expansion.coins,45);
  assert.equal(expansion.profile('flame').xp,xp);
  assert(!expansion.purchase('flame','radius'));
  assert(expansion.purchase('flame','power'));
  assert(expansion.purchase('flame','radius'));
  assert(!expansion.purchase('flame','radius'));
  assert(expansion.weapon('flame','alternate'));
  assert(expansion.hone('flame'));
  assert(expansion.visitSecret('flame','bamboo-2'));
  assert(!expansion.visitSecret('flame','bamboo-2'));
  assert(expansion.claim('flame','blade'));
  assert(!expansion.claim('flame','blade'));
  assert(expansion.cosmetic('flame','silver'));
  const restored=createLegendsProgress(storage,settings);
  assert.equal(restored.kit('flame').playWeapon,'Heavy Greatsword');
  assert.equal(restored.profile('flame').honing,1);
  assert.equal(restored.profile('flame').cosmetic,'silver');
  assert.deepEqual(restored.profile('flame').upgrades,['power','radius']);
  assert.equal(restored.kit('flame',true).playWeapon,'Flame Katana');
});

test('daily rewards, rematch records and New Game+ cycles persist separately',()=>{
  const storage=disk(),settings={levels:LEVELS,record:()=>({coins:0})};
  const expansion=createLegendsProgress(storage,settings);
  const challenge=dailyFor(new Date(2027,5,2,17));
  assert.deepEqual(challenge,dailyFor(new Date(2027,5,2,1)));
  const complete={damage:0,deaths:0,elapsed:10000,highChain:20,wave:6};
  assert(expansion.finishDaily('shadow',challenge,complete));
  assert(!expansion.finishDaily('flame',challenge,complete));
  assert.equal(expansion.rematch('ranger',59,'master',7000),7000);
  assert.equal(expansion.rematch('ranger',59,'master',9000),7000);
  assert(expansion.beginCycle());
  for(let i=0;i<60;i++)assert(expansion.finishCycle('ranger',i,5000));
  const restored=createLegendsProgress(storage,settings);
  assert(restored.dailyDone(challenge.day));
  assert.equal(restored.ng.frontier,61);
  assert(restored.beginCycle());
  assert.equal(restored.ng.cycle,2);
  assert.equal(restored.ng.frontier,1);
  assert.equal(restored.ng.records['1-0'],5000);
});

test('corrupted expansion data leaves campaign records intact and expanded challenge records round-trip',()=>{
  const source=JSON.stringify({version:2,unlocked:3,records:[{coins:4,elapsed:43000}]});
  const storage=disk({'pixel-adventure.progress':source,[LEGENDS_KEY]:'{incomplete'});
  const campaign=createProgress(LEVELS,storage);
  const settings={levels:LEVELS,record:campaign.record};
  assert.equal(createLegendsProgress(storage,settings).coins,4);
  storage.setItem(LEGENDS_KEY,JSON.stringify({version:4,selected:'missing',heroes:{flame:{xp:170,upgrades:['edge','invalid'],weapon:'alternate'}}}));
  const partial=createLegendsProgress(storage,settings);
  assert.equal(partial.selected,'shadow');
  assert.deepEqual(partial.profile('flame').upgrades,['edge']);
  assert.equal(partial.kit('flame').playWeapon,'Flame Katana');
  assert.equal(storage.getItem('pixel-adventure.progress'),source);
  assert(createChallengeRecords(storage).record('trial',59,10034,0));
  assert.equal(createChallengeRecords(storage).get('trial',59).time,10034);
});

test('the five new guardians expose three distinct phased warning patterns and recover after attacks',()=>{
  const art=new Proxy({}, {get:()=>()=>art});
  const scene={elapsed:0,player:{x:125,body:{left:-200,right:-198,top:0,bottom:1}},
    ui:{onBoss(){},playSound(){},reduceMotion:true},add:{graphics:()=>art},damage(){assert.fail('out of range');}};
  for(const realm of REALMS){
    const [kind,,maxHp]=realm.boss;
    const boss={kind,maxHp,hp:maxHp,x:220,start:101,art,indicator:art,trapArt:[]};
    for(let i=0;i<3;i++){
      resetExpansionBoss(scene,boss);
      boss.hp=maxHp-Math.ceil(i*maxHp/3);
      updateExpansionBoss(scene,boss,()=>{});
      assert.equal(boss.profile.pattern,LEGEND_BOSSES[kind].phases[i].pattern);
      assert(phaseHealthFloor(boss)<boss.hp);
      scene.elapsed+=boss.profile.warning;
      updateExpansionBoss(scene,boss,()=>{});
      assert.equal(boss.phase,'attack');
      scene.elapsed+=boss.profile.attack;
      updateExpansionBoss(scene,boss,()=>{});
      assert.equal(boss.phase,'open');
    }
  }
});
