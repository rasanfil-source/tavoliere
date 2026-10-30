import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBookingFor } from '../../prototypes/firebase-spark-pwa/public/booking-for.mjs';

function harness(locale = 'it') {
  const catalog = JSON.parse(readFileSync(new URL(`../../prototypes/firebase-spark-pwa/public/i18n/${locale}.json`, import.meta.url), 'utf8'));
  const translate = (key, values = {}) => (catalog[key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const handlers = {};
  let uid = 'operator';
  const dialog = { innerHTML: '', opened: false, addEventListener: (name, fn) => { handlers[name] = fn; }, showModal() { this.opened = true; }, close() { this.opened = false; } };
  const people = [{ participantId: 'guest', displayName: 'Ospite <Uno>', status: 'ACTIVE', groupId: 'group_ospiti' }];
  const meal = { mealDate: '2026-10-17', mealTypeId: 'lunch', label: 'Pranzo', effect: 'ABSENT', isOpen: true };
  let save = async (person, target, effect) => { assert.equal(person.participantId, 'guest'); target.effect = effect; };
  const view = createBookingFor({ dialog, canBook: () => true, identity: () => uid, listPeople: () => people,
    translate, locale: () => locale,
    today: () => new Date(2026, 9, 17), loadWeek: async () => [{ date: meal.mealDate, meals: [meal] }],
    saveMeal: (...args) => save(...args) });
  const click = selector => handlers.click({ target: { closest: query => query === selector ? { dataset: { bookingDate: meal.mealDate, bookingMeal: meal.mealTypeId } } : null } });
  return { view, dialog, meal, click, changeIdentity() { uid = 'other'; }, setSave(fn) { save = fn; } };
}

for (const locale of ['it', 'en', 'fr', 'es', 'de', 'ca']) {
  test(`prenotazioni per altri: etichette e date nella lingua ${locale}`, async () => {
    const h = harness(locale);
    h.meal.isOpen = false;
    await h.view.open('guest');
    const catalog = JSON.parse(readFileSync(new URL(`../../prototypes/firebase-spark-pwa/public/i18n/${locale}.json`, import.meta.url), 'utf8'));
    assert.ok(h.dialog.innerHTML.includes(catalog['bookingFor.heading'].replace('{name}', 'Ospite &lt;Uno&gt;')));
    assert.ok(h.dialog.innerHTML.includes(catalog['bookingFor.exit'].replace('{name}', 'Ospite &lt;Uno&gt;')));
    for (const key of ['week.previous', 'week.next', 'bookingFor.updated', 'bookingFor.absent', 'meal.status.closed', 'meal.type.lunch']) {
      assert.ok(h.dialog.innerHTML.includes(catalog[key]), key);
    }
    const dateLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(2026, 9, 17, 12));
    assert.ok(h.dialog.innerHTML.includes(dateLabel));
    assert.doesNotMatch(h.dialog.innerHTML, /bookingFor\./);
  });
}

test('prenota per il destinatario e torna senza alterare identità o cancellare prenotazioni', async () => {
  const h = harness();
  h.setSave(async () => {}); // Il backend non modifica gli oggetti della vista.
  await h.view.open('guest');
  assert.equal(h.dialog.opened, true);
  assert.match(h.dialog.innerHTML, /Ospite &lt;Uno&gt;/);
  await h.click('[data-booking-meal]');
  assert.equal(h.meal.effect, 'PRESENT');
  await h.click('[data-booking-exit]');
  assert.equal(h.dialog.opened, false);
  await h.view.open('guest');
  assert.equal(h.meal.effect, 'PRESENT');
});

test('uscita attende salvataggio, cambio identità chiude e errori non confermano il pasto', async () => {
  const h = harness();
  await h.view.open('guest');
  let finish;
  h.setSave(() => new Promise(resolve => { finish = resolve; }));
  const saving = h.click('[data-booking-meal]');
  h.view.close();
  assert.equal(h.dialog.opened, true);
  h.changeIdentity();
  finish();
  await saving;
  assert.equal(h.dialog.opened, false);
  await h.view.open('guest');
  const savedEffect = h.meal.effect;
  h.setSave(async () => { throw new Error('Connessione interrotta'); });
  await h.click('[data-booking-meal]');
  assert.match(h.dialog.innerHTML, /Connessione interrotta/);
  assert.equal(h.meal.effect, savedEffect);
});
