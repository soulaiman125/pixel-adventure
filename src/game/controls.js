import { createTouchControls } from './touch-controls.js';

export const DEFAULT_KEYS = {
  left:['KeyA','ArrowLeft'], right:['KeyD','ArrowRight'], jump:['Space','KeyW','ArrowUp'],
  drop:['KeyS','ArrowDown'], attack:['KeyX','KeyJ'], throw:['KeyC','KeyK'],
  dash:['KeyZ'], sprint:['ShiftLeft'], cyclone:['KeyV'], execution:['KeyF'], parry:['KeyQ'], pause:['Escape'],
};

export function bindingsFor(preferences, action) {
  const saved = preferences.keys ?? {};
  if (typeof saved[action] === 'string' && saved[action]) return [saved[action]];
  if (action === 'parry') {
    const occupied = new Set(Object.values(saved));
    return [['KeyQ','KeyE','KeyG','KeyH'].find(code => !occupied.has(code)) ?? 'KeyP'];
  }
  return DEFAULT_KEYS[action];
}

export function gamepadActions(pad) {
  const b = index => pad.buttons[index]?.pressed === true;
  const x = pad.axes[0] ?? 0;
  const y = pad.axes[1] ?? 0;
  return { left:x < -.35 || b(14), right:x > .35 || b(15), drop:y > .55 || b(13),
    jump:b(0), attack:b(2), throw:b(3), dash:b(5), sprint:b(4), parry:b(1),
    cyclone:b(6), execution:b(7), pause:b(9) };
}

export function createControls(container, isPlaying, hapticFeedback, shadowEnabled = () => false, preferences = {}) {
  const held = new Map();
  const queued = new Set();
  let sprintToggle = false;
  let gamepad = {};
  let gamepadPrimed = false;
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
    gamepad = {}; gamepadPrimed = false;
    container.querySelector('[data-action="sprint"]')?.setAttribute('aria-pressed','false');
  }
  function keyFor(action) {
    return bindingsFor(preferences,action);
  }
  function keyboardHeld(action) {
    for (const value of held.values()) if (value === action) return true;
    return false;
  }
  const consume = action => queued.delete(action);
  window.addEventListener('keydown',event=>{
    if(!isPlaying() || event.altKey || event.ctrlKey || event.metaKey ||
      document.activeElement?.closest('button,input,select,textarea,a,[contenteditable]'))return;
    const actions=Object.keys(DEFAULT_KEYS).filter(action=>shadowEnabled() || !['throw','dash','sprint','cyclone','execution','parry'].includes(action));
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
    readGamepad(){
      const pad = !document.hidden && navigator.getGamepads?.().find(Boolean);
      if (!pad) {
        gamepad = {}; gamepadPrimed = false;
        return;
      }
      const next = gamepadActions(pad);
      if (gamepadPrimed) {
        for (const action of Object.keys(next)) if (next[action] && !gamepad[action]) queued.add(action);
      }
      gamepadPrimed = true;
      gamepad = next;
    },
    isDown(action){
      return keyboardHeld(action) || gamepad[action] === true ||
        (action==='sprint' && preferences.sprintToggle ? sprintToggle : touch.isDown(action));
    },
    consumeJump:()=>consume('jump'), consumeAttack:()=>consume('attack'), consumeDash:()=>consume('dash'), consumeThrow:()=>consume('throw'),
  };
}
