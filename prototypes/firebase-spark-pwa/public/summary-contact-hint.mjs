export const SUMMARY_CONTACT_HINT_VISIT_LIMIT = 30;

export function normalizeSummaryContactHintVisitCount(value) {
  const count = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.min(count, SUMMARY_CONTACT_HINT_VISIT_LIMIT);
}

export function nextSummaryContactHintVisitCount(value) {
  return Math.min(
    normalizeSummaryContactHintVisitCount(value) + 1,
    SUMMARY_CONTACT_HINT_VISIT_LIMIT,
  );
}

export function shouldShowSummaryContactHint(value) {
  return normalizeSummaryContactHintVisitCount(value) < SUMMARY_CONTACT_HINT_VISIT_LIMIT;
}
