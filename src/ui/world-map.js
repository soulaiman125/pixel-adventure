import { legendTexture } from '../game/legends-vista.js';
import { REALMS } from '../game/legends-worlds.js';

function text(tag, value, className) {
  const el = document.createElement(tag);
  el.textContent = value;
  if (className) el.className = className;
  return el;
}

export function createWorldMap({ game, worlds, levels, progress, progressElement, container, openLevels }) {
  const entries = [...worlds];
  let cards;
  function createCard([start, name], index) {
    const end = entries[index + 1]?.[0] ?? levels.length;
    const group = levels.slice(start, end);
    const button = text('button', '', 'world-card');
    button.type = 'button';
    button.dataset.worldCard = start;
    const preview = document.createElement('canvas');
    preview.width = 176;
    preview.height = 88;
    preview.className = 'world-art';
    preview.setAttribute('aria-hidden', 'true');
    const realm = REALMS.find(item => item.id === group[0].realm);
    const key = group[0].theme === 'verdant' ? 'field-valley' : 'campaign-world-' + group[0].theme;
    const texture = realm ? legendTexture(game.textures, realm) : game.textures.get(key);
    const source = texture.getSourceImage();
    const ctx = preview.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const crop = Math.min(source.height, source.width / 2);
    ctx.drawImage(source, 0, (source.height - crop) * .38, source.width, crop, 0, 0, 176, 88);
    const number = text('span', String(index + 1).padStart(2, '0'), 'world-index');
    const details = text('span', '', 'world-card-details');
    const progress = text('small', '', 'world-card-progress');
    const boss = group.findLast(level => level.boss);
    details.append(text('strong', name), progress);
    if (boss) details.append(text('small', 'Guardian · ' + boss.boss.name, 'world-guardian'));
    button.append(preview, number, details);
    button.addEventListener('click', () => openLevels(start));
    container.append(button);
    return { start, end, button, progress };
  }
  return function update() {
    cards ??= entries.map(createCard);
    progressElement.textContent = progress.savedClears + ' of ' + levels.length + ' stages completed';
    const current = progress.continueAt ?? levels.length - 1;
    for (const card of cards) {
      const ids = Array.from({ length: card.end - card.start }, (_, index) => card.start + index);
      const count = ids.filter(index => progress.record(index)).length;
      const available = ids.some(index => progress.canPlay(index));
      card.button.dataset.state = available ? 'available' : 'locked';
      card.progress.textContent = (available ? count + '/' + ids.length + ' cleared' : 'Locked') + ' · Stages ' + (card.start + 1) + '–' + card.end;
      if (current >= card.start && current < card.end) card.button.setAttribute('aria-current', 'location');
      else card.button.removeAttribute('aria-current');
    }
  };
}
