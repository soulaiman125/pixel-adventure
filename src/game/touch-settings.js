export function setupTouchSettings(panel, preferences, savePreferences) {
  const size = document.querySelector('#touch-size');
  const layout = document.querySelector('#touch-layout');
  const buttons = [...panel.querySelectorAll('.touch-actions [data-action]')];
  const from = document.querySelector('#touch-swap-from');
  const to = document.querySelector('#touch-swap-to');
  for (const button of buttons) {
    const label = button.getAttribute('aria-label') || button.textContent;
    for (const select of [from,to]) select.add(new Option(label,button.dataset.action));
  }
  if (to.options.length > 1) to.selectedIndex = 1;
  const opacity = document.querySelector('#touch-opacity');
  const opacityValue = document.querySelector('#touch-opacity-value');
  const leftHanded = document.querySelector('#touch-left-handed');
  const haptics = document.querySelector('#touch-haptics');
  const canVibrate = typeof navigator.vibrate === 'function'
    && matchMedia('(any-pointer: coarse)').matches;
  document.querySelector('#touch-haptics-setting').hidden = !canVibrate;

  const stored = preferences.touch ?? {};
  if (Array.from(size.options).some((option) => option.value === stored.size)) size.value = stored.size;
  if (Array.from(layout.options).some(option=>option.value===stored.layout)) layout.value = stored.layout;
  if (Number.isFinite(stored.opacity)) opacity.value = stored.opacity;
  leftHanded.checked = stored.leftHanded === true;
  haptics.checked = stored.haptics === true;
  const defaults = buttons.map(button=>button.dataset.action);
  let positions = Array.isArray(stored.positions) && stored.positions.length === defaults.length &&
    defaults.every(action=>stored.positions.includes(action)) ? stored.positions.slice() : null;
  const orders = {
    combat:defaults, mobility:['jump','dash','sprint'], defense:['parry','attack','jump'],
  };
  function currentOrder() {
    const preset = orders[layout.value];
    return positions ?? [...new Set([...preset,...defaults])];
  }

  function apply() {
    panel.dataset.size = size.value;
    panel.dataset.layout = layout.value;
    panel.classList.toggle('left-handed', leftHanded.checked);
    panel.style.setProperty('--touch-opacity', opacity.valueAsNumber / 100);
    opacityValue.textContent = `${opacity.value}%`;
    const order = currentOrder();
    for (const button of buttons) button.style.order = order.indexOf(button.dataset.action);
  }
  function save() {
    apply();
    preferences.touch = { size: size.value, layout:layout.value, positions, opacity: opacity.valueAsNumber,
      leftHanded: leftHanded.checked, haptics: haptics.checked };
    savePreferences();
  }
  apply();
  opacity.addEventListener('input', apply);
  for (const input of [size, opacity, leftHanded, haptics]) input.addEventListener('change', save);
  layout.addEventListener('change',()=>{positions=null;save();});
  document.querySelector('#touch-swap').addEventListener('click',()=>{
    positions = currentOrder().slice();
    const first = positions.indexOf(from.value), second = positions.indexOf(to.value);
    if (first < 0 || second < 0) return;
    [positions[first],positions[second]] = [positions[second],positions[first]];
    save();
  });

  const fullscreen = document.querySelector('#fullscreen');
  const status = document.querySelector('#fullscreen-status');
  const root = document.documentElement;
  if (document.fullscreenEnabled && root.requestFullscreen && document.exitFullscreen) {
    fullscreen.hidden = false;
    document.addEventListener('fullscreenchange', () => {
      fullscreen.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Enter Fullscreen';
      status.hidden = true;
    });
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await root.requestFullscreen();
      } catch {
        status.textContent = 'Fullscreen is unavailable in this window.';
        status.hidden = false;
      }
    });
  }

  return () => {
    if (canVibrate && haptics.checked) navigator.vibrate(12);
  };
}
