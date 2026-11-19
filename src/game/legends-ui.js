import { HEROES, HERO_UPGRADES } from './legends-heroes.js';
import { dailyFor, mastery, QUESTS } from './legends-progress.js';
import { VILLAGE_STATIONS } from './ninja-village.js';
import { showPortrait } from '../ui/portrait.js';

const beats = [
  ['The first shadow','A red ring settles over the moon. In the village, every lantern goes dark except one.'],
  ['Five travelers','Kaito, Akari, Yuki, Raiden, and Mori answer the last lantern. Each carries a weapon and a reason to cross the twelve realms.'],
  ['The twelve seals','The Eclipse Emperor has bound the realms to his shadow. Follow the waystones. Break his seals and bring the dawn back.'],
];

function text(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

function button(label, action, { disabled = false, primary = false, key = label } = {}) {
  const element = text('button', label, primary ? 'button button-primary' : 'button');
  element.type = 'button';
  element.disabled = disabled;
  element.dataset.panelAction = key;
  element.addEventListener('click', action);
  return element;
}

function canvas(label) {
  const view = document.createElement('canvas');
  view.width = 112;
  view.height = 80;
  if (label) {
    view.setAttribute('role', 'img');
    view.setAttribute('aria-label', label);
  } else view.setAttribute('aria-hidden', 'true');
  return view;
}

function bar(className, ...children) {
  const row = document.createElement('div');
  row.className = className;
  row.append(...children);
  return row;
}

function item(title, description, detail) {
  const card = text('article', '', 'rpg-item');
  card.append(text('h3', title), text('p', description));
  if (detail) card.append(text('small', detail, 'item-state'));
  return card;
}

export function installLegendsUI({ store, levels, progress, game, actions, reduceMotion, navigation }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'legends-dialog';
  dialog.setAttribute('aria-labelledby','legends-title');
  dialog.innerHTML = '<div class="dialog-body"><button class="button dialog-close" type="button" aria-label="Close Legends">Close</button><h2 id="legends-title"></h2><div id="legends-content"></div><p class="panel-feedback" role="status"></p></div>';
  document.body.append(dialog);
  const title = dialog.querySelector('h2');
  const body = dialog.querySelector('#legends-content');
  const feedback = dialog.querySelector('[role="status"]');
  const stack = [];
  let selected = store.selected;
  let current, stopPortrait;
  let chapter = 0;

  function section(name, className = '') {
    stopPortrait?.();
    title.textContent = name;
    body.replaceChildren();
    body.className = className;
    feedback.textContent = '';
  }
  function portrait(view, id, animated = false) {
    const stop = showPortrait(view, game.textures, store.kit(id), store.profile(id).cosmetic, {
      animated, active: () => !animated || dialog.open && view.isConnected, motion: () => !reduceMotion() && navigation.top() === dialog,
    });
    if (animated) stopPortrait = stop;
  }
  function focus(key, scroll) {
    if (scroll !== undefined) dialog.scrollTop = scroll;
    const target = key && body.querySelector('[data-panel-action="' + CSS.escape(key) + '"]:not(:disabled),[data-panel-status="' + CSS.escape(key) + '"]');
    (target || title).focus({ preventScroll: scroll !== undefined });
  }
  function go(view) {
    stack.push({ view: current, key: document.activeElement.dataset.panelAction, scroll: dialog.scrollTop });
    current = view;
    view();
    focus(undefined, 0);
  }
  function back() {
    const previous = stack.pop();
    if (!previous) { navigation.back(); return; }
    current = previous.view;
    current();
    focus(previous.key, previous.scroll);
  }
  dialog.querySelector('button').addEventListener('click', () => navigation.back());
  dialog.addEventListener('close', () => { if (!dialog.open) stopPortrait?.(); });
  function backButton(label = 'Back') {
    const control = button(label, back, { key: 'back' });
    control.dataset.backAction = '';
    return control;
  }
  function rerender(key, message, fallback) {
    const scroll = dialog.scrollTop;
    current();
    const focusKey = body.querySelector('[data-panel-action="' + CSS.escape(key) + '"]:not(:disabled)') ? key : fallback;
    focus(focusKey, scroll);
    feedback.textContent = message;
  }
  const invalid = 'This action is no longer available. Review the current balance or requirements.';

  function heroes() {
    section('Choose a Hero', 'hero-panel');
    const hero = HEROES[selected];
    const profile = store.profile(selected);
    const applied = selected === store.selected;
    const cards = bar('legend-portraits');
    for (const candidate of Object.values(HEROES)) {
      const choice = button(candidate.name, () => {
        selected = candidate.id;
        rerender('hero-' + selected, heroFeedback());
      }, { key: 'hero-' + candidate.id });
      const icon = canvas();
      choice.prepend(icon);
      choice.setAttribute('aria-pressed', String(candidate.id === selected));
      if (candidate.id === store.selected) choice.dataset.equipped = '';
      choice.dataset.legendHero = candidate.id;
      cards.append(choice);
      portrait(icon, candidate.id);
    }
    body.append(cards);
    const select = button(applied ? 'Selected · ' + hero.name : 'Select ' + hero.name, () => {
      if (!actions.canSelect()) return;
      store.select(selected);
      actions.selection();
      rerender('equip-hero', hero.name + ' equipped for the next run.');
    }, { primary: true, key: 'equip-hero' });
    select.id = 'legend-select';
    body.append(bar('hero-select-rail', text('span', 'Equipped · ' + HEROES[store.selected].name), select));
    const figure = text('figure', '', 'character-frame');
    figure.style.setProperty('--hero-accent', hero.colors[3]);
    const view = canvas(hero.name + ' animated pixel art');
    figure.append(view);
    const detail = text('div', '', 'character-details');
    detail.append(text('h3', hero.name), text('p', hero.role + ' · ' + store.kit(selected).playWeapon, 'hero-role'));
    detail.append(text('p', hero.bio), text('p', 'Mastery ' + mastery(profile.xp) + ' · ' + profile.xp + ' XP', 'item-state'));
    const meters = bar('legend-meters');
    for (const [index, label] of ['Speed','Damage','Defense','Range'].entries()) {
      const metric = document.createElement('meter');
      metric.max = 5;
      metric.value = hero.stats[index];
      metric.setAttribute('aria-label', label);
      const line = text('span', label);
      line.append(metric);
      meters.append(line);
    }
    detail.append(meters, text('p', hero.abilities.join(' · ')), text('p', 'Ultimate · ' + hero.ultimate, 'item-state'));
    body.append(bar('legend-profile', figure, detail),
      bar('legend-nav', button('Skill Tree', () => go(skills)), button('Inventory', () => go(inventory)),
        button('Hero Mastery', () => go(masteryPanel)), button('Cosmetics', () => go(outfits)), backButton()));
    portrait(view, selected, true);
  }
  function heroFeedback() { return HEROES[selected].name + ' preview.'; }

  function skills() {
    section(HEROES[selected].name + ' Skill Tree');
    if (selected === 'shadow') {
      body.append(text('p','18 upgrades across six tracks.'), bar('legend-nav',
        button('Open Shadow Skill Tree', actions.shadowSkills, { primary: true }), backButton()));
      return;
    }
    const id = selected;
    const profile = store.profile(id);
    body.append(text('p', profile.points + ' Skill Points', 'balance'));
    const grid = bar('skill-grid');
    for (const [branch, nodes] of Object.entries(HERO_UPGRADES[id])) {
      const column = text('section', '', 'skill-card');
      column.append(text('h3', branch[0].toUpperCase() + branch.slice(1)));
      for (const node of nodes) {
        const bought = profile.upgrades.includes(node.id);
        const valid = store.nodeAvailable(id, node);
        const review = () => actions.confirm({
          title: 'Learn ' + node.name + '?',
          message: node.detail + ' · Costs ' + node.cost + ' skill point' + (node.cost === 1 ? '.' : 's.'),
          label: 'Learn Upgrade',
        }, () => {
          const learned = store.purchase(id, node.id);
          rerender(node.id, learned ? node.name + ' learned. ' + store.profile(id).points + ' points left.' : invalid,
            'learned-' + node.id);
        });
        const control = button(node.name + (bought ? ' · Learned' : ' · ' + node.cost), review,
          { disabled: !valid, key: node.id });
        control.dataset.heroNode = node.id;
        const availableText = bought ? 'Learned' : valid ? 'Available' :
          node.previous && !profile.upgrades.includes(node.previous) ? 'Learn the previous upgrade first' : 'More points required';
        const entry = text('div', '', 'skill-node');
        entry.tabIndex = -1;
        entry.dataset.panelStatus = 'learned-' + node.id;
        entry.append(control, text('small', node.detail), text('small', availableText, 'item-state'));
        column.append(entry);
      }
      grid.append(column);
    }
    body.append(grid, backButton('Back to Heroes'));
  }

  function inventory() {
    const hero = HEROES[selected];
    const profile = store.profile(selected);
    section('Inventory');
    body.append(text('p', hero.name + ' · ' + store.coins + ' Coins', 'balance'),
      bar('inventory-grid',
        item(hero.weapon, 'Standard weapon style', profile.weapon === 'standard' ? 'Equipped' : 'Owned'),
        item(hero.alternate, 'Alternate weapon style', profile.weapon === 'alternate' ? 'Equipped' : profile.ownsAlternate ? 'Owned' : 'Available at the Blacksmith'),
        item('Original Colors', 'Default outfit', profile.cosmetic === 'scout' ? 'Equipped' : 'Owned'),
        item('Silver Trim', 'Mastery reward', profile.cosmetic === 'silver' ? 'Equipped' : mastery(profile.xp) >= 3 ? 'Unlocked' : 'Requires Mastery 3')),
      bar('legend-nav', button('Weapon Management', () => go(blacksmith)), button('Cosmetics', () => go(outfits)), backButton()));
  }

  function masteryPanel() {
    const hero = HEROES[selected], xp = store.profile(selected).xp, level = mastery(xp);
    section('Hero Mastery');
    const progress = document.createElement('progress');
    progress.max = 85 * level ** 2 - 85 * (level - 1) ** 2;
    progress.value = xp - 85 * (level - 1) ** 2;
    progress.setAttribute('aria-label', 'Progress to mastery ' + (level + 1));
    const card = item(hero.name, 'Mastery ' + level + ' · ' + xp + ' XP', (progress.max - progress.value) + ' XP to Mastery ' + (level + 1));
    card.append(progress);
    body.append(card, item('Silver Trim', 'Mastery 3 outfit', level >= 3 ? 'Unlocked' : 'Locked'),
      bar('legend-nav', button('Outfit Shop', () => go(outfits)), backButton()));
  }

  function blacksmith() {
    const id = selected, hero = HEROES[id], profile = store.profile(id);
    const cost = 18 + profile.honing * 10;
    section('Blacksmith');
    body.append(text('p', 'Hana · ' + VILLAGE_STATIONS[0].line), text('p', store.coins + ' Coins', 'balance'));
    const equip = (style, key) => rerender(key, store.weapon(id, style) ? store.kit(id).playWeapon + ' equipped.' : invalid);
    const standard = item(hero.weapon, 'Default weapon style', profile.weapon === 'standard' ? 'Equipped' : 'Owned');
    standard.append(button('Equip ' + hero.weapon, () => equip('standard', 'standard'), { key: 'standard' }));
    const alternate = item(hero.alternate, 'Alternate style', profile.weapon === 'alternate' ? 'Equipped' : profile.ownsAlternate ? 'Owned' : '25 Coins');
    const alternateAction = () => {
      if (profile.ownsAlternate) { equip('alternate', 'alternate'); return; }
      actions.confirm({ title: 'Unlock ' + hero.alternate + '?', message: 'Spend 25 coins to unlock and equip this weapon.',
        label: 'Unlock and Equip' }, () => equip('alternate', 'alternate'));
    };
    alternate.append(button((profile.ownsAlternate ? 'Equip ' : 'Unlock for 25 · ') + hero.alternate, alternateAction,
      { disabled: !profile.ownsAlternate && store.coins < 25, key: 'alternate' }));
    const honing = item('Weapon Honing', 'Each step adds one point of primary damage and reach.', profile.honing + ' of 2 upgrades');
    honing.append(button(profile.honing >= 2 ? 'Weapon Honing Complete' : 'Hone Weapon · ' + cost + ' Coins', () => {
      actions.confirm({ title: 'Hone ' + store.kit(id).playWeapon + '?', message: 'Spend ' + cost + ' coins for +1 primary damage and reach.',
        label: 'Hone Weapon' }, () => {
        const upgraded = store.hone(id);
        rerender('hone', upgraded ? 'Weapon honed. ' + store.coins + ' coins left.' : invalid, 'standard');
      });
    }, { disabled: profile.honing >= 2 || store.coins < cost, key: 'hone' }));
    body.append(bar('inventory-grid', standard, alternate, honing), bar('legend-nav', button('Train', actions.dojo), backButton()));
  }

  function quests() {
    section('Quest Board');
    body.append(text('p', 'Scout Toma · ' + VILLAGE_STATIONS[2].line));
    const cards = bar('inventory-grid');
    for (const [id, [name, description, , coins]] of Object.entries(QUESTS)) {
      const status = store.quest(selected, id);
      const entry = item(name, description, status.claimed ? 'Reward claimed' : status.ready ? 'Ready to claim' : 'In progress');
      entry.append(button(status.claimed ? 'Claimed' : 'Claim ' + coins + ' Coins', () => {
        rerender(id, store.claim(selected, id) ? 'Reward claimed. ' + store.coins + ' coins available.' : invalid, 'back');
      }, { disabled: status.claimed || !status.ready, key: id }));
      cards.append(entry);
    }
    body.append(cards, bar('legend-nav', backButton()));
  }

  function outfits() {
    section('Outfit Shop');
    const profile = store.profile(selected);
    const hero = HEROES[selected];
    body.append(text('p', 'Iris · ' + VILLAGE_STATIONS[3].line));
    const view = canvas(hero.name + ' outfit preview');
    const details = item(hero.name, 'Mastery ' + mastery(profile.xp), profile.cosmetic === 'silver' ? 'Silver Trim equipped' : 'Original Colors equipped');
    const wear = (style, message) => rerender(style, store.cosmetic(selected, style) ? message + ' equipped.' : invalid);
    details.append(bar('legend-nav', button('Original Colors', () => wear('scout', 'Original Colors'), { key: 'scout' }),
      button('Silver Trim · Mastery 3', () => wear('silver', 'Silver Trim'),
        { key: 'silver', disabled: mastery(profile.xp) < 3 })));
    body.append(bar('legend-profile', bar('character-frame', view), details), bar('legend-nav', backButton()));
    portrait(view, selected, true);
  }

  function daily() {
    const challenge = dailyFor();
    const stage = progress.canPlay(challenge.level) ? challenge.level : 0;
    const completed = store.dailyDone(challenge.day);
    section('Daily Challenge');
    body.append(item(challenge.label, challenge.kind === 'arena' ? 'Moonlit Watch' : levels[stage].name,
      completed ? 'Completed today' : 'Reward · 12 Coins and 32 Mastery XP'), text('p', challenge.day),
      bar('legend-nav', button('Start Challenge', () => actions.daily(challenge, stage), { primary: true, disabled: completed }), backButton()));
  }

  function hall() {
    section('Hall of Legends');
    body.append(text('p', 'Archivist Sora · ' + VILLAGE_STATIONS[5].line));
    const eligible = levels.flatMap((level, index) => level.boss && progress.record(index) ? [[level, index]] : []);
    const select = document.createElement('select');
    const difficulty = document.createElement('select');
    const labeled = (name, control) => {
      const label = text('label', name, 'rpg-field');
      label.append(control);
      control.setAttribute('aria-label', name);
      return label;
    };
    for (const [level,index] of eligible) select.add(new Option(level.boss.name,index));
    for (const [label,value] of [['Veteran','veteran'],['Master','master']]) difficulty.add(new Option(label,value));
    const record = text('p', '', 'item-state');
    record.setAttribute('role','status');
    const update = () => {
      const best = store.rematchBest(store.selected,select.value,difficulty.value);
      record.textContent = best === undefined ? 'No time for this loadout yet' : 'Best ' + (best / 1000).toFixed(2) + ' seconds';
    };
    select.addEventListener('change', update);
    difficulty.addEventListener('change', update);
    update();
    const rematch = item('Boss Rematch', eligible.length ? 'Revisit a defeated guardian' : 'Clear a campaign guardian to unlock rematches');
    if (eligible.length) rematch.append(bar('legend-nav', labeled('Defeated boss', select), labeled('Rematch difficulty', difficulty)), record,
      button('Start Boss Rematch', () => actions.rematch(Number(select.value),difficulty.value), { primary: true }));
    const next = item('New Game+', 'A separate challenge cycle keeps its own progress.', store.ng.available ? 'Unlocked' : 'Finish the campaign to unlock');
    next.append(button(store.ng.available ? 'New Game+ · Cycle ' + Math.max(1,store.ng.cycle) : 'New Game+ · Finish the campaign',
      actions.ng, { disabled: !store.ng.available }));
    body.append(bar('inventory-grid', rematch, next),
      bar('legend-nav', button('Choose Hero', () => go(heroes)), backButton()));
  }

  function dojo() {
    section('Training Dojo');
    body.append(item('Instructor Ren', VILLAGE_STATIONS[1].line, 'Practice as ' + HEROES[store.selected].name),
      bar('legend-nav', button('Start Training', actions.dojo, { primary: true }), backButton()));
  }

  function travel() {
    section('Village Fast Travel');
    body.append(text('p', 'Travel to a station and continue exploring the village.'),
      bar('inventory-grid', ...VILLAGE_STATIONS.map(station => {
        const entry = item(station.name, station.npc);
        entry.append(button('Travel to ' + station.name, () => actions.travel(station)));
        return entry;
      })), bar('legend-nav', button('World Portal', actions.worlds), backButton()));
  }

  function story() {
    const [heading, description] = beats[chapter];
    section(heading, 'legends-story');
    const scene = text('div', '', 'legends-story-scene');
    scene.dataset.chapter = String(chapter);
    scene.setAttribute('aria-hidden','true');
    body.append(scene, text('p', description));
    if (chapter === 1) {
      const cast = bar('legend-story-party');
      for (const hero of Object.values(HEROES)) {
        const view = canvas(hero.name);
        cast.append(view);
        portrait(view, hero.id);
      }
      body.append(cast);
    }
    function finish() { store.markIntro(); back(); }
    body.append(bar('legend-nav', button(chapter < beats.length - 1 ? 'Continue' : 'Return to the Village Tales', () => {
      if (chapter === beats.length - 1) finish();
      else { chapter++; story(); focus(undefined, 0); }
    }, { primary: true }), button('Skip Prologue', finish), backButton()));
  }

  function home() {
    section('Legends of Shadows');
    body.append(text('p', HEROES[store.selected].name + ' equipped · ' + store.coins + ' Coins', 'balance'),
      bar('legend-nav', button('Choose Hero', () => go(heroes), { primary: true }), button('Enter Ninja Village', actions.village),
        button('World Portal', actions.worlds), button('Blacksmith', () => go(blacksmith)), button('Quest Board', () => go(quests)),
        button('Hall of Legends', () => go(hall)), button('Daily Challenge', () => go(daily)),
        button('Prologue', () => { chapter = 0; go(story); }), backButton()));
  }

  const routes = { heroes, inventory, mastery: masteryPanel, blacksmith, quests, outfits, hall, daily, dojo, travel, home };
  return {
    open(route = 'home') {
      if (!actions.canSelect() || dialog.open) return;
      stack.length = 0;
      selected = store.selected;
      current = routes[route] ?? home;
      const onBack = actions.pauseVillage();
      navigation.open(dialog, { onBack });
      current();
      title.focus({ preventScroll: true });
    },
  };
}
