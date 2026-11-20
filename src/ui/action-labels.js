export function keyName(code) {
  const named = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', Escape: 'Esc', Space: 'Space' };
  return named[code] ?? code.replace(/^(Key|Digit)/, '');
}

export function actionNames(hero, shadow = true) {
  return {
    left: 'Move left', right: 'Move right', jump: 'Jump', drop: 'Drop through a platform',
    attack: shadow ? hero.abilities[0] : 'Attack', charged: hero.abilities[1],
    throw: hero.abilities[2], dash: hero.abilities[3], sprint: 'Sprint',
    cyclone: hero.abilities[4], execution: hero.ultimate, parry: 'Parry', pause: 'Pause',
  };
}

const touchLabels = { dash: 'Dash', throw: 'Shot', sprint: 'Run', cyclone: 'Skill',
  execution: 'Ult', parry: 'Parry', attack: 'Attack', jump: 'Jump' };

export function refreshControlLabels({ hero, controls, shadow }) {
  const names = actionNames(hero, shadow);
  const keys = action => controls.keyFor(action).map(keyName);
  const labels = action => keys(action).join(' / ');
  const rows = [
    ['Move', [...keys('left'), ...keys('right')], 'Move left or right.'],
    ['Jump', keys('jump'), 'Hold for a higher jump.'],
    ['Drop', keys('drop'), 'Drop through floating platforms.'],
    [names.attack, keys('attack'), shadow ? 'Chain two quick attacks into a finisher by pressing again during recovery.' : 'Strike at close range.'],
  ];
  if (shadow) rows.push(
    [names.charged, keys('attack'), 'Hold Attack to charge, then release.'],
    [names.throw, keys('throw'), 'Use your projectile after the cooldown.'],
    [names.dash, keys('dash'), 'One air dash per landing. Hazards still hurt.'],
    [names.sprint, keys('sprint'), 'Hold to run faster on the ground.'],
    [names.cyclone, keys('cyclone'), 'Use your hero’s special skill.'],
    [names.execution, keys('execution'), 'Requires an exposed target.'],
    [names.parry, keys('parry'), 'Block a frontal projectile or a cyan-marked melee attack.'],
    ['Dive / Wall jump', [...keys('drop'), ...keys('attack')], 'Hold Drop and Attack in the air to dive. Jump off a marked wall once before landing.'],
  );
  rows.push(['Retry', ['R'], 'Retry the checkpoint. Coins are kept and the retry counts as a death.'],
    ['Pause', keys('pause'), 'Open the pause menu.'], ['Touch', [], 'Hold a movement arrow and press Jump or Attack with another finger.']);
  const key = label => Object.assign(document.createElement('kbd'), { textContent: label });
  const instruction = document.querySelector('.instruction-list');
  instruction.replaceChildren(...rows.map(([name, bindings, hint]) => {
    const row = document.createElement('div');
    const term = Object.assign(document.createElement('dt'), { textContent: name });
    const description = document.createElement('dd');
    for (const binding of bindings) description.append(key(binding), ' ');
    description.append(hint);
    row.append(term, description);
    return row;
  }));
  const hints = document.getElementById('keyboard-hints');
  const hintRows = [['Move', [keys('left')[0], keys('right')[0]]], ['Jump', keys('jump').slice(0, 1)],
    [names.attack, keys('attack').slice(0, 1)], ['Retry', ['R']], ['Pause', keys('pause').slice(0,1)]];
  if (shadow) hintRows.push(...['throw','dash','sprint','cyclone','execution','parry'].map(action=>[names[action],keys(action).slice(0,1)]));
  hints.replaceChildren(...hintRows.map(([name, bindings]) => {
    const span = document.createElement('span');
    span.append(...bindings.map(key), ' ' + name);
    return span;
  }));
  for (const button of document.querySelectorAll('[data-action]')) {
    const { action } = button.dataset;
    button.setAttribute('aria-label', names[action]);
    button.title = names[action];
    if (!touchLabels[action]) continue;
    let caption = button.querySelector('.touch-caption');
    if (!caption) {
      const ns='http://www.w3.org/2000/svg';
      const icon=document.createElementNS(ns,'svg'), use=document.createElementNS(ns,'use');
      icon.setAttribute('aria-hidden','true');
      use.setAttribute('href','#ability-'+action);
      icon.append(use);
      caption=document.createElement('span');
      caption.className='touch-caption';
      button.replaceChildren(icon,caption);
    }
    caption.textContent=touchLabels[action];
    if (action === 'attack' && shadow) {
      if (!button.querySelector('.touch-charge-hint')) {
        const hint = Object.assign(document.createElement('small'), { className:'touch-charge-hint', textContent:'Hold: Charge' });
        hint.setAttribute('aria-hidden','true');
        button.append(hint);
      }
      button.setAttribute('aria-label', names.attack + '. Hold to charge.');
      button.title = names.attack + ' · Hold to charge';
    }
  }
  for (const select of document.querySelectorAll('#touch-swap-from,#touch-swap-to')) {
    for (const option of select.options) option.textContent = names[option.value];
  }
  for (const button of document.querySelectorAll('[data-bind]')) {
    const name = names[button.dataset.bind];
    button.setAttribute('aria-label', 'Rebind ' + name);
    button.parentElement.querySelector('.binding-action').textContent = name;
  }
  document.getElementById('pause-level').dataset.shadow = hintRows.map(([name, bindings])=>bindings.join('/') + ' ' + name).join(' · ');
  document.getElementById('help-button').title = rows.filter(([name])=>name!=='Touch').map(([name, bindings])=>name+' '+bindings.join('/')).join(' · ');
  return names;
}
