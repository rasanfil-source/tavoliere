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
