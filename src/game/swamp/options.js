export const SWAMP_STAGE = 'Forgotten Swamp';
export const visualOptions = [
  ['normals', 'Surface lighting'], ['shadows', 'Dynamic shadows'],
  ['depth', 'Layered scenery'], ['post', 'Color grading and glow'],
  ['materials', 'Stone and water detail'], ['motion', 'Detailed animation and reactive foliage'],
  ['finisher', 'Boss finishers'], ['retryLimit', 'Forgotten Swamp death limit'],
];
export const MAX_DEATHS = 99;

export function swampOptions(saved, query = null) {
  saved ??= {};
  const only = query === null ? null : new Set(query.split(','));
  const options = Object.fromEntries(visualOptions.map(([id]) =>
    [id, only ? only.has(id) : saved[id] !== false]));
  const limit = Number(saved.deaths);
  options.deaths = Number.isInteger(limit) && limit >= 1 && limit <= MAX_DEATHS ? limit : 3;
  return options;
}
