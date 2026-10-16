import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setLocale, getLocale, resolveLocale, t, applyTranslations } from '../../prototypes/firebase-spark-pwa/public/i18n/i18n.mjs';
import { escapeHtml } from '../../prototypes/firebase-spark-pwa/public/html-utils.js';

const source = readFileSync('prototypes/firebase-spark-pwa/public/app.js', 'utf8');
globalThis.document = { documentElement: {}, querySelector: () => null, querySelectorAll: () => [] };
function bind(names, dependencies) {
  const bodies = names.map(name => {
    const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
  });
  return new Function(...Object.keys(dependencies), `${bodies.join('\n')}\nreturn { ${names.join(', ')} };`)(...Object.values(dependencies));
}

test('a saved language survives center refreshes and a new application session', async (context) => {
  const storage = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  context.after(() => { if (original) globalThis.localStorage = original; else delete globalThis.localStorage; });
  const { applyCenterDefaultLanguage } = bind(['applyCenterDefaultLanguage'], {
    resolveLocale, getLocale, setLocale, renderAllViews() {}
  });
  for (const locale of ['en', 'fr', 'es', 'de']) {
    await setLocale(locale);
    await applyCenterDefaultLanguage({ language: 'it' });
    assert.equal(getLocale(), locale);
    // A fresh module instance models reopening the app with the same storage.
    const reopened = await import(`../../prototypes/firebase-spark-pwa/public/i18n/i18n.mjs?reopen=${locale}`);
    await reopened.setLocale(reopened.resolveLocale('it'), { persist: false });
    assert.equal(reopened.getLocale(), locale);
  }
  storage.clear();
  await applyCenterDefaultLanguage({ language: 'fr' });
  assert.equal(getLocale(), 'fr');
  assert.equal(storage.size, 0, 'center defaults must not become a user choice');
});

test('changing language rerenders loaded calendars and summary without fetching data', async () => {
  for (const mode of ['week', 'participant', 'summary']) {
    const calls = [];
    const elements = { adminLanguageSelect: { value: 'it' } };
    const { renderAllViews } = bind(['renderAllViews'], {
      state: { mode }, elements, document: {}, getLocale,
      renderMode: () => calls.push('mode'),
      renderParticipantMeals: () => calls.push(mode),
      applyTranslations: () => calls.push('translations')
    });
    await setLocale('de', { persist: false });
    renderAllViews();
    assert.deepEqual(calls, ['mode', mode, 'translations']);
    assert.equal(elements.adminLanguageSelect.value, 'de');
  }
});

test('the appearance form keeps the active language when its saved settings are older', async () => {
  const elements = { adminLanguageSelect: { value: 'it' } };
  const { syncAdminAdaptationsForm } = bind(['syncAdminAdaptationsForm'], {
    state: { centerContactSettings: { language: 'it' } }, elements, getLocale,
    document: { documentElement: { dataset: {} } },
    syncAdaptationsContextCopy() {}, applyInterfaceStyle() {}, updateThemeSelectControl() {}, syncMealReminderControl() {}
  });
  for (const locale of ['en', 'fr', 'es', 'de']) {
    await setLocale(locale, { persist: false });
    syncAdminAdaptationsForm();
    assert.equal(elements.adminLanguageSelect.value, locale);
  }
});

test('reminder status participates in subsequent DOM language updates', async () => {
  const status = {
    dataset: {}, textContent: '',
    getAttribute: name => name === 'data-i18n' ? status.dataset.i18n : null
  };
  const { syncMealReminderControl } = bind(['syncMealReminderControl'], {
    elements: { mealReminderSelect: {}, mealReminderStatus: status },
    mealRemindersAreSupported: () => true, loadMealReminderPreference: () => true,
    Notification: { permission: 'granted' }, t
  });
  await setLocale('it', { persist: false });
  syncMealReminderControl();
  const italian = status.textContent;
  const root = { querySelectorAll: selector => selector === '[data-i18n]' ? [status] : [] };
  for (const locale of ['en', 'fr', 'es', 'de']) {
    await setLocale(locale, { persist: false });
    applyTranslations(root);
    assert.equal(status.textContent, t('mealReminder.status.enabled'));
    assert.notEqual(status.textContent, italian);
  }
});

test('week and month labels use every locale and respect both week start preferences', async () => {
  const state = { centerContactSettings: {}, pendingMealKeys: new Set() };
  const fns = bind(['getCalendarWeekdayLabels', 'getCalendarWeekdayLabel', 'formatWeekDayCode',
    'parseDateId', 'getLocalizedMealLabel', 'getCalendarSelectionLabel', 'renderMonthScopeButtons',
    'renderFutureMonthScopeButton'], {
    state, getLocale, t, escapeHtml,
    formatDateTime: (date, options) => new Intl.DateTimeFormat(getLocale(), options).format(date),
    getMealIcon: () => 'icon', getInterfaceIcon: () => 'icon',
    getMonthScopeEffect: () => 'PRESENT', getMonthSelectionEffect: () => 'PRESENT',
    getMonthScopeMeals: () => []
  });
  for (const locale of ['it', 'en', 'fr', 'es', 'de']) {
    await setLocale(locale, { persist: false });
    for (const start of ['monday', 'sunday']) {
      state.centerContactSettings.weekStartsOn = start;
      const offset = start === 'sunday' ? 0 : 1;
      const labels = fns.getCalendarWeekdayLabels();
      assert.equal(labels.length, 7);
      const expected = locale === 'it' ? (offset ? 'L' : 'D')
        : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 0, 4 + offset));
      assert.equal(labels[0], expected);
      assert.equal(fns.formatWeekDayCode(`2026-01-0${4 + offset}`), `${expected} ${4 + offset}`);
    }
    const label = t('meal.type.lunch');
    const action = t('calendar.selection.week-meal.select', { meal: label });
    assert.ok(fns.renderMonthScopeButtons(label, '2026-01-05', 'lunch').includes(escapeHtml(action)));
    assert.ok(fns.renderFutureMonthScopeButton(label, '2026-01-05', 'lunch').includes(escapeHtml(action)));
    for (const scope of ['day', 'week', 'week-meal', 'month']) {
      for (const effect of ['PRESENT', 'ABSENT']) {
        assert.doesNotMatch(fns.getCalendarSelectionLabel(scope, effect, 'lunch'), /calendar\.selection|\{meal\}/);
      }
    }
  }
});
