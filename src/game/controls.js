const keysByAction = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp', 'Space'],
  drop: ['KeyS', 'ArrowDown'],
  attack: ['KeyX', 'KeyJ'],
};
const gameplayKeys = new Set(Object.values(keysByAction).flat());
const BUTTON_MOVE_TIME = 150;

export function createControls(container, isPlaying) {
  const heldKeys = new Set();
  const heldPointers = new Map();
  const buttons = [...container.querySelectorAll('[data-action]')];
  const buttonMoves = new Map();
  let jumpPressed = false;
  let attackPressed = false;

  function clear() {
    heldKeys.clear();
    heldPointers.clear();
    buttonMoves.clear();
    jumpPressed = false;
    attackPressed = false;
    for (const button of buttons) delete button.dataset.pressed;
  }

  window.addEventListener('keydown', (event) => {
    const focus = document.activeElement;
    if (!isPlaying() || event.altKey || event.ctrlKey || event.metaKey
      || focus?.closest('button, input, select, textarea, a, [contenteditable]')
      || !gameplayKeys.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) {
      if (keysByAction.jump.includes(event.code) && !isDown('jump')) jumpPressed = true;
      if (keysByAction.attack.includes(event.code)) attackPressed = true;
      heldKeys.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => heldKeys.delete(event.code));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
  });

  for (const button of buttons) {
    const action = button.dataset.action;
    button.addEventListener('pointerdown', (event) => {
      if (!isPlaying() || event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      if (action === 'jump' && !isDown('jump')) jumpPressed = true;
      if (action === 'attack') attackPressed = true;
      heldPointers.set(event.pointerId, button);
      button.dataset.pressed = '';
    });
    const release = (event) => {
      heldPointers.delete(event.pointerId);
      if (![...heldPointers.values()].includes(button)) delete button.dataset.pressed;
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      // Native keyboard and assistive technology activation produces a click without a pointer press.
      if (!isPlaying() || event.detail !== 0) return;
      if (action === 'jump') jumpPressed = true;
      else if (action === 'attack') attackPressed = true;
      else buttonMoves.set(action, performance.now() + BUTTON_MOVE_TIME);
    });
  }

  function isDown(action) {
    if (keysByAction[action].some((code) => heldKeys.has(code))) return true;
    for (const button of heldPointers.values()) {
      if (button.dataset.action === action) return true;
    }
    return (buttonMoves.get(action) ?? 0) > performance.now();
  }

  return {
    clear,
    isDown,
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
