import { HEROES, HERO_UPGRADES, heroKit } from './legends-heroes.js';

export const LEGENDS_KEY = 'pixel-adventure.legends';
export const QUESTS = {
  blade:['First Oath','Clear three campaign stages with one hero.', profile=>Object.keys(profile.clears).length>=3,18],
  master:['Trial of the Seal','Defeat one campaign boss with one hero.', profile=>Object.keys(profile.clears).some(stage=>[20,25,30,36,42,48,54,60].includes(Number(stage))),25],
  collector:['Echo Collector','Find any hidden cache in the new realms.', (_profile,data)=>data.secrets.length>0,22],
  score:['Night Watch','Clear at least three Survival waves.', profile=>profile.arena.wave>=3,20],
};

const heroSave=()=>({xp:0,points:0,clears:{},upgrades:[],ownsAlternate:false,weapon:'standard',honing:0,cosmetic:'scout',claimed:[],arena:{wave:0,score:0}});
const integer=(value,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=0?Math.min(value,max):0;
const mapRecord=(value,predicate)=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([k,v])=>predicate(v,k)));
const stageKey=(key)=>/^([1-9]|[1-5][0-9]|60)$/.test(key);
export function mastery(xp){return 1+Math.floor(Math.sqrt(Math.max(0,xp)/85));}

export function dailyFor(date=new Date()){
  const day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  const seed=[...day].reduce((n,c)=>(n*131+c.charCodeAt(0))>>>0,0);
  const kinds=['clean','time','arena','combo'];
  return {day,kind:kinds[seed%4],level:seed%3,
    target:[0,22000,3,4][seed%4],
    label:['Clear without damage','Reach the flag within 22 seconds','Clear three Survival waves','Land a four-hit chain and clear'][seed%4]};
}

export function createLegendsProgress(storage, {levels, record}){
  const baseBalance=levels.reduce((sum,_,i)=>sum+integer(record(i)?.coins),0);
  const data={version:4,selected:'shadow',coins:baseBalance,heroes:Object.fromEntries(Object.keys(HEROES).map(key=>[key,heroSave()])),
    coinBests:Object.fromEntries(levels.flatMap((_,i)=>record(i)?[[i+1,integer(record(i).coins)]]:[])),
    secrets:[],daily:{},rematches:{},intro:false,ng:{available:levels.length===60&&levels.every((_,index)=>record(index)),cycle:0,frontier:1,records:{}}};
  try{
    const saved=JSON.parse(storage.getItem(LEGENDS_KEY));
    if(saved?.version===4){
      if(Object.hasOwn(HEROES,saved.selected))data.selected=saved.selected;
      if(Number.isSafeInteger(saved.coins)&&saved.coins>=0)data.coins=saved.coins;
      data.coinBests={...data.coinBests,...mapRecord(saved.coinBests,(value,key)=>stageKey(key)&&integer(value)===value)};
      data.secrets=Array.isArray(saved.secrets)?[...new Set(saved.secrets.filter(key=>typeof key==='string'))]:[];
      data.daily=mapRecord(saved.daily,(value,key)=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&value===true);
      data.rematches=mapRecord(saved.rematches,value=>integer(value)===value);
      data.intro=saved.intro===true;
      data.ng={available:data.ng.available||saved.ng?.available===true,cycle:integer(saved.ng?.cycle),
        frontier:Math.max(1,integer(saved.ng?.frontier,levels.length+1)),records:mapRecord(saved.ng?.records,value=>integer(value)===value)};
      for(const [id,profile] of Object.entries(data.heroes)){
        const prior=saved.heroes?.[id];
        if(!prior)continue;
        profile.xp=integer(prior.xp);
        profile.points=integer(prior.points);
        profile.clears=mapRecord(prior.clears,(value,key)=>stageKey(key)&&integer(value)===value);
        profile.ownsAlternate=prior.ownsAlternate===true;
        profile.weapon=profile.ownsAlternate&&prior.weapon==='alternate'?'alternate':'standard';
        profile.honing=integer(prior.honing,2);
        profile.cosmetic=prior.cosmetic==='silver'&&mastery(profile.xp)>=3?'silver':'scout';
        const valid=Object.values(HERO_UPGRADES[id]??{}).flat().map(node=>node.id);
        profile.upgrades=Array.isArray(prior.upgrades)?[...new Set(prior.upgrades.filter(node=>valid.includes(node)))]:[];
        profile.claimed=Array.isArray(prior.claimed)?Object.keys(QUESTS).filter(key=>prior.claimed.includes(key)):[];
        profile.arena={wave:integer(prior.arena?.wave),score:integer(prior.arena?.score)};
      }
    }
  }catch{ /* Legacy saves remain independent of this optional expansion record. */ }
  const save=()=>{try{storage.setItem(LEGENDS_KEY,JSON.stringify(data));}catch{ /* Keep session data usable. */ }};
  const award=(id,coins,xp=0)=>{data.coins+=coins;data.heroes[id].xp+=xp;save();};
  const nodeFor=(id,key)=>Object.values(HERO_UPGRADES[id]??{}).flat().find(node=>node.id===key);
  return {
    get selected(){return data.selected;}, get coins(){return data.coins;}, get ng(){return data.ng;},
    get intro(){return data.intro;}, markIntro(){data.intro=true;save();},
    profile(id){return data.heroes[id];},
    select(id){if(!Object.hasOwn(HEROES,id))return false;data.selected=id;save();return true;},
    kit(id=data.selected,base=false){const p=data.heroes[id];return heroKit(id,base?'standard':p.weapon,base?[]:p.upgrades,base?0:p.honing);},
    nodeAvailable(id,node){
      const p=data.heroes[id];
      return !p.upgrades.includes(node.id)&&p.points>=node.cost&&(!node.previous||p.upgrades.includes(node.previous));
    },
    purchase(id,key){
      const node=nodeFor(id,key);
      if(!node||!this.nodeAvailable(id,node))return false;
      const p=data.heroes[id];p.points-=node.cost;p.upgrades.push(key);save();return true;
    },
    weapon(id,style){
      const p=data.heroes[id];
      if(style==='alternate'&&!p.ownsAlternate){
        if(data.coins<25)return false;
        data.coins-=25;p.ownsAlternate=true;
      }
      p.weapon=style==='alternate'?'alternate':'standard';save();return true;
    },
    hone(id){
      const p=data.heroes[id],cost=18+p.honing*10;
      if(p.honing>=2||data.coins<cost)return false;
      data.coins-=cost;p.honing++;save();return true;
    },
    cosmetic(id,style){
      const p=data.heroes[id];
      if(style==='silver'&&mastery(p.xp)<3)return false;
      p.cosmetic=style==='silver'?'silver':'scout';save();return true;
    },
    campaign(id,index,count,time,tally,boss){
      if(!levels[index]||count<0||count>levels[index].coins.length||!Number.isFinite(time))return;
      const p=data.heroes[id],stage=index+1,first=p.clears[stage]===undefined;
      const gain=Math.max(0,count-(data.coinBests[stage]??0));
      data.coinBests[stage]=Math.max(count,data.coinBests[stage]??0);
      p.clears[stage]=Math.min(Math.round(time),p.clears[stage]??Infinity);
      if(first){p.points+=1+Number(Boolean(boss));p.xp+=45+Math.min(35,tally.hits*3)+(boss?55:0);}
      data.coins+=gain;
      if(stage===levels.length&&levels.every((_,i)=>i===index||record(i)))data.ng.available=true;
      save();
    },
    visitSecret(id,key){
      if(data.secrets.includes(key))return false;
      data.secrets.push(key);data.heroes[id].points++;award(id,7,35);return true;
    },
    quest(id,key){
      const p=data.heroes[id];const rule=QUESTS[key];
      return { ready:!!rule?.[2](p,data), claimed:p.claimed.includes(key) };
    },
    claim(id,key){
      const p=data.heroes[id],state=this.quest(id,key);
      if(!state.ready||state.claimed)return false;
      p.claimed.push(key);p.points++;award(id,QUESTS[key][3],40);return true;
    },
    survival(id,wave,score){
      const p=data.heroes[id];
      const improvement=Math.max(0,wave-p.arena.wave);
      p.arena.wave=Math.max(p.arena.wave,wave);p.arena.score=Math.max(p.arena.score,score);
      award(id,0,improvement*18);
    },
    rematch(id,index,difficulty,time){
      const key=[id,index,difficulty].join('-');
      const old=data.rematches[key];
      data.rematches[key]=Math.min(old??Infinity,Math.round(time));award(id,0,old===undefined?45:0);
      return data.rematches[key];
    },
    rematchBest:(id,index,difficulty)=>data.rematches[[id,index,difficulty].join('-')],
    dailyDone:day=>Boolean(data.daily[day]),
    finishDaily(id,challenge,run){
      if(data.daily[challenge.day])return false;
      const pass=challenge.kind==='arena'?run.wave>=challenge.target:challenge.kind==='clean'?run.damage===0&&run.deaths===0:
        challenge.kind==='time'?run.elapsed<=challenge.target:run.highChain>=challenge.target;
      if(!pass)return false;
      data.daily[challenge.day]=true;award(id,12,32);return true;
    },
    beginCycle(){
      if(!data.ng.available)return false;
      if(!data.ng.cycle||data.ng.frontier>levels.length){data.ng.cycle++;data.ng.frontier=1;save();}
      return true;
    },
    finishCycle(id,index,time){
      if(index<0||index>=data.ng.frontier||index>=levels.length)return false;
      const first=index+1===data.ng.frontier;
      data.ng.frontier=Math.max(data.ng.frontier,index+2);
      const key=data.ng.cycle+'-'+index;
      data.ng.records[key]=Math.min(data.ng.records[key]??Infinity,Math.round(time));
      award(id,first?3:0,first?24:0);return first;
    },
  };
}
