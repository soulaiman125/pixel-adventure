import './styles.css';
import './hybrid.css';
import './ui/game-panel.css';

const state = document.getElementById('startup-state');
const retry = document.getElementById('startup-retry');
const enter = document.getElementById('enter-adventure');
let deadline;
try {
  await Promise.race([
    import('./main.js').then(module => module.ready),
    new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Startup timed out')), 20000); }),
  ]);
  document.documentElement.dataset.startup = 'ready';
  document.querySelector('.masthead').inert = false;
  document.getElementById('landing-utilities').inert = false;
  enter.disabled = false;
  state.hidden = true;
  enter.focus({ preventScroll: true });
} catch (error) {
  document.documentElement.dataset.startup = 'error';
  state.textContent = 'Pixel Adventure could not load. Retry to start again.';
  retry.hidden = false;
  retry.focus({ preventScroll: true });
  console.error(error);
} finally {
  clearTimeout(deadline);
}
retry.addEventListener('click', () => location.reload());
