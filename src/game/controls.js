import { createTouchControls } from './touch-controls.js';

export const DEFAULT_KEYS = {
  left:['KeyA','ArrowLeft'], right:['KeyD','ArrowRight'], jump:['Space','KeyW','ArrowUp'],
  drop:['KeyS','ArrowDown'], attack:['KeyX','KeyJ'], throw:['KeyC','KeyK'],
  dash:['KeyZ'], sprint:['ShiftLeft'], cyclone:['KeyV'], execution:['KeyF'], pause:['Escape'],
};

export function createControls(container, isPlaying, hapticFeedback, shadowEnabled = () => false, preferences = {}) {
  const held = new Map();
  const queued = new Set();
  let sprintToggle = false;
  const touch = createTouchControls(container,isPlaying,action=>{
    queued.add(action);
    if(action==='sprint' && preferences.sprintToggle) {
      sprintToggle=!sprintToggle;
      container.querySelector('[data-action="sprint"]').setAttribute('aria-pressed',String(sprintToggle));
    }
    if(action!=='left' && action!=='right')hapticFeedback();
  });
  function clear(){
    held.clear(); queued.clear(); touch.clear(); sprintToggle=false;
    container.querySelector('[data-action="sprint"]')?.setAttribute('aria-pressed','false');
  }
  function keyFor(action) {
    return preferences.keys?.[action] ? [preferences.keys[action]] : DEFAULT_KEYS[action];
  }
  function keyboardHeld(action) {
    for (const value of held.values()) if (value === action) return true;
    return false;
  }
  const consume = action => queued.delete(action);
  window.addEventListener('keydown',event=>{
    if(!isPlaying() || event.altKey || event.ctrlKey || event.metaKey ||
      document.activeElement?.closest('button,input,select,textarea,a,[contenteditable]'))return;
    const actions=Object.keys(DEFAULT_KEYS).filter(action=>shadowEnabled() || !['throw','dash','sprint','cyclone','execution'].includes(action));
    const action=actions.find(action=>keyFor(action).includes(event.code));
    if(!action)return;
    event.preventDefault();
    if(event.repeat)return;
    if(action!=='jump'||!keyboardHeld('jump'))queued.add(action);
    held.set(event.code,action);
  });
  window.addEventListener('keyup',event=>held.delete(event.code));
  window.addEventListener('blur',clear);
  window.addEventListener('pagehide',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  return {
    clear,keyFor,consume,
    isDown(action){
      return keyboardHeld(action) || (action==='sprint' && preferences.sprintToggle ? sprintToggle : touch.isDown(action));
    },
    consumeJump:()=>consume('jump'), consumeAttack:()=>consume('attack'), consumeDash:()=>consume('dash'), consumeThrow:()=>consume('throw'),
  };
}
