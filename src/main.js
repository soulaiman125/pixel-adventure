import Phaser from 'phaser';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/dm-sans/wght.css';
import { createControls } from './game/controls.js';
import { setupTouchSettings } from './game/touch-settings.js';
import { RUSH_LEVELS, canChallenge, challengeLevel, challenges, createChallengeRecords } from './game/challenges.js';
import { VIEW_HEIGHT } from './game/level-one.js';
import { LEVELS } from './game/levels.js';
import { MenuScene } from './game/menu-scene.js';
import { createProgress, ratingFor } from './game/progress.js';
import { createSound } from './game/sound.js';
import { PlatformerScene } from './game/platformer-scene.js';
import { SHADOW_ARENA } from './game/shadow-arena.js';
import { createShadowSkills } from './game/shadow-skills.js';
import { setupCombatSettings, setupSkillTree } from './game/shadow-ui.js';
import { cancelCharge } from './game/shadow-combat.js';
import { createUltimateProgress, FEATS } from './game/ultimate-progress.js';
import { SURVIVAL_LEVEL, ultimateLevel } from './game/ultimate-levels.js';
import { REALMS } from './game/legends-worlds.js';
import { createLegendsProgress } from './game/legends-progress.js';
import { HEROES } from './game/legends-heroes.js';
import { installLegendsUI } from './game/legends-ui.js';
import { NINJA_VILLAGE } from './game/ninja-village.js';
import './styles.css';

const byId = (id) => document.getElementById(id);
const shell = byId('shell');
const shadowAllowed = import.meta.env.DEV || import.meta.env.MODE === 'shadow';
const shadowChoice = shadowAllowed ? new URLSearchParams(location.search).get('shadow') ??
  (import.meta.env.MODE === 'shadow' ? 'verdant' : null) : null;
const shadowArena = import.meta.env.DEV && shadowChoice === 'arena';
const useShadowNinja = !(import.meta.env.DEV && new URLSearchParams(location.search).get('hero') === 'legacy');
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
const challengeDialog = byId('challenge-dialog');
const challengeMode = byId('challenge-mode');
const challengeStage = byId('challenge-stage');
const outfit = byId('hero-outfit');
const worlds = new Map([[0, 'Green Valley'], [4, 'Dangerous Canyon'], [8, 'Frozen Kingdom'],
  [12, 'Fire Kingdom'], [16, 'Dark Castle'], [20, 'Poison Jungle'], [25, 'Thunder Fortress'],
  ...REALMS.map((realm,index)=>[30+index*6,realm.name])]);
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
const legends = createLegendsProgress(localStorage,{levels:LEVELS,record:index=>progress.record(index)});
const challengeRecords = createChallengeRecords();
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
const ultimate = createUltimateProgress(localStorage);
const skills = createShadowSkills(shadowArena ? {getItem(){return null;},setItem(){}} : localStorage);
for(const [index, level] of LEVELS.entries()){
  if(progress.record(index)){
    skills.award('level-'+index);
    if(level.boss)skills.award('boss-'+index);
  }
}
let mode = 'menu';
let currentLevel = 0;
let runMode = 'normal';
let runHero = legends.kit();
let dailyRun=null;
let rematchDifficulty='veteran';
let villagePaused=false;
let bossMusic;
let rush = { time: 0, deaths: 0 };
let outfitKey = 'scout';
let requestedLevel;
let tutorialPurpose;
let toastTimeout;
let landscapeAnimation;
let settingsFromPause = false;
const shadowButton = shadowChoice && document.createElement('button');
const shadowDebug = shadowArena && document.createElement('output');
const shadowTouchButtons = [];
const combatClocks = new Map([...document.querySelectorAll('[data-clock]')].map(node=>[node.dataset.clock,node]));
const clockValues = new Map();
let nextClockPaint = 0;

if (shadowButton) {
  shadowButton.className = 'button shadow-entry';
  shadowButton.type = 'button';
  shadowButton.id = 'shadow-play';
  const index = Number(shadowChoice) - 1;
  const target = Number.isInteger(index) && LEVELS[index] ? index : 0;
  shadowButton.textContent = shadowArena ? 'Train as Shadow Ninja' : `Shadow Ninja · ${LEVELS[target].name}`;
  byId('play-game').after(shadowButton);
  shadowButton.addEventListener('click', () => {
    if (!game.isBooted) return;
    runMode = 'shadow';
    startRun(target);
  });
}
if (useShadowNinja) {
  for (const [action, label, display] of [
    ['dash','Shadow Dash','Dash'], ['throw','Shuriken','✦'], ['sprint','Shadow Sprint','Run'],
    ['cyclone','Blade Cyclone','Spin'], ['execution','Shadow Execution','Finish'], ['parry','Perfect Parry','Parry'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button touch-button shadow-touch';
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    button.textContent = display;
    button.hidden = true;
    document.querySelector('.touch-actions [data-action="attack"]').before(button);
    shadowTouchButtons.push(button);
  }
}
if (shadowDebug) {
  shadowDebug.id = 'shadow-debug';
  shadowDebug.className = 'shadow-debug';
  shadowDebug.hidden = true;
  stage.appendChild(shadowDebug);
}
const actionButtons = new Map(shadowTouchButtons.map(button=>[button.dataset.action,button]));
const clockLabels = {throw:'✦',dash:'»',charged:'刀',parry:'Q',cyclone:'V',execution:'F'};

function shadowHud(active) {
  byId('combat-hud').hidden = !active;
  byId('arena-hud').hidden = !active || runMode !== 'survival';
  nextClockPaint = 0;
  for (const button of shadowTouchButtons) button.hidden = !active;
  if (shadowDebug) shadowDebug.hidden = !active;
  byId('help-button').title = active ? 'Move A/D · Jump Space · Katana X · Shuriken C · Dash Z · Sprint Shift · Cyclone V · Execution F · Parry Q' : '';
  const hints = byId('keyboard-hints');
  hints.querySelector('.shadow-hints')?.remove();
  if (active) {
    const details = document.createElement('span');
    details.className = 'shadow-hints';
    details.innerHTML = '<kbd>C</kbd> Shuriken <kbd>Z</kbd> Dash <kbd>⇧</kbd> Sprint <kbd>V</kbd> Cyclone <kbd>F</kbd> Execute <kbd>Q</kbd> Parry';
    hints.append(details);
  }
}

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

function preciseTime(milliseconds) {
  return `${formatTime(milliseconds)}.${String(Math.floor(milliseconds) % 1000).padStart(3, '0')}`;
}

function refreshOutfits() {
  const choices = [
    ['scout', 'Scout', true],
    ['ember', 'Ember · Clear Hardcore', challengeRecords.count('hardcore') > 0],
    ['frost', 'Frost · Clear No-Death', challengeRecords.count('flawless') > 0],
    ['storm', 'Storm · Clear Nightmare or Boss Rush', challengeRecords.count('nightmare') + challengeRecords.count('rush') > 0],
    ['jade', 'Jade · Discover the Hidden Grove', ultimate.has('grove')],
    ['plum', 'Plum · Discover the High Shrine', ultimate.has('shrine')],
    ['dawn', 'Dawn · Clear six Survival waves', ultimate.has('arena')],
    ['silver', 'Silver · Land a Parry counter in a clear', ultimate.has('parry')],
  ];
  outfit.replaceChildren(...choices.map(([key, name, open]) => {
    const option = new Option(name, key);
    option.disabled = !open;
    return option;
  }));
  outfitKey = choices.some(([key, , open]) => open && key === preferences.outfit) ? preferences.outfit : 'scout';
  outfit.value = outfitKey;
}

function showChallengeRecord() {
  const id = challengeMode.value;
  const index = id === 'rush' ? RUSH_LEVELS[0] : Number(challengeStage.value);
  const record = challengeRecords.get(id, index);
  const eligible = challengeStage.options.length > 0 || (id === 'rush' && canChallenge(id, index, progress));
  byId('challenge-start').disabled = !eligible;
  byId('challenge-record').textContent = record
    ? `Best ${preciseTime(record.time)} · ${record.deaths} deaths${record.clean ? ' · Flawless badge' : ''}`
    : eligible ? '' : id === 'rush' ? 'Clear all three campaign bosses to unlock.'
      : id === 'nightmare' ? 'Clear The Hollow Crown in Normal to unlock.'
        : 'Clear a stage in Normal to unlock this challenge.';
}

function refreshChallengeStages() {
  const id = challengeMode.value;
  const previous = challengeStage.value;
  byId('challenge-stage-row').hidden = id === 'rush';
  byId('challenge-rules').textContent = challenges[id].rules;
  challengeStage.replaceChildren(...LEVELS.flatMap((level, index) =>
    id !== 'rush' && canChallenge(id, index, progress) ? [new Option(`${index + 1} · ${level.name}`, index)] : []));
  if ([...challengeStage.options].some(option => option.value === previous)) challengeStage.value = previous;
  showChallengeRecord();
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
  const track = mode === 'menu' ? 'verdant' : mode === 'playing' ? bossMusic ?? scene.level.realm ?? scene.level.theme : undefined;
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
      const rank = ultimate.rank(index);
      if (rank) label.textContent += ` · Rank ${rank.rank}`;
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
  byId('village-interact').hidden=true;
  villagePaused=false;
  bossMusic = undefined;
  currentLevel = index;
  const shadow = useShadowNinja;
  runHero=legends.kit(legends.selected,!['normal','dojo','ng','shadow'].includes(runMode));
  combatClocks.get('throw').title=runHero.abilities[2];
  combatClocks.get('cyclone').title=runHero.abilities[4];
  combatClocks.get('execution').title=runHero.ultimate;
  actionButtons.get('throw')?.setAttribute('aria-label',runHero.abilities[2]);
  actionButtons.get('cyclone')?.setAttribute('aria-label',runHero.abilities[4]);
  actionButtons.get('execution')?.setAttribute('aria-label',runHero.ultimate);
  const original=LEVELS[index];
  const level = runMode === 'village' ? NINJA_VILLAGE : runMode === 'survival' ? SURVIVAL_LEVEL :
    runMode==='dojo'||shadowArena&&runMode==='shadow' ? SHADOW_ARENA :
    runMode==='rematch' ? {...challengeLevel(original,'rush'),story:undefined,water:[],secret:undefined,
      script:{bossPace:rematchDifficulty==='master'?.82:1}} :
    ultimateLevel(challengeLevel(original,runMode==='ng'?'nightmare':runMode),index);
  shadowHud(shadow);
  shell.dataset.hero = shadow ? 'shadow' : 'legacy';
  shell.dataset.legend=runHero.id;
  if (shadow) byId('pause-level').dataset.shadow = `X ${runHero.abilities[0]} · C ${runHero.abilities[2]} · Z ${runHero.abilities[3]} · Shift Sprint · V ${runHero.abilities[4]} · F ${runHero.ultimate} · Q Parry`;
  else delete byId('pause-level').dataset.shadow;
  shell.dataset.mode = runMode;
  shell.dataset.theme = level.theme;
  byId('hud-level-number').textContent = runMode === 'survival' ? '∞' : runMode==='village'?'村':pad(index + 1);
  byId('hud-level-name').textContent = level.name;
  byId('retry-checkpoint').textContent = runMode === 'survival' ? 'End Survival Run' : 'Retry Checkpoint';
  byId('pause-level').textContent = (challenges[runMode]?.name??({survival:'Survival',village:'Ninja Village',dojo:'Dojo',daily:'Daily',rematch:'Rematch',ng:'New Game+'})[runMode]
    ?? (runMode==='normal'?'Level '+(index+1):runHero.name))+' · '+level.name;
  showScore(0);
  showTime(0);
  byId('deaths').textContent = '0';
  controls.clear();
  hideToast();
  setMode('loading');
  game.scene.stop('menu');
  game.scene.stop('platformer');
  resize();
  game.scene.start('platformer', { level, shadow, hero:runHero });
  transitionLandscape();
}

function showMainMenu() {
  byId('boss-hud').hidden = true;
  controls.clear();
  byId('village-interact').hidden=true;
  hideToast();
  if (pause.open) pause.close();
  if (clear.open) clear.close();
  if (victory.open) victory.close();
  game.scene.stop('platformer');
  setMode('menu');
  delete shell.dataset.theme;
  delete shell.dataset.mode;
  delete shell.dataset.hero;
  shadowHud(false);
  resize();
  game.scene.start('menu');
  transitionLandscape();
  byId('play-game').focus({ preventScroll: true });
}

function beginRequestedRun() {
  const { index, newAdventure, challenge } = requestedLevel;
  requestedLevel = undefined;
  runMode = challenge;
  dailyRun=null;
  rush = { time: 0, deaths: 0 };
  if (newAdventure) progress.newAdventure();
  startRun(index);
}

function requestPlay(index, newAdventure = false, challenge = 'normal') {
  const accessible = challenge === 'normal' ? progress.canPlay(index) : canChallenge(challenge, index, progress);
  if (!game.isBooted || !accessible) return;
  requestedLevel = { index, newAdventure, challenge };
  if (levelDialog.open) levelDialog.close();
  if (challengeDialog.open) challengeDialog.close();
  if (preferences.tutorialSeen) beginRequestedRun();
  else openHelp('first-run');
}

function stopForDialog() {
  cancelCharge(scene);
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
refreshOutfits();
for (const [key, { name }] of Object.entries(challenges)) challengeMode.add(new Option(name, key));
byId('challenge-button').addEventListener('click', () => { refreshChallengeStages(); challengeDialog.showModal(); });
byId('survival-button').addEventListener('click', () => {
  if (!game.isBooted || !useShadowNinja) return;
  runMode = 'survival';
  dailyRun=null;
  startRun(0);
});
byId('combat-awards').addEventListener('click', () => {
  const best = ultimate.bestArena();
  byId('arena-best').textContent = `Survival best · ${best.wave} waves · ${best.score} points`;
  byId('combat-feats').replaceChildren(...Object.entries(FEATS).map(([id,[name,detail]]) => {
    const li = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = `${ultimate.has(id) ? '✓ ' : ''}${name}`;
    const description = document.createElement('span');
    description.textContent = detail;
    li.append(title,description);
    return li;
  }));
  byId('awards-dialog').showModal();
});
challengeMode.addEventListener('change', refreshChallengeStages);
challengeStage.addEventListener('change', showChallengeRecord);
byId('challenge-start').addEventListener('click', () => {
  const id = challengeMode.value;
  requestPlay(id === 'rush' ? RUSH_LEVELS[0] : Number(challengeStage.value), false, id);
});
outfit.addEventListener('change', () => {
  if (outfit.selectedOptions[0]?.disabled) return;
  preferences.outfit = outfit.value;
  outfitKey = outfit.value;
  savePreferences();
});
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
function restartRun() {
  if (runMode === 'rush') {
    rush = { time: 0, deaths: 0 };
    startRun(RUSH_LEVELS[0]);
  } else startRun(currentLevel);
}
byId('restart-level').addEventListener('click', () => { pause.close(); restartRun(); });
byId('retry-checkpoint').addEventListener('click', () => {
  pause.close();
  resumeRun();
  scene.respawn('retry');
});
byId('play-again').addEventListener('click', () => { clear.close(); restartRun(); });
nextLevel.addEventListener('click', () => {
  clear.close();
  startRun(runMode === 'rush' ? RUSH_LEVELS[RUSH_LEVELS.indexOf(currentLevel) + 1] : currentLevel + 1);
});
viewVictory.addEventListener('click', () => {
  const totals = progress.totals();
  byId('victory-coins').textContent = `${totals.coins} / ${maxCoins}`;
  byId('victory-time').textContent = formatTime(totals.elapsed);
  byId('victory-score').textContent = formatScore(totals.coins);
  byId('victory-deaths-stat').hidden = totals.deaths === null;
  byId('victory-deaths').textContent = totals.deaths ?? '';
  byId('victory-summary').textContent = `All ${LEVELS.length} levels complete.`;
  byId('ending-story').textContent='The eclipse breaks. Twelve lanterns relight in Ninja Village, one for each realm. New Game+ and guardian rematches await in the Hall of Legends.';
  clear.close();
  victory.showModal();
  sound.play('victory');
});
byId('victory-replay').addEventListener('click', () => {
  victory.close();
  runMode = 'normal';
  dailyRun=null;
  progress.newAdventure();
  startRun(0);
});
byId('pause-main').addEventListener('click', showMainMenu);
byId('clear-main').addEventListener('click', showMainMenu);
byId('victory-main').addEventListener('click', showMainMenu);
byId('victory-village').addEventListener('click',()=>{victory.close();runMode='village';dailyRun=null;startRun(0);});
window.addEventListener('keydown', (event) => {
  if (controls.keyFor('pause').includes(event.code) && !event.repeat && mode === 'playing'
    && !event.ctrlKey&&!event.metaKey&&!event.altKey) {
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
const controls = createControls(panel, () => mode === 'playing', hapticFeedback, () => useShadowNinja, preferences);
setupCombatSettings(preferences,savePreferences,controls.clear);
setupSkillTree(skills,shadowArena);
window.matchMedia('(orientation: portrait)').addEventListener('change', controls.clear);
document.addEventListener('fullscreenchange', controls.clear);
const maxCoins = LEVELS.reduce((sum, level) => sum + level.coins.length, 0);
function expansionResult(title,note,coins,total,elapsed,deaths,advance=false){
  byId('clear-title').textContent=title;
  byId('result-level').textContent=scene.level.name;
  byId('result-stars').hidden=true;
  byId('rating-note').textContent=note;
  byId('result-coins').textContent=`${coins} / ${total}`;
  byId('result-time').textContent=preciseTime(elapsed);
  byId('result-score').textContent=formatScore(coins);
  byId('result-deaths').textContent=deaths;
  byId('result-best').textContent='';
  byId('continue-note').hidden=true;
  nextLevel.hidden=!advance;viewVictory.hidden=true;
  clear.showModal();
}
function showChallengeResult(coins, coinTotal, elapsed, deaths, success = true) {
  const isRush = runMode === 'rush';
  const nextArena = isRush && currentLevel !== RUSH_LEVELS.at(-1);
  if (isRush && success) {
    rush.time += elapsed;
    rush.deaths += deaths;
    elapsed = rush.time;
    deaths = rush.deaths;
  }
  const record = success && !nextArena
    ? challengeRecords.record(runMode, isRush ? RUSH_LEVELS[0] : currentLevel, elapsed, deaths) : null;
  if(success&&!nextArena)skills.award('challenge-'+runMode);
  const newOutfit = [...outfit.options].find(option => option.disabled && (
    option.value === 'ember' && runMode === 'hardcore' ||
    option.value === 'frost' && runMode === 'flawless' ||
    option.value === 'storm' && ['nightmare', 'rush'].includes(runMode)
  ));
  refreshOutfits();
  byId('clear-title').textContent = success ? (nextArena ? 'Boss Defeated' : 'Challenge Complete') : 'Attempt Ended';
  byId('result-level').textContent = `${challenges[runMode].name} · ${LEVELS[currentLevel].name}`;
  byId('result-stars').hidden = true;
  byId('rating-note').textContent = success ? nextArena ? 'Time and deaths carry into the next arena.'
    : record?.better ? 'New personal best' : '' : 'A no-death clear ends on the first death.';
  byId('result-coins').textContent = `${coins} / ${coinTotal}`;
  byId('result-time').textContent = preciseTime(elapsed);
  byId('result-score').textContent = formatScore(coins);
  byId('result-deaths').textContent = deaths;
  byId('result-best').textContent = record ? `Best ${preciseTime(record.time)}${record.clean ? ' · Flawless badge' : ''}` : '';
  byId('continue-note').hidden = !record || !newOutfit;
  byId('continue-note').textContent = record && newOutfit ? `${newOutfit.textContent.split(' · ')[0]} outfit unlocked` : '';
  viewVictory.hidden = true;
  nextLevel.hidden = !nextArena;
  clear.showModal();
  if (nextArena) nextLevel.focus();
}

const scene = new PlatformerScene(controls, {
  shadowTier: action => runHero.id==='shadow'&&['normal','shadow','dojo','ng'].includes(runMode) ? skills.tier(action) : 0,
  get reduceMotion() { return reduceMotion(); },
  get dangerGuides() { return dangerSetting.checked; },
  get costume() { return runHero.id==='shadow'?outfitKey:legends.profile(runHero.id).cosmetic; },
  onPlayfieldPress: focusStage,
  onPause() { if (mode === 'playing') { openPause(); return true; } return false; },
  onReady(coinTotal) {
    byId('coin-total').textContent = pad(coinTotal);
    showScore(0);
    showTime(0);
    if (runMode !== 'survival') this.onSurvival({health:1});
    if (useShadowNinja) this.onShadowAvailability(scene.ninja,0);
    if (shadowDebug && runMode === 'shadow') shadowDebug.dataset.dummy = '40/40';
    setMode('playing');
    focusStage();
    if(scene.level.story && runMode==='normal')showToast(scene.level.story,'checkpoint');
  },
  onVillageNear(station){
    const button=byId('village-interact');button.hidden=!station;
    if(station)button.textContent=station.name+' · Talk';
  },
  onScore: showScore,
  onTime: showTime,
  onShadowFeedback(message) { showToast(message,'checkpoint'); },
  onShadowAvailability(state,time) {
    if (!state || time < nextClockPaint) return;
    nextClockPaint = time + 80;
    const grounded = scene.animationState.grounded;
    for (const [action,node] of combatClocks) {
      const wait = (action === 'dash' ? grounded ? state.groundDashAt : 0 : state.readyAt[action] ?? 0) - time;
      const remaining = action === 'dash' && !grounded && state.airUsed ? 'air' : wait > 0 ? (Math.ceil(wait/100)/10).toFixed(1) : '';
      if (clockValues.get(action) === remaining) continue;
      clockValues.set(action,remaining);
      node.textContent = remaining === 'air' ? 'Land' : remaining ? `${clockLabels[action]} ${remaining}` : clockLabels[action];
      node.classList.toggle('cooling',Boolean(remaining));
      const button = actionButtons.get(action);
      if (button) button.dataset.unready = String(Boolean(remaining));
    }
    const tally = scene.runTally;
    const combo = tally && time-tally.lastHit < 4000 && tally.chain > 1 ? `${tally.chain} hits` : '';
    if (byId('combo-count').textContent !== combo) byId('combo-count').textContent = combo;
  },
  onSurvival(run,message) {
    const heart = byId('player-health');
    heart.textContent = '♥'.repeat(run.health) || '♡';
    heart.setAttribute('aria-label',`Health ${run.health} of ${runMode === 'survival' ? 3 : 1}`);
    if (runMode !== 'survival') return;
    if (message) byId('arena-wave').textContent = message;
    byId('arena-score').textContent = `${run.score} points`;
    if (message?.includes('cleared')) {
      ultimate.arena(run.wave,run.score);
      legends.survival(runHero.id,run.wave,run.score);
      if(dailyRun?.kind==='arena'&&legends.finishDaily(runHero.id,dailyRun,run))showToast('Daily Challenge completed','checkpoint');
      if (ultimate.has('arena')) skills.award('survival-six');
    }
  },
  onSecret(secret) {
    if (runMode !== 'normal' && runMode !== 'shadow') return;
    if (runMode === 'normal') {
      legends.visitSecret(runHero.id,secret.id);
      if(ultimate.award(secret.id)){skills.award('secret-'+secret.id);refreshOutfits();}
    }
    showToast(secret.id === 'grove' ? 'Hidden Grove found' : secret.id==='shrine'?'High Shrine found':'Hidden realm cache found','checkpoint');
  },
  onShadowDummy: shadowDebug ? (hp, max) => { shadowDebug.dataset.dummy = `${hp}/${max}`; } : undefined,
  onShadowStatus: shadowDebug ? (pose, state) => {
    const attack = state.attack;
    const line = `${pose} · ${attack ? `Katana ${attack.index + 1} · ${Math.round(scene.elapsed - attack.since)} ms` :
      state.dash ? `Dash · ${Math.round(scene.elapsed - state.dash.since)} ms` : 'Air Dash ' + (state.airUsed ? 'spent' : 'ready')}` +
      ` · ${Math.round(Math.abs(scene.player.body.velocity.x))} px/s · ${Math.round(game.loop.actualFps)} FPS / ${game.loop.delta.toFixed(1)} ms` +
      ` · ${state.special?.kind ?? (state.sprint ? 'Sprint' : 'Ready')} · ${scene.animationState.grounded ? 'Grounded' : 'Airborne'}` +
      (state.lastHit && scene.elapsed - state.lastHit.time < 650 ? ` · ${state.lastHit.heavy ? 'Heavy impact' : 'Impact'} at ${Math.round(state.lastHit.x)}` : '') +
      (shadowDebug.dataset.dummy ? ' · Dummy ' + shadowDebug.dataset.dummy : '');
    if (shadowDebug.textContent !== line) shadowDebug.textContent = line;
  } : undefined,
  onCheckpoint() { showToast('Checkpoint reached', 'checkpoint'); },
  onRespawn(deaths, reason) {
    byId('deaths').textContent = deaths;
    if (runMode === 'survival') {
      const { run } = scene.survival;
      ultimate.arena(scene.survival.cleared(),run.score);
      if (ultimate.has('arena')) skills.award('survival-six');
      refreshOutfits();
      setMode('complete');
      controls.clear();
      game.scene.pause('platformer');
      byId('clear-title').textContent = 'Survival Complete';
      byId('result-level').textContent = scene.level.name;
      byId('result-stars').hidden = true;
      byId('result-coins').textContent = '0 / 0';
      byId('result-time').textContent = preciseTime(scene.elapsed);
      byId('result-score').textContent = run.score;
      byId('result-deaths').textContent = deaths;
      byId('rating-note').textContent = `${scene.survival.cleared()} waves cleared`;
      byId('result-best').textContent = `Best ${ultimate.bestArena().wave} waves · ${ultimate.bestArena().score} points`;
      byId('continue-note').hidden = true;
      nextLevel.hidden = true;
      viewVictory.hidden = true;
      clear.showModal();
      return;
    }
    if (runMode === 'flawless') {
      setMode('complete');
      controls.clear();
      game.scene.pause('platformer');
      sound.play('respawn');
      showChallengeResult(scene.collected, scene.level.coins.length, scene.elapsed, deaths, false);
      return;
    }
    showToast(reason === 'retry' ? 'Checkpoint restarted' : 'Back at the checkpoint', 'respawn');
  },
  playSound: (name) => sound.play(name),
  onBoss(boss, state) {
    const track = boss.phase === 'waiting' || boss.phase === 'defeated' ? undefined : boss.tier === 2
      ? 'bossFinal' : { crown: 'bossCrown', queen: 'bossQueen', titan: 'bossTitan',phantom:'bossCrown',abyss:'bossQueen',dragon:'bossTitan',cyber:'bossTitan',emperor:'bossFinal' }[boss.kind];
    if (track !== bossMusic) {
      bossMusic = track;
      syncMusic();
    }
    const hud = byId('boss-hud');
    const forged=boss.kind==='titan';
    if(forged) {
      hud.dataset.boss='titan';
      hud.dataset.tier=String((boss.tier??0)+1);
    }else if(hud.dataset.boss) {
      delete hud.dataset.boss;
      delete hud.dataset.tier;
    }
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
    const label = useShadowNinja && (phase === 'warn' || phase === 'attack') ? state + ' · Guarded' : state;
    if (byId('boss-state').textContent !== label) byId('boss-state').textContent = label;
  },
  onComplete(count, coinTotal, elapsed, deaths) {
    setMode('complete');
    controls.clear();
    hideToast();
    showTime(elapsed);
    sound.play('finish');
    if(runMode==='rematch'){
      const best=legends.rematch(runHero.id,currentLevel,rematchDifficulty,elapsed);
      expansionResult('Guardian Defeated',rematchDifficulty+' · Best '+preciseTime(best),count,coinTotal,elapsed,deaths);
      return;
    }
    if(runMode==='daily'){
      const passed=legends.finishDaily(runHero.id,dailyRun,{...scene.runTally,elapsed,deaths});
      expansionResult(passed?'Daily Challenge Complete':'Daily Attempt Ended',dailyRun.label,count,coinTotal,elapsed,deaths);
      return;
    }
    if(runMode==='ng'){
      legends.finishCycle(runHero.id,currentLevel,elapsed);
      expansionResult(currentLevel===LEVELS.length-1?'Cycle Complete':'New Game+ Clear','Cycle '+legends.ng.cycle+' · Separate record',
        count,coinTotal,elapsed,deaths,currentLevel<LEVELS.length-1);
      return;
    }
    if (runMode === 'shadow' || runMode==='dojo') {
      byId('clear-title').textContent = 'Prototype Complete';
      byId('result-level').textContent = scene.level.name;
      byId('result-stars').hidden = true;
      byId('result-coins').textContent = `${count} / ${coinTotal}`;
      byId('result-time').textContent = preciseTime(elapsed);
      byId('result-score').textContent = formatScore(count);
      byId('result-deaths').textContent = deaths;
      byId('result-best').textContent = '';
      byId('rating-note').textContent = '';
      byId('continue-note').hidden = true;
      nextLevel.hidden = true;
      viewVictory.hidden = true;
      clear.showModal();
      return;
    }
    if (runMode !== 'normal') {
      showChallengeResult(count, coinTotal, elapsed, deaths);
      return;
    }
    byId('clear-title').textContent = 'Level Complete!';
    byId('result-stars').hidden = false;
    const unlocked = progress.finish(currentLevel, count, elapsed, deaths);
    legends.campaign(runHero.id,currentLevel,count,elapsed,scene.runTally,scene.boss);
    const rank = ultimate.finish(currentLevel,scene.level,{...scene.runTally,elapsed,deaths,coins:count,total:coinTotal},scene.ninja?.uses);
    refreshOutfits();
    skills.award('level-'+currentLevel);
    if(LEVELS[currentLevel].boss)skills.award('boss-'+currentLevel);
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
    byId('result-best').textContent = `Rank ${rank.rank} · ${rank.score}/100 · Par ${formatTime(rank.par)} · Best ${ultimate.rank(currentLevel).rank} · ${scene.runTally.damage} hits taken`;
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
  // Offline Electron allows local image sources while blocking XHR and fetch.
  loader: { imageLoadType: 'HTMLImageElement' },
  input: {
    // Phaser handles canvas interaction. The HTML controls retain browser pointer IDs.
    keyboard: false, activePointers: 2, touch: { capture: false },
    mouse: { preventDefaultDown: false, preventDefaultUp: false, preventDefaultMove: false, preventDefaultWheel: false },
  },
  scale: { mode: Phaser.Scale.NONE },
  physics: { default: 'arcade', arcade: { gravity: { y: 700 } } },
  scene: [new MenuScene(reduceMotion), scene],
});

const legendsUI=installLegendsUI({store:legends,levels:LEVELS,progress,game,reduceMotion,
  actions:{
    canSelect:()=>mode==='menu'||mode==='complete'||runMode==='village',
    selection:()=>{byId('legends-button').title='Selected · '+HEROES[legends.selected].name;},
    pauseVillage(){
      if(runMode==='village'&&mode==='playing'){villagePaused=true;stopForDialog();}
    },
    resumeVillage(){
      if(villagePaused&&runMode==='village'&&mode==='paused'){villagePaused=false;resumeRun();}
    },
    shadowSkills:()=>byId('skill-tree').click(),
    village(){runMode='village';dailyRun=null;startRun(0);},
    dojo(){runMode='dojo';dailyRun=null;startRun(0);},
    worlds(){if(mode!=='menu')showMainMenu();byId('level-select').click();},
    rematch(stage,difficulty){runMode='rematch';dailyRun=null;rematchDifficulty=difficulty;startRun(stage);},
    ng(){if(legends.beginCycle()){runMode='ng';dailyRun=null;startRun(legends.ng.frontier-1);}},
    daily(challenge,stage){dailyRun=challenge;runMode=challenge.kind==='arena'?'survival':'daily';startRun(stage);},
  },
});
byId('legends-button').addEventListener('click',()=>legendsUI.open());
for(const button of document.querySelectorAll('[data-legends-heroes]'))button.addEventListener('click',()=>legendsUI.open('heroes'));
function interactVillage(){
  if(mode!=='playing'||runMode!=='village'||!scene.villageStation)return;
  const {id,npc,line}=scene.villageStation;
  if(id==='worlds'){showMainMenu();byId('level-select').click();}
  else if(id==='dojo'){runMode='dojo';startRun(0);}
  else legendsUI.open(id);
  showToast(npc+' · '+line,'checkpoint');
}
byId('village-interact').addEventListener('click',interactVillage);
window.addEventListener('keydown',event=>{if(event.code==='KeyE'&&!event.repeat)interactVillage();});

new ResizeObserver(() => {
  if (game.isBooted) resize();
}).observe(gameMount);
