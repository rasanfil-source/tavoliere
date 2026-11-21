function isNumericDietCode(value) {
  return /^\d{1,3}$/.test(value) && Number(value) >= 1;
}

export function normalizeDietCode(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!isNumericDietCode(normalized)) return 'STANDARD';
  return String(Number(normalized));
}

export function normalizeDietTags(dietTags) {
  const tags = Array.isArray(dietTags) ? dietTags : [];
  const normalized = [...new Set(tags
    .map(normalizeDietCode)
    .filter((code) => code !== 'STANDARD'))];
  return normalized.length > 0 ? normalized : ['STANDARD'];
}

export function normalizeDietHistory(value) {
  const byDate = new Map();
  (Array.isArray(value) ? value : []).forEach((entry) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.startsOn)
        || !Array.isArray(entry.dietTags) || entry.dietTags.length === 0) return;
    byDate.set(entry.startsOn, { startsOn: entry.startsOn, dietTags: normalizeDietTags(entry.dietTags) });
  });
  return [...byDate.values()].sort((left, right) => left.startsOn.localeCompare(right.startsOn));
}

export function updateDietHistory(history, dietTags, startsOn) {
  const previous = normalizeDietHistory(history).filter((entry) => entry.startsOn < startsOn);
  const tags = normalizeDietTags(dietTags);
  const last = previous[previous.length - 1];
  if (!last || JSON.stringify([...last.dietTags].sort()) !== JSON.stringify([...tags].sort())) {
    previous.push({ startsOn, dietTags: tags });
  }
  return previous;
}

export function formatDietLabel(value, translate) {
  const normalized = normalizeDietCode(value);
  if (normalized !== 'STANDARD') return `D${normalized}`;
  if (typeof translate === 'function') {
    const translated = translate('diet.option.STANDARD');
    if (translated && translated !== 'diet.option.STANDARD') return translated;
  }
  return 'Standard';
}

export function getDietBadgeTone(value) {
  const normalized = normalizeDietCode(value);
  return normalized === 'STANDARD'
    ? 8
    : ((Number(normalized) - 1) % 8) + 1;
}
