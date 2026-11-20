const ACTIVATION_MS = 150;

// Keep native buttons for accessibility and use each browser pointer ID independently.
// Phaser consumes this state alongside keyboard input in the scene's normal update.
export function createTouchControls(panel, isPlaying, onAction, onCancel) {
  const pointers = new Map();
  const buttons = new Map();
  const actions = new Map();
  for (const button of panel.querySelectorAll('[data-action]')) {
    const name = button.dataset.action;
    const state = { button, name, count: 0, until: 0 };
    buttons.set(button, state);
    actions.set(name, state);
  }
  const left = actions.get('left');
  const right = actions.get('right');
  const isDirection = (action) => action === left || action === right;

  function choose(pointer, action) {
    if (pointer.action === action) return;
    if (pointer.action && --pointer.action.count === 0) delete pointer.action.button.dataset.pressed;
    pointer.action = action;
    if (action && ++action.count === 1) action.button.dataset.pressed = '';
  }

  function dismiss(pointer, canceled) {
    const action = pointer.action;
    choose(pointer, undefined);
    if (canceled && action?.count === 0) onCancel(action.name);
  }

  function release(id, canceled = false) {
    const pointer = pointers.get(id);
    if (!pointer) return;
    pointers.delete(id);
    dismiss(pointer, canceled);
    const button = pointer.origin.button;
    if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
  }

  function inside(event, action) {
    const rect = action.button.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX < rect.right
      && event.clientY >= rect.top && event.clientY < rect.bottom;
  }

  panel.addEventListener('pointerdown', (event) => {
    const origin = buttons.get(event.target.closest('button'));
    if (!origin || !isPlaying() || event.button !== 0 || pointers.has(event.pointerId)) return;
    event.preventDefault();
    origin.button.setPointerCapture(event.pointerId);
    const pointer = { origin, action: undefined, crossed: false };
    pointers.set(event.pointerId, pointer);
    choose(pointer, origin);
    onAction(origin.name);
  });

  panel.addEventListener('pointermove', (event) => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    if (isDirection(pointer.origin)) {
      if (inside(event, left)) choose(pointer, left);
      else if (inside(event, right)) choose(pointer, right);
      else choose(pointer, undefined);
    } else if (!pointer.crossed && !inside(event, pointer.origin)) {
      pointer.crossed = true;
      dismiss(pointer, true);
    }
  });

  const cancel = event => release(event.pointerId, true);
  // Listen globally because a browser gesture can cancel the capture.
  window.addEventListener('pointerup', event => release(event.pointerId), true);
  window.addEventListener('pointercancel', cancel, true);
  panel.addEventListener('lostpointercapture', cancel);
  panel.addEventListener('contextmenu', (event) => event.preventDefault());
  panel.addEventListener('click', (event) => {
    const action = buttons.get(event.target.closest('button'));
    // Native keyboard and assistive-technology activation sends a click without a pointer press.
    if (!action || !isPlaying() || event.detail !== 0 || event.pointerType) return;
    if (isDirection(action)) action.until = performance.now() + ACTIVATION_MS;
    else onAction(action.name);
  });

  return {
    clear() {
      for (const id of pointers.keys()) release(id);
      for (const action of actions.values()) action.until = 0;
    },
    isDown(name) {
      const action = actions.get(name);
      return Boolean(action && (action.count > 0 || (action.until > 0 && performance.now() < action.until)));
    },
  };
}
