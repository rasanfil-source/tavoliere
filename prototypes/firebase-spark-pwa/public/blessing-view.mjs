import { escapeHtml } from './html-utils.js?v=20261014b';
import { t } from './i18n/i18n.mjs?v=20261014b';

export function renderBlessing(time, { compact = false, narrow = false } = {}) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return '';
  const label = `${t('blessing.title')} (${time})`;
  const icon = `<svg class="blessing-icon" viewBox="0 0 24 24" focusable="false"><path d="M12 1.7v3.8m-1.8-2h3.6"></path><circle cx="12" cy="9.6" r="3.45"></circle><path d="m7.2 6.6-1.6-1.3m11.2 1.3 1.6-1.3M8.1 9.6H5.9m12.2 0h-2.2M12 13.1v4.5m-2.3 0h4.6M9.7 17.6 8.4 21h7.2l-1.3-3.4"></path><path d="M7.3 21h9.4"></path></svg>`;
  const symbolRow = `<span class="blessing-symbol-row" aria-hidden="true"><span class="blessing-plus">+</span>${icon}</span>`;
  if (narrow) {
    return `<span class="blessing-plus-side" aria-hidden="true">+</span><span class="blessing-indicator blessing-indicator-compact" role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon}</span><small class="blessing-time" aria-hidden="true">(${escapeHtml(time)})</small>`;
  }
  if (compact) {
    return `<span class="blessing-inline-mark"><span class="blessing-plus" aria-hidden="true">+</span><span class="blessing-indicator blessing-indicator-compact" role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon}</span><small class="blessing-time" aria-hidden="true">(${escapeHtml(time)})</small></span>`;
  }
  return `<span class="blessing-indicator" role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${symbolRow}<small aria-hidden="true">(${escapeHtml(time)})</small></span>`;
}
