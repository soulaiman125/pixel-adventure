import { swampOptions, visualOptions } from '../game/swamp/options.js';

export function installSwampSettings(preferences, save) {
  const options = swampOptions(preferences.swamp);
  const fields = document.getElementById('swamp-features');
  function change(values) {
    preferences.swamp = { ...preferences.swamp, ...values };
    save();
  }
  for (const [id, label] of visualOptions) {
    const row = document.createElement('label');
    row.className = 'setting';
    const title = document.createElement('strong');
    title.textContent = label;
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.dataset.swampFeature = id;
    toggle.checked = options[id];
    toggle.addEventListener('change', () => change({ [id]: toggle.checked }));
    row.append(title, toggle);
    fields.append(row);
  }
  const limit = document.getElementById('swamp-deaths');
  limit.value = options.deaths;
  limit.addEventListener('change', () => {
    const { deaths } = swampOptions({ deaths: limit.value });
    limit.value = deaths;
    change({ deaths });
  });
}
