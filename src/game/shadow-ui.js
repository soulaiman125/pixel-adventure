import { bindingsFor, DEFAULT_KEYS } from './controls.js';
import { SKILLS } from './shadow-skills.js';
import { keyName } from '../ui/action-labels.js';

const ACTION_LABELS = {
  left:'Move left',right:'Move right',jump:'Jump',drop:'Drop',attack:'Katana Rush',throw:'Shuriken',
  dash:'Shadow Dash',sprint:'Shadow Sprint',cyclone:'Blade Cyclone',execution:'Shadow Execution',parry:'Perfect Parry',pause:'Pause',
};
const labelKey = keyName;

export function setupCombatSettings(preferences, save, clear, refreshLabels) {
  const list=document.querySelector('#combat-bindings');
  const status=document.querySelector('#binding-status');
  let pending;
  const nodes=new Map();
  const bindings = action => bindingsFor(preferences,action);
  function refresh(){
    for(const [action,button] of nodes)button.textContent=action===pending?'Press a key':bindings(action).map(labelKey).join(' / ');
  }
  for(const [action,label] of Object.entries(ACTION_LABELS)){
    const row=document.createElement('div');
    const button=document.createElement('button');
    button.type='button'; button.className='button'; button.dataset.bind=action;
    button.setAttribute('aria-label','Rebind '+label);
    const caption = document.createElement('span');
    caption.className = 'binding-action';
    caption.textContent = label;
    row.append(caption,button); list.append(row); nodes.set(action,button);
    button.addEventListener('click',()=>{pending=action;status.textContent='Choose a key for '+label;refresh();});
  }
  list.closest('dialog').addEventListener('close',()=>{pending=undefined;refresh();});
  document.addEventListener('keydown',event=>{
    if(!pending)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.repeat)return;
    const selected=pending;
    pending=undefined;
    const conflict=Object.keys(DEFAULT_KEYS).some(action=>action!==selected&&bindings(action).includes(event.code));
    if(!event.code||event.ctrlKey||event.altKey||event.metaKey||event.code==='KeyR'||event.code==='Tab'||conflict){
      status.textContent='That key is reserved or assigned to another action.';
    }else{
      preferences.keys={...preferences.keys,[selected]:event.code};
      save();clear();refreshLabels();
      status.textContent=nodes.get(selected).getAttribute('aria-label').replace(/^Rebind /,'')+' uses '+labelKey(event.code)+'.';
    }
    refresh();
  },true);
  document.querySelector('#reset-bindings').addEventListener('click',()=>{
    delete preferences.keys;
    pending=undefined;
    save();clear();refresh();refreshLabels();status.textContent='Default controls restored.';
  });
  const toggle=document.querySelector('#sprint-toggle');
  toggle.checked=Boolean(preferences.sprintToggle);
  toggle.addEventListener('change',()=>{preferences.sprintToggle=toggle.checked;clear();save();});
  refresh();
}

export function setupSkillTree(skills, training, navigation, confirmAction) {
  const dialog=document.querySelector('#skills-dialog');
  const list=document.querySelector('#skill-grid');
  function paint(){
    document.querySelector('#skill-points').textContent=skills.points();
    list.replaceChildren();
    for(const [id,[name,icon,descriptions]] of Object.entries(SKILLS)){
      const card=document.createElement('section');
      card.className='skill-card';
      const title=document.createElement('h3');
      title.textContent=icon+' '+name;
      const level=skills.tier(id);
      const progress=document.createElement('p');
      progress.textContent='Tier '+level+' / 3';
      const tiers=document.createElement('ol');
      descriptions.forEach((description,index)=>{
        const item=document.createElement('li');
        item.textContent=(index<level?'Learned · ':index===level?'Next · ':'Locked · ')+description;
        tiers.append(item);
      });
      const buy=document.createElement('button');
      buy.type='button';buy.className='button';buy.dataset.skill=id;
      const cost = skills.cost(id);
      buy.textContent = level === 3 ? 'Mastered' : `Upgrade · ${cost} ${cost === 1 ? 'point' : 'points'}`;
      buy.disabled = level === 3 || skills.points() < cost;
      buy.addEventListener('click',()=>confirmAction({
        title: 'Upgrade ' + name + '?',
        message: descriptions[level] + ' · Costs ' + cost + ' Shadow Points.',
        label: 'Learn Upgrade',
      }, () => {
        skills.buy(id);
        paint();
        document.querySelector('#skill-feedback').textContent = name + ' upgraded. ' + skills.points() + ' points left.';
        (list.querySelector('[data-skill="'+id+'"]:not(:disabled)') || dialog.querySelector('[data-close]')).focus();
      }));
      card.append(title,progress,tiers,buy);list.append(card);
    }
  }
  document.querySelector('#skill-tree').addEventListener('click',()=>{
    paint();navigation.open(dialog);
  });
  const reset=document.querySelector('#reset-skills');
  const confirm=document.querySelector('#confirm-skills');
  const cancel = document.querySelector('#cancel-skills');
  const feedback = document.querySelector('#skill-feedback');
  function leaveRefund() { confirm.hidden = true; cancel.hidden = true; }
  reset.addEventListener('click',()=>{
    confirm.hidden = false;
    cancel.hidden = false;
    cancel.focus();
    feedback.textContent = 'Refund all learned Shadow upgrades and return the points?';
  });
  confirm.addEventListener('click',()=>{
    skills.reset(); leaveRefund(); paint();
    feedback.textContent = 'Upgrades refunded.';
    reset.focus();
  });
  cancel.addEventListener('click',()=>{ leaveRefund(); feedback.textContent = ''; reset.focus(); });
  dialog.addEventListener('close',()=>{ leaveRefund(); feedback.textContent = ''; });
  if(training){
    const panel = document.createElement('div');
    panel.id = 'training-controls';
    const grant = document.createElement('button');
    grant.type = 'button';
    grant.className = 'button';
    grant.textContent = 'Grant training points';
    panel.append(grant);
    list.before(panel);
    grant.addEventListener('click',()=>{
      for(let index=0;index<36;index++)skills.award('training-'+index);
      paint();
    });
  }
}
