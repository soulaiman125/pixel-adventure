import { createTouchControls } from './touch-controls.js';

const keysByAction = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp', 'Space'],
  drop: ['KeyS', 'ArrowDown'],
  attack: ['KeyX', 'KeyJ'],
};
const gameplayKeys = new Set(Object.values(keysByAction).flat());

export function createControls(container, isPlaying, hapticFeedback) {
  const heldKeys = new Set();
  let jumpPressed = false;
  let attackPressed = false;
  const touch = createTouchControls(container, isPlaying, (action) => {
    if (action === 'jump') jumpPressed = true;
    if (action === 'attack') attackPressed = true;
    if (action === 'jump' || action === 'attack') hapticFeedback();
  });

  function clear() {
    heldKeys.clear();
    touch.clear();
    jumpPressed = false;
    attackPressed = false;
  }

  function keyboardDown(action) {
    const keys = keysByAction[action];
    for (let index = 0; index < keys.length; index++) {
      if (heldKeys.has(keys[index])) return true;
    }
    return false;
  }

  window.addEventListener('keydown', (event) => {
    if (!isPlaying() || event.altKey || event.ctrlKey || event.metaKey
      || document.activeElement?.closest('button, input, select, textarea, a, [contenteditable]')
      || !gameplayKeys.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) {
      if (keysByAction.jump.includes(event.code) && !keyboardDown('jump')) jumpPressed = true;
      if (keysByAction.attack.includes(event.code)) attackPressed = true;
      heldKeys.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => heldKeys.delete(event.code));
  window.addEventListener('blur', clear);
  window.addEventListener('pagehide', clear);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
  });

  return {
    clear,
    isDown(action) {
      return keyboardDown(action) || touch.isDown(action);
    },
    consumeJump() {
      const pressed = jumpPressed;
      jumpPressed = false;
      return pressed;
    },
    consumeAttack() {
      const pressed = attackPressed;
      attackPressed = false;
      return pressed;
    },
  };
}
