import { normalizeDietCode } from './diet-utils.mjs?v=20260823b';

export const MAX_KITCHEN_DIET_LEGEND_ENTRIES = 999;
export const MAX_KITCHEN_DIET_LABEL_LENGTH = 32;

export function normalizeKitchenDietLabel(value) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';
}

export function isValidKitchenDietLabel(value) {
  const normalized = normalizeKitchenDietLabel(value);
  return normalized.length > 0
    && normalized.length <= MAX_KITCHEN_DIET_LABEL_LENGTH
    && normalized.split(' ').length <= 2;
}

export function normalizeKitchenDietLegend(value) {
  if (!Array.isArray(value)) return [];
  const byCode = new Map();
  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const code = normalizeDietCode(entry.code);
    const label = normalizeKitchenDietLabel(entry.label);
    if (!/^\d{1,3}$/.test(code) || Number(code) < 1 || !isValidKitchenDietLabel(label)) return;
    byCode.set(code, { code, label });
  });
  return [...byCode.values()]
    .sort((left, right) => Number(left.code) - Number(right.code))
    .slice(0, MAX_KITCHEN_DIET_LEGEND_ENTRIES);
}

export function kitchenDietLabelForCode(legend, value) {
  const code = normalizeDietCode(value);
  return normalizeKitchenDietLegend(legend).find((entry) => entry.code === code)?.label || '';
}

export function updateKitchenDietLegendEntry(legend, value, label) {
  const code = normalizeDietCode(value);
  if (!/^\d{1,3}$/.test(code) || Number(code) < 1) {
    throw new Error('Numero di dieta non valido');
  }
  const normalizedLabel = normalizeKitchenDietLabel(label);
  if (!isValidKitchenDietLabel(normalizedLabel)) {
    throw new Error('Usa una o due parole, per un massimo di 32 caratteri.');
  }
  return normalizeKitchenDietLegend([
    ...normalizeKitchenDietLegend(legend).filter((entry) => entry.code !== code),
    { code, label: normalizedLabel }
  ]);
}
