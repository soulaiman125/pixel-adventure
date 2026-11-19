const focusTarget = 'button:not([disabled]), a[href], select:not([disabled]), input:not([disabled]), summary';

function mountHeader(dialog) {
  const body = dialog.querySelector('.dialog-body');
  const heading = body?.querySelector(':scope > h2');
  const back = body?.querySelector(':scope > .dialog-close');
  if (!heading || !back || body.querySelector('.panel-heading')) return;
  heading.tabIndex = -1;
  const header = document.createElement('header');
  header.className = 'panel-heading';
  header.append(heading, back);
  body.prepend(header);
}

export function createNavigation() {
  const stack = [];
  const top = () => stack.at(-1);
  function open(dialog, { opener = document.activeElement, initial, onBack } = {}) {
    if (dialog.open) return;
    mountHeader(dialog);
    stack.push({ dialog, opener, onBack });
    dialog.showModal();
    dialog.scrollTop = 0;
    const focus = initial ?? dialog.querySelector('.panel-heading h2') ?? dialog.querySelector(focusTarget);
    focus?.focus({ preventScroll: true });
  }
  function close({ restore = true, back = false } = {}) {
    const frame = stack.pop();
    if (!frame) return;
    frame.dialog.close();
    if (restore && frame.opener?.isConnected && frame.opener.checkVisibility() &&
        (!top() || top().dialog.contains(frame.opener))) {
      frame.opener.focus({ preventScroll: true });
    }
    if (back) frame.onBack?.();
  }
  function back() { close({ back: true }); }
  function reset() { while (stack.length) close({ restore: false }); }

  document.addEventListener('cancel', event => {
    if (event.target !== top()?.dialog) return;
    event.preventDefault();
    const action = event.target.querySelector('[data-back-action]');
    if (action) action.click();
    else back();
  }, true);
  return { open, close, back, reset, top: () => top()?.dialog };
}

export function installMenuGamepad({ scope, back, pause }) {
  let previous = [];
  let previousScope;
  function frame() {
    requestAnimationFrame(frame);
    const pad = !document.hidden && Array.from(navigator.getGamepads?.() ?? []).find(Boolean);
    if (!pad) { previous = []; previousScope = scope(); return; }
    const buttons = Array.from(pad.buttons, button => button.pressed);
    const digital = [buttons[12] || pad.axes[1] < -.55, buttons[13] || pad.axes[1] > .55,
      buttons[14] || pad.axes[0] < -.55, buttons[15] || pad.axes[0] > .55];
    buttons.splice(12, 4, ...digital);
    const pressed = index => buttons[index] && !previous[index];
    const root = scope();
    if (root && previousScope === root && [0,1,9,12,13,14,15].some(pressed)) {
      const controls = Array.from(root.querySelectorAll(focusTarget))
        .filter(node => node.checkVisibility() && !node.closest('[inert]'));
      const focus = document.activeElement;
      const current = controls.indexOf(focus);
      const delta = pressed(15) ? 1 : pressed(14) ? -1 : 0;
      const handledPause = pressed(9) && pause(root);
      if (handledPause) { previous = buttons; previousScope = scope(); return; }
      if (pressed(1)) back(root);
      else if (pressed(0)) {
        if (current >= 0 && !focus.matches('select, input[type="range"]')) focus.click();
        else if (current < 0) controls[0]?.focus();
      } else if (delta && focus.matches('select, input[type="range"]') && current >= 0) {
        if (focus.matches('select')) {
          const options = Array.from(focus.options);
          for (let index = focus.selectedIndex + delta; options[index]; index += delta) {
            if (!options[index].disabled) { focus.selectedIndex = index; break; }
          }
        } else if (delta > 0) focus.stepUp();
        else focus.stepDown();
        focus.dispatchEvent(new Event('input', { bubbles: true }));
        focus.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (controls.length && (pressed(12) || pressed(13) || delta)) {
        const step = pressed(12) || delta < 0 ? -1 : 1;
        controls[current < 0 ? 0 : (current + step + controls.length) % controls.length]?.focus();
      }
    }
    previous = buttons;
    previousScope = root;
  }
  requestAnimationFrame(frame);
}
