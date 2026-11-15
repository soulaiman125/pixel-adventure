import Phaser from 'phaser';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/dm-sans/wght.css';
import { createControls } from './game/controls.js';
import { setupTouchSettings } from './game/touch-settings.js';
import { VIEW_HEIGHT } from './game/level-one.js';
import { LEVELS } from './game/levels.js';
import { MenuScene } from './game/menu-scene.js';
import { createProgress, ratingFor } from './game/progress.js';
import { createSound } from './game/sound.js';
import { PlatformerScene } from './game/platformer-scene.js';
import './styles.css';

const byId = (id) => document.getElementById(id);
const shell = byId('shell');
// The packaged game blocks web navigation and keeps its menu usable offline.
byId('menu-release-links').hidden = !['http:', 'https:'].includes(location.protocol);
const stage = byId('stage');
const gameMount = byId('game-mount');
const toast = byId('game-toast');
const helpButton = byId('help-button');
const soundButton = byId('sound-button');
const soundSetting = byId('sound-setting');
const volumeSetting = byId('sound-volume');
const musicSetting = byId('music-volume');
const motionSetting = byId('motion-setting');
const dangerSetting = byId('danger-setting');
const tutorialDone = byId('tutorial-done');
const levelDialog = byId('levels-dialog');
const settings = byId('settings-dialog');
const help = byId('help-dialog');
const pause = byId('pause-dialog');
const clear = byId('clear-dialog');
const victory = byId('victory-dialog');
const nextLevel = byId('next-level');
const viewVictory = byId('view-victory');
const worlds = new Map([[0, 'Green Valley'], [4, 'Dangerous Canyon'], [8, 'Frozen Kingdom'],
  [12, 'Fire Kingdom'], [16, 'Dark Castle'], [20, 'Poison Jungle'], [25, 'Thunder Fortress']]);
const worldRows = [];
const levelButtons = LEVELS.map((level, index) => {
  const list = byId('level-list');
  if (worlds.has(index)) {
    const heading = document.createElement('h3');
    heading.tabIndex = -1;
    heading.id = `world-${index + 1}`;
    heading.textContent = worlds.get(index);
    const count = document.createElement('span');
    heading.append(count);
    list.append(heading);
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'button world-jump';
    jump.textContent = worlds.get(index);
    jump.addEventListener('click', () => {
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start' });
    });
    byId('world-nav').append(jump);
    worldRows.push({ start: index, count, jump });
  }
  const button = document.createElement('button');
  button.className = 'button level-option';
  button.type = 'button';
  button.dataset.level = index;
  button.innerHTML = '<span class="level-number" aria-hidden="true"></span><span><small></small><strong></strong><small class="level-record" hidden></small></span><svg class="trailing" aria-hidden="true"><use href="#lock"/></svg>';
  button.querySelector('.level-number').textContent = String(index + 1).padStart(2, '0');
  button.querySelector('strong').textContent = level.name;
  list.append(button);
  return button;
});
const progress = createProgress(LEVELS);
const sound = createSound();
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const preferenceKey = 'pixel-adventure.preferences';

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(preferenceKey)) ?? {};
  } catch {
    return {};
  }
}

const preferences = { ...readPreferences() };
let mode = 'menu';
let currentLevel = 0;
let requestedLevel;
let tutorialPurpose;
let toastTimeout;
let landscapeAnimation;
let settingsFromPause = false;

function savePreferences() {
  try {
    localStorage.setItem(preferenceKey, JSON.stringify(preferences));
  } catch {
    // Preferences still work for the current visit.
  }
}

function reduceMotion() {
  return motionPreference.matches || preferences.reducedMotion === true;
}

function percentage(value, fallback) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;
}

function updatePreferences() {
  const soundEnabled = preferences.sound !== false;
  const volume = percentage(preferences.volume, 100);
  const musicVolume = percentage(preferences.musicVolume, 45);
  sound.configure(soundEnabled, volume / 100, musicVolume / 100);
  volumeSetting.value = volume;
  musicSetting.value = musicVolume;
  byId('volume-value').textContent = `${volume}%`;
  byId('music-volume-value').textContent = `${musicVolume}%`;
  soundSetting.checked = soundEnabled;
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  byId('sound-icon').setAttribute('href', soundEnabled ? '#speaker' : '#muted');
  byId('sound-label').textContent = soundEnabled ? 'Sound on' : 'Sound off';
  motionSetting.checked = reduceMotion();
  motionSetting.disabled = motionPreference.matches;
  dangerSetting.checked = preferences.dangerGuides === true;
  document.documentElement.classList.toggle('reduce-motion', reduceMotion());
}

function changeSound(enabled) {
  preferences.sound = enabled;
  savePreferences();
  updatePreferences();
  sound.unlock();
}

updatePreferences();
syncMusic();
motionPreference.addEventListener('change', updatePreferences);
document.addEventListener('visibilitychange', syncMusic);
window.addEventListener('pagehide', () => sound.music());
window.addEventListener('pageshow', syncMusic);
soundButton.addEventListener('click', () => {
  changeSound(!soundSetting.checked);
  if (mode === 'playing') focusStage();
});
soundSetting.addEventListener('change', () => changeSound(soundSetting.checked));
for (const [slider, key] of [[volumeSetting, 'volume'], [musicSetting, 'musicVolume']]) {
  slider.addEventListener('input', () => {
    preferences[key] = slider.valueAsNumber;
    updatePreferences();
  });
  slider.addEventListener('change', savePreferences);
}
dangerSetting.addEventListener('change', () => {
  preferences.dangerGuides = dangerSetting.checked;
  savePreferences();
});
motionSetting.addEventListener('change', () => {
  preferences.reducedMotion = motionSetting.checked;
  savePreferences();
  updatePreferences();
});
window.addEventListener('keydown', () => sound.unlock(), { capture: true });
window.addEventListener('pointerdown', () => sound.unlock(), { capture: true });
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button && !button.matches('[data-action], :disabled')) sound.play('click');
});

const pad = (number) => String(number).padStart(2, '0');
const formatScore = (count) => String(count * 100).padStart(4, '0');

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

function setMode(nextMode) {
  mode = nextMode;
  syncMusic();
  document.documentElement.classList.toggle('in-game', nextMode === 'playing' || nextMode === 'loading');
  const isMenu = nextMode === 'menu';
  document.documentElement.classList.toggle('game-view', !isMenu);
  shell.dataset.view = isMenu ? 'menu' : 'playing';
  byId('main-menu').hidden = !isMenu;
  byId('menu-footer').hidden = !isMenu;
  byId('hud').hidden = isMenu;
  byId('loading-label').hidden = nextMode !== 'loading';
  byId('keyboard-hints').hidden = isMenu;
}

function syncMusic() {
  const track = mode === 'menu' ? 'verdant' : mode === 'playing' ? LEVELS[currentLevel].theme : undefined;
  sound.music(document.hidden ? undefined : track);
}

function showScore(count) {
  byId('coins').textContent = pad(count);
  byId('score').textContent = formatScore(count);
}

function showTime(elapsed) {
  byId('time').textContent = formatTime(elapsed);
}

function hideToast() {
  window.clearTimeout(toastTimeout);
  toast.hidden = true;
  byId('toast-label').textContent = '';
}

function showToast(message, effect) {
  hideToast();
  byId('toast-label').textContent = message;
  toast.hidden = false;
  toastTimeout = window.setTimeout(hideToast, 2000);
  sound.play(effect);
}

function viewportWidth() {
  return Math.round(Math.max(1, gameMount.clientWidth) / Math.max(1, gameMount.clientHeight) * VIEW_HEIGHT);
}

function resize() {
  const width = viewportWidth();
  if (game.scale.width !== width) game.scale.resize(width, VIEW_HEIGHT);
}

function transitionLandscape() {
  landscapeAnimation?.cancel();
  if (!reduceMotion()) landscapeAnimation = gameMount.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
}

function focusStage() {
  stage.focus({ preventScroll: true });
}

function updateLevelSelect() {
  byId('menu-unlocks').textContent = `${progress.unlocked} / ${LEVELS.length} levels unlocked`;
  levelButtons.forEach((button, index) => {
    const locked = !progress.canPlay(index);
    button.disabled = locked;
    button.classList.toggle('level-ready', !locked);
    button.querySelector('small').textContent = `Level ${index + 1}${locked ? ' · Locked' : ''}`;
    button.querySelector('use').setAttribute('href', locked ? '#lock' : '#play');
    const record = progress.record(index);
    const label = button.querySelector('.level-record');
    label.hidden = !record;
    if (record) {
      const badge = record.bestDeaths === 0 ? ' · No deaths' : '';
      label.textContent = `${record.coins}/${LEVELS[index].coins.length} coins · ${record.stars} ★ · Best ${formatTime(record.elapsed)}${badge}`;
    }
  });
  worldRows.forEach(({ start, count, jump }, index) => {
    const end = worldRows[index + 1]?.start ?? LEVELS.length;
    let cleared = 0;
    for (let stage = start; stage < end; stage++) {
      if (progress.record(stage)) cleared++;
    }
    count.textContent = `${cleared} / ${end - start}`;
    jump.setAttribute('aria-label', `${worlds.get(start)}, ${cleared} of ${end - start} stages cleared`);
  });
}

function startRun(index) {
  byId('boss-hud').hidden = true;
  currentLevel = index;
  const level = LEVELS[index];
  shell.dataset.theme = level.theme;
  byId('hud-level-number').textContent = pad(index + 1);
  byId('hud-level-name').textContent = level.name;
  byId('pause-level').textContent = `Level ${index + 1} · ${level.name}`;
  showScore(0);
  showTime(0);
  byId('deaths').textContent = '0';
  controls.clear();
  hideToast();
  setMode('loading');
  game.scene.stop('menu');
  game.scene.stop('platformer');
  resize();
  game.scene.start('platformer', { level });
  transitionLandscape();
}

function showMainMenu() {
  byId('boss-hud').hidden = true;
  controls.clear();
  hideToast();
  if (pause.open) pause.close();
  if (clear.open) clear.close();
  if (victory.open) victory.close();
  game.scene.stop('platformer');
  setMode('menu');
  delete shell.dataset.theme;
  resize();
  game.scene.start('menu');
  transitionLandscape();
  byId('play-game').focus({ preventScroll: true });
}

function beginRequestedRun() {
  const { index, newAdventure } = requestedLevel;
  requestedLevel = undefined;
  if (newAdventure) progress.newAdventure();
  startRun(index);
}

function requestPlay(index, newAdventure = false) {
  if (!game.isBooted || !progress.canPlay(index)) return;
  requestedLevel = { index, newAdventure };
  if (levelDialog.open) levelDialog.close();
  if (preferences.tutorialSeen) beginRequestedRun();
  else openHelp('first-run');
}

function stopForDialog() {
  controls.clear();
  setMode('paused');
  game.scene.pause('platformer');
}

function resumeRun() {
  controls.clear();
  setMode('playing');
  game.scene.resume('platformer');
  focusStage();
}

function openHelp(purpose) {
  tutorialPurpose = purpose;
  if (purpose === 'run-controls') stopForDialog();
  tutorialDone.textContent = { 'first-run': 'Start Level', 'menu-controls': 'Back to Menu', 'run-controls': 'Back to Level', 'pause-controls': 'Back to Pause' }[purpose];
  help.showModal();
}

function closeDialog(dialog, confirm = false) {
  dialog.close();
  if (dialog === settings && settingsFromPause) {
    settingsFromPause = false;
    pause.showModal();
    byId('pause-settings').focus();
  }
  if (dialog === help && tutorialPurpose === 'pause-controls') {
    pause.showModal();
    byId('pause-controls').focus();
  }
  if (dialog === pause || (dialog === help && tutorialPurpose === 'run-controls')) resumeRun();
  if (dialog === help && tutorialPurpose === 'first-run') {
    if (confirm) {
      preferences.tutorialSeen = true;
      savePreferences();
      beginRequestedRun();
    } else {
      requestedLevel = undefined;
      byId('play-game').focus();
    }
  }
}

function openPause() {
  if (mode !== 'playing') return;
  stopForDialog();
  pause.showModal();
}

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(dialog));
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (dialog !== clear && dialog !== victory) closeDialog(dialog);
  });
}

updateLevelSelect();
byId('play-game').addEventListener('click', () => requestPlay(0, true));
levelButtons.forEach((button, index) => button.addEventListener('click', () => requestPlay(index)));
byId('level-select').addEventListener('click', () => {
  levelDialog.showModal();
  levelButtons[0].focus({ preventScroll: true });
});
byId('settings-button').addEventListener('click', () => settings.showModal());
byId('pause-settings').addEventListener('click', () => {
  settingsFromPause = true;
  pause.close();
  settings.showModal();
});
byId('pause-controls').addEventListener('click', () => {
  pause.close();
  openHelp('pause-controls');
});
helpButton.addEventListener('click', () => openHelp(mode === 'menu' ? 'menu-controls' : 'run-controls'));
tutorialDone.addEventListener('click', () => closeDialog(help, true));
byId('pause-button').addEventListener('click', openPause);
byId('restart-level').addEventListener('click', () => { pause.close(); startRun(currentLevel); });
byId('retry-checkpoint').addEventListener('click', () => {
  pause.close();
  resumeRun();
  scene.respawn('retry');
});
byId('play-again').addEventListener('click', () => { clear.close(); startRun(currentLevel); });
nextLevel.addEventListener('click', () => { clear.close(); startRun(currentLevel + 1); });
viewVictory.addEventListener('click', () => {
  const totals = progress.totals();
  byId('victory-coins').textContent = `${totals.coins} / ${maxCoins}`;
  byId('victory-time').textContent = formatTime(totals.elapsed);
  byId('victory-score').textContent = formatScore(totals.coins);
  byId('victory-deaths-stat').hidden = totals.deaths === null;
  byId('victory-deaths').textContent = totals.deaths ?? '';
  byId('victory-summary').textContent = `All ${LEVELS.length} levels complete.`;
  clear.close();
  victory.showModal();
  sound.play('victory');
});
byId('victory-replay').addEventListener('click', () => {
  victory.close();
  progress.newAdventure();
  startRun(0);
});
byId('pause-main').addEventListener('click', showMainMenu);
byId('clear-main').addEventListener('click', showMainMenu);
byId('victory-main').addEventListener('click', showMainMenu);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && !event.repeat && mode === 'playing') {
    event.preventDefault();
    openPause();
  }
  if (event.code === 'KeyR' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey
    && mode === 'playing' && document.activeElement === stage) {
    event.preventDefault();
    controls.clear();
    scene.respawn('retry');
  }
});

const panel = byId('touch-controls');
const hapticFeedback = setupTouchSettings(panel, preferences, savePreferences);
const controls = createControls(panel, () => mode === 'playing', hapticFeedback);
window.matchMedia('(orientation: portrait)').addEventListener('change', controls.clear);
document.addEventListener('fullscreenchange', controls.clear);
const maxCoins = LEVELS.reduce((sum, level) => sum + level.coins.length, 0);
const scene = new PlatformerScene(controls, {
  get reduceMotion() { return reduceMotion(); },
  get dangerGuides() { return dangerSetting.checked; },
  onPlayfieldPress: focusStage,
  onReady(coinTotal) {
    byId('coin-total').textContent = pad(coinTotal);
    showScore(0);
    showTime(0);
    setMode('playing');
    focusStage();
  },
  onScore: showScore,
  onTime: showTime,
  onCheckpoint() { showToast('Checkpoint reached', 'checkpoint'); },
  onRespawn(deaths, reason) {
    byId('deaths').textContent = deaths;
    showToast(reason === 'retry' ? 'Checkpoint restarted' : 'Back at the checkpoint', 'respawn');
  },
  playSound: (name) => sound.play(name),
  onBoss(boss, state) {
    const hud = byId('boss-hud');
    const meter = byId('boss-health');
    if (hud.hidden) {
      const name = boss.name ?? 'The Hollow Crown';
      byId('boss-name').textContent = name;
      meter.setAttribute('aria-label', `${name} health`);
      hud.hidden = false;
    }
    if (meter.max !== boss.maxHp) meter.max = boss.maxHp;
    if (meter.value !== boss.hp) meter.value = boss.hp;
    const phase = boss.phase === 'open' && boss.hits >= 2 ? 'guarded' : boss.phase;
    if (hud.dataset.phase !== phase) hud.dataset.phase = phase;
    if (byId('boss-state').textContent !== state) byId('boss-state').textContent = state;
  },
  onComplete(count, coinTotal, elapsed, deaths) {
    setMode('complete');
    controls.clear();
    hideToast();
    showTime(elapsed);
    sound.play('finish');
    const unlocked = progress.finish(currentLevel, count, elapsed, deaths);
    updateLevelSelect();
    const following = LEVELS[currentLevel + 1];
    const canViewVictory = !following && Boolean(progress.totals());
    const rating = ratingFor(count, coinTotal);
    const stars = byId('result-stars');
    stars.setAttribute('aria-label', `${rating} out of 3 stars`);
    [...stars.children].forEach((star, index) => star.classList.toggle('earned', index < rating));
    byId('rating-note').textContent = {
      1: 'Collect at least half the coins for a second star.',
      2: 'Collect every coin for three stars.',
      3: 'All coins collected!',
    }[rating];
    byId('result-coins').textContent = `${count} / ${coinTotal}`;
    byId('result-time').textContent = formatTime(elapsed);
    byId('result-score').textContent = formatScore(count);
    byId('result-deaths').textContent = deaths;
    byId('result-best').textContent = `Best time ${formatTime(progress.record(currentLevel).elapsed)}${deaths === 0 ? ' · No deaths' : ''}`;
    byId('result-level').textContent = LEVELS[currentLevel].name;
    byId('continue-note').textContent = unlocked ? `${following.name} unlocked` : '';
    byId('continue-note').hidden = !unlocked;
    nextLevel.hidden = !following;
    viewVictory.hidden = !canViewVictory;
    clear.showModal();
    if (following) nextLevel.focus();
    else if (canViewVictory) viewVictory.focus();
  },
});

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: gameMount,
  width: viewportWidth(),
  height: VIEW_HEIGHT,
  backgroundColor: '#72aac4',
  pixelArt: true,
  roundPixels: true,
  banner: false,
  audio: { noAudio: true },
  input: {
    // Phaser handles canvas interaction. The HTML controls retain browser pointer IDs.
    keyboard: false, activePointers: 2, touch: { capture: false },
    mouse: { preventDefaultDown: false, preventDefaultUp: false, preventDefaultMove: false, preventDefaultWheel: false },
  },
  scale: { mode: Phaser.Scale.NONE },
  physics: { default: 'arcade', arcade: { gravity: { y: 700 } } },
  scene: [new MenuScene(reduceMotion), scene],
});

new ResizeObserver(() => {
  if (game.isBooted) resize();
}).observe(gameMount);
