import { HEROES, HERO_UPGRADES } from './legends-heroes.js';
import { dailyFor, mastery, QUESTS } from './legends-progress.js';
import { loadHeroPortrait, shadowClips } from './shadow-art.js';
import { VILLAGE_STATIONS } from './ninja-village.js';

const beats=[
  ['The first shadow','A red ring settles over the moon. In the village, every lantern goes dark except one.'],
  ['Five travelers','Kaito, Akari, Yuki, Raiden, and Mori answer the last lantern. Each carries a weapon and a reason to cross the twelve realms.'],
  ['The twelve seals','The Eclipse Emperor has bound the realms to his shadow. Follow the waystones. Break his seals and bring the dawn back.'],
];

export function installLegendsUI({store,levels,progress,game,actions,reduceMotion}) {
  const dialog=document.createElement('dialog');
  dialog.id='legends-dialog';
  dialog.setAttribute('aria-labelledby','legends-title');
  dialog.innerHTML='<div class="dialog-body"><button class="button icon-button dialog-close" type="button" aria-label="Close Legends">×</button><h2 id="legends-title"></h2><div id="legends-content"></div></div>';
  document.body.append(dialog);
  const title=dialog.querySelector('h2'),body=dialog.querySelector('#legends-content');
  let selected=store.selected,animation=0,chapter=0,menuInput=0,held=new Set();
  const text=(tag,value,css)=>{
    const element=document.createElement(tag);
    element.textContent=value;
    if(css)element.className=css;
    return element;
  };
  const button=(value,callback,disabled=false,primary=false)=>{
    const element=text('button',value,primary?'button button-primary':'button');
    element.type='button';element.disabled=disabled;element.addEventListener('click',callback);
    return element;
  };
  const section=(name)=>{
    cancelAnimationFrame(animation);
    title.textContent=name;body.replaceChildren();
  };
  const nav=(...children)=>{
    const row=document.createElement('div');row.className='legend-nav';row.append(...children);return row;
  };
  function close(){if(dialog.open)dialog.close();}
  dialog.querySelector('button').addEventListener('click',close);
  dialog.addEventListener('close',()=>{cancelAnimationFrame(animation);cancelAnimationFrame(menuInput);held.clear();actions.resumeVillage();});
  function readMenuInput(){
    if(!dialog.open)return;
    const pad=navigator.getGamepads?.().find(Boolean);
    if(pad){
      const down=new Set([0,1,12,13,14,15].filter(index=>pad.buttons[index]?.pressed));
      const entered=index=>down.has(index)&&!held.has(index);
      const controls=[...dialog.querySelectorAll('button:not(:disabled),select')];
      const current=controls.indexOf(document.activeElement);
      if(entered(1))close();
      else if(entered(0))document.activeElement?.click();
      else if([12,13,14,15].some(entered)){
        const forward=entered(13)||entered(15);
        const target=(Math.max(0,current)+(forward?1:controls.length-1))%controls.length;
        controls[target]?.focus();
      }
      held=down;
    }else held.clear();
    menuInput=requestAnimationFrame(readMenuInput);
  }
  function portrait(canvas,id,animated=false){
    if(!game.isBooted)return;
    const key=loadHeroPortrait({textures:game.textures},store.kit(id),store.profile(id).cosmetic);
    const texture=game.textures.get(key),source=texture.getSourceImage(),ctx=canvas.getContext('2d');
    const start=performance.now();
    let last=-1;
    function draw(time){
      const index=animated&&!reduceMotion()?Math.floor((time-start)/186)%shadowClips.idle:0;
      if(index!==last){
        last=index;
        const frame=texture.get('idle'+index);
        ctx.clearRect(0,0,112,80);ctx.imageSmoothingEnabled=false;
        ctx.drawImage(source,frame.cutX,frame.cutY,112,80,0,0,112,80);
      }
      if(animated&&dialog.open)animation=requestAnimationFrame(draw);
    }
    draw(start);
  }
  function canvas(label){
    const element=document.createElement('canvas');element.width=112;element.height=80;
    element.setAttribute('aria-label',label);return element;
  }
  function heroes(){
    section('Choose a Hero');
    const cards=document.createElement('div');cards.className='legend-portraits';
    for(const hero of Object.values(HEROES)){
      const item=button(hero.name,()=>{selected=hero.id;heroes();});
      const icon=canvas(hero.name);
      item.prepend(icon);item.setAttribute('aria-pressed',String(hero.id===selected));
      item.dataset.legendHero=hero.id;cards.append(item);portrait(icon,hero.id);
    }
    body.append(cards);
    const hero=HEROES[selected],profile=store.profile(selected),info=document.createElement('div');
    info.className='legend-profile';
    const view=canvas(hero.name+' animation');info.append(view);
    const detail=document.createElement('div');
    detail.append(text('h3',hero.name+' · '+hero.role),text('p',hero.bio),
      text('p',store.kit(selected).playWeapon+' · Mastery '+mastery(profile.xp)+' · '+profile.xp+' XP'),
      text('p',hero.abilities.join(' · ')),text('p','Ultimate · '+hero.ultimate));
    const meters=document.createElement('div');meters.className='legend-meters';
    for(const [i,label] of ['Speed','Damage','Defense','Range'].entries()){
      const output=document.createElement('meter');output.min=0;output.max=5;output.value=hero.stats[i];
      output.setAttribute('aria-label',label);
      const line=text('span',label);line.append(output);meters.append(line);
    }
    detail.append(meters);info.append(detail);body.append(info);
    const select=button(store.selected===selected?'Selected · '+hero.name:'Select '+hero.name,()=>{
      if(actions.canSelect()&&store.select(selected)){actions.selection();heroes();}
    },false,true);
    select.id='legend-select';
    body.append(nav(select,button('Skill Tree',skills),button('Cosmetics',outfits),button('Back',home)));
    portrait(view,selected,true);
  }
  function skills(){
    section(HEROES[selected].name+' Skill Tree');
    if(selected==='shadow'){
      body.append(text('p','Kaito’s eighteen existing upgrades remain in his Shadow Skill Tree.'),
        button('Open Shadow Skill Tree',()=>{close();actions.shadowSkills();}),button('Back',heroes));
      return;
    }
    const profile=store.profile(selected);
    body.append(text('p',profile.points+' Skill Points'));
    const grid=document.createElement('div');grid.className='skill-grid';
    for(const [branch,nodes] of Object.entries(HERO_UPGRADES[selected])){
      const column=document.createElement('section');column.className='skill-card';
      column.append(text('h3',branch[0].toUpperCase()+branch.slice(1)));
      for(const node of nodes){
        const bought=profile.upgrades.includes(node.id);
        const control=button(node.name+(bought?' · Learned':' · '+node.cost),()=>{store.purchase(selected,node.id);skills();},
          !store.nodeAvailable(selected,node));
        control.dataset.heroNode=node.id;
        column.append(control,text('small',node.detail));
      }
      grid.append(column);
    }
    body.append(grid,button('Back to Heroes',heroes));
  }
  function blacksmith(){
    section('Blacksmith');
    const id=store.selected,hero=HEROES[id],p=store.profile(id);
    body.append(text('p','Hana · '+VILLAGE_STATIONS[0].line),text('p',store.coins+' Coins · Equipped '+store.kit(id).playWeapon));
    body.append(nav(button('Equip '+hero.weapon,()=>{store.weapon(id,'standard');blacksmith();}),
      button((p.ownsAlternate?'Equip ':'Unlock for 25 · ')+hero.alternate,()=>{store.weapon(id,'alternate');blacksmith();},!p.ownsAlternate&&store.coins<25),
      button(p.honing>=2?'Weapon Honing Complete':'Hone Weapon · '+(18+p.honing*10)+' Coins',()=>{store.hone(id);blacksmith();},
        p.honing>=2||store.coins<18+p.honing*10),
      button('Train',()=>{close();actions.dojo();}),button('Back',home)));
    body.append(text('p','Honing '+p.honing+'/2 adds one point of primary damage and reach per step.'));
  }
  function quests(){
    section('Quest Board');
    body.append(text('p',VILLAGE_STATIONS[2].npc+' · '+VILLAGE_STATIONS[2].line));
    for(const [id,[name,description,,coins]] of Object.entries(QUESTS)){
      const status=store.quest(store.selected,id);
      const line=document.createElement('article');line.className='legend-quest';
      line.append(text('h3',name),text('p',description),button(status.claimed?'Claimed':'Claim '+coins+' Coins',
        ()=>{store.claim(store.selected,id);quests();},status.claimed||!status.ready));body.append(line);
    }
    body.append(button('Back',home));
  }
  function outfits(){
    section('Outfit Shop');
    const p=store.profile(selected);
    body.append(text('p',VILLAGE_STATIONS[3].npc+' · '+VILLAGE_STATIONS[3].line));
    body.append(text('p',HEROES[selected].name+' · Mastery '+mastery(p.xp)));
    const view=canvas('Cosmetic preview');body.append(view);
    body.append(nav(button('Original Colors',()=>{store.cosmetic(selected,'scout');outfits();}),
      button('Silver Trim · Mastery 3',()=>{store.cosmetic(selected,'silver');outfits();},mastery(p.xp)<3),
      button('Back',heroes)));
    portrait(view,selected,true);
  }
  function daily(){
    section('Daily Challenge');
    const challenge=dailyFor(),stage=progress.canPlay(challenge.level)?challenge.level:0;
    body.append(text('p',challenge.day+' · '+challenge.label),
      text('p',challenge.kind==='arena'?'Moonlit Watch':levels[stage].name),
      text('p',store.dailyDone(challenge.day)?'Completed today':'Reward · 12 Coins and 32 Mastery XP'));
    body.append(nav(button('Start Challenge',()=>{close();actions.daily(challenge,stage);},store.dailyDone(challenge.day)),button('Back',home)));
  }
  function hall(){
    section('Hall of Legends');
    const eligible=levels.flatMap((level,index)=>level.boss&&progress.record(index)?[[level,index]]:[]);
    const select=document.createElement('select'),difficulty=document.createElement('select');
    select.setAttribute('aria-label','Defeated boss');difficulty.setAttribute('aria-label','Rematch difficulty');
    for(const [level,index] of eligible)select.add(new Option(level.boss.name,index));
    difficulty.add(new Option('Veteran','veteran'));difficulty.add(new Option('Master','master'));
    const record=text('p','');
    const update=()=>{
      const best=store.rematchBest(store.selected,select.value,difficulty.value);
      record.textContent=best===undefined?'No time for this loadout yet':'Best '+(best/1000).toFixed(2)+' seconds';
    };
    select.addEventListener('change',update);difficulty.addEventListener('change',update);update();
    if(eligible.length)body.append(text('p','Choose a defeated guardian and an arena difficulty.'),nav(select,difficulty),record,
      button('Start Boss Rematch',()=>{close();actions.rematch(Number(select.value),difficulty.value);}));
    else body.append(text('p','Defeat a campaign boss to unlock rematches.'));
    body.append(nav(button('Choose Hero',heroes),button(store.ng.available?'New Game+ · Cycle '+Math.max(1,store.ng.cycle):'New Game+ · Finish the campaign',
      ()=>{close();actions.ng();},!store.ng.available),button('Back',home)));
  }
  function story(){
    const [heading,description]=beats[chapter];
    section(heading);body.className='legends-story';
    body.append(text('p',description));
    if(chapter===1){
      const group=document.createElement('div');group.className='legend-story-party';
      for(const hero of Object.values(HEROES)){const panel=canvas(hero.name);group.append(panel);portrait(panel,hero.id);}
      body.append(group);
    }
    body.append(nav(button(chapter<beats.length-1?'Continue':'Return to the Village Tales',()=>{
      if(chapter<beats.length-1){chapter++;story();}else{store.markIntro();home();}
    },false,true),button('Skip Prologue',()=>{store.markIntro();home();})));
  }
  function home(){
    body.className='';
    section('Legends of Shadows');
    body.append(text('p',HEROES[store.selected].name+' · '+store.coins+' Coins · Mastery '+mastery(store.profile(store.selected).xp)));
    body.append(nav(button('Choose Hero',heroes,false,true),button('Enter Ninja Village',()=>{close();actions.village();}),
      button('World Portal',()=>{close();actions.worlds();}),button('Blacksmith',blacksmith),button('Quest Board',quests),
      button('Hall of Legends',hall),button('Daily Challenge',daily),button('Prologue',()=>{chapter=0;story();})));
  }
  function open(tab='home'){
    if(!actions.canSelect())return;
    selected=store.selected;
    if(!dialog.open){actions.pauseVillage();dialog.showModal();menuInput=requestAnimationFrame(readMenuInput);}
    ({heroes,blacksmith,quests,outfits,hall,daily,home}[tab]??home)();
  }
  return {open};
}
