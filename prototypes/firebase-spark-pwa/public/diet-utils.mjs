const DIET_DEFINITIONS = Object.freeze([
  { value: 'STANDARD', label: 'Nessuna dieta' },
  { value: '1', label: 'D1' },
  { value: '2', label: 'D2' },
  { value: '3', label: 'D3' },
  { value: '4', label: 'D4' },
  { value: 'BIANCO', label: 'In bianco' },
  { value: 'CUSTOM', label: 'Altro numero...' },
  { value: 'DIAB', label: 'Diabete' },
  { value: 'IPO', label: 'Iposodica' },
  { value: 'CARDIO', label: 'Cardiologica' }
]);

const DIET_LABELS = Object.freeze({
  STANDARD: 'Standard',
  BIANCO: 'In bianco',
  DIAB: 'Diabete',
  DIABETE: 'Diabete',
  DIETA: 'Dieta',
  IPO: 'Iposodica',
  CARDIO: 'Cardiologica'
});

export function normalizeDietCode(value) {
  const normalized = String(value || '').trim().toUpperCase();
  // La codifica 2L rappresenta la dieta 3 nel modello dati corrente.
  return normalized === '2L' ? '3' : normalized || 'STANDARD';
}

export function normalizeDietTags(dietTags) {
  const tags = Array.isArray(dietTags) && dietTags.length > 0 ? dietTags : ['STANDARD'];
  return [...new Set(tags.map(normalizeDietCode))];
}

export function getDietOptions({ emptyLabel = 'Nessuna dieta' } = {}) {
  return DIET_DEFINITIONS.map((option) => ({
    ...option,
    label: option.value === 'STANDARD' ? emptyLabel : option.label
  }));
}

export function isCustomDietNumber(value) {
  const normalized = String(value || '');
  return /^\d+$/.test(normalized)
    && Number(normalized) >= 5
    && Number(normalized) <= 999;
}

export function resolveDietSelection(selectedValue, customValue) {
  const selected = normalizeDietCode(selectedValue);
  if (selected !== 'CUSTOM') {
    return selected;
  }
  const number = Number(customValue);
  if (!Number.isInteger(number) || number < 5 || number > 999) {
    throw new Error('Inserisci un numero di dieta compreso tra 5 e 999');
  }
  return String(number);
}

export function formatDietLabel(value, translate) {
  const normalized = normalizeDietCode(value);
  if (/^\d+$/.test(normalized)) {
    return `D${normalized}`;
  }
  const catalogCode = normalized === 'DIABETE' ? 'DIAB' : normalized;
  const key = `diet.option.${catalogCode}`;
  if (typeof translate === 'function') {
    const translated = translate(key);
    if (translated && translated !== key) return translated;
  }
  return DIET_LABELS[normalized] || normalized;
}

const NAMED_DIET_TONES = Object.freeze({
  BIANCO: 1,
  DIAB: 2,
  DIABETE: 2,
  IPO: 3,
  CARDIO: 4
});

export function getDietBadgeTone(value) {
  const normalized = normalizeDietCode(value);
  if (/^\d+$/.test(normalized)) {
    return ((Number(normalized) - 1) % 8) + 1;
  }
  return NAMED_DIET_TONES[normalized] || 8;
}
