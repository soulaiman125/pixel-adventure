export function setupTouchSettings(panel, preferences, savePreferences) {
  const size = document.querySelector('#touch-size');
  const opacity = document.querySelector('#touch-opacity');
  const opacityValue = document.querySelector('#touch-opacity-value');
  const leftHanded = document.querySelector('#touch-left-handed');
  const haptics = document.querySelector('#touch-haptics');
  const canVibrate = typeof navigator.vibrate === 'function'
    && matchMedia('(any-pointer: coarse)').matches;
  document.querySelector('#touch-haptics-setting').hidden = !canVibrate;

  const stored = preferences.touch ?? {};
  if (Array.from(size.options).some((option) => option.value === stored.size)) size.value = stored.size;
  if (Number.isFinite(stored.opacity)) opacity.value = stored.opacity;
  leftHanded.checked = stored.leftHanded === true;
  haptics.checked = stored.haptics === true;

  function apply() {
    panel.dataset.size = size.value;
    panel.classList.toggle('left-handed', leftHanded.checked);
    panel.style.setProperty('--touch-opacity', opacity.valueAsNumber / 100);
    opacityValue.textContent = `${opacity.value}%`;
  }
  function save() {
    apply();
    preferences.touch = { size: size.value, opacity: opacity.valueAsNumber,
      leftHanded: leftHanded.checked, haptics: haptics.checked };
    savePreferences();
  }
  apply();
  opacity.addEventListener('input', apply);
  for (const input of [size, opacity, leftHanded, haptics]) input.addEventListener('change', save);

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
