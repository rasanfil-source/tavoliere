export function formatDateId(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

const centerDateFormatters = new Map();

export function getDateInTimeZone(timezone = 'Europe/Rome', now = new Date()) {
  let formatter = centerDateFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    if (centerDateFormatters.size >= 8) centerDateFormatters.delete(centerDateFormatters.keys().next().value);
    centerDateFormatters.set(timezone, formatter);
  }
  // Cache the formatter, never the current day: resume/midnight must stay live.
  const parts = formatter.formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Number(values.year), Number(values.month) - 1, Number(values.day), 12);
}
