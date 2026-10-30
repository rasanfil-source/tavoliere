import { escapeHtml } from './html-utils.js?v=20261014b';
import { t, getLocale } from './i18n/i18n.mjs?v=20261014b';

// Il calendario della vista è indipendente dall’identità e dai token dell’operatore.
export function createBookingFor({ dialog, canBook, identity, listPeople, loadWeek, saveMeal, today, translate = t, locale = getLocale }) {
  let context = null;
  let revision = 0;
  let busy = false;
  let saving = false;
  const current = value => context === value && canBook() && identity() === value.identity;
  function close() {
    if (saving) return;
    ++revision;
    context = null;
    busy = false;
    dialog.close();
  }
  function render(message = '') {
    if (!context) return;
    const text = (key, values) => escapeHtml(translate(key, values));
    dialog.innerHTML = `<div class="booking-for-heading"><h2>${text('bookingFor.heading', { name: context.person.displayName })}</h2>
      <p>${text(context.person.groupId === 'group_ospiti' ? 'role.guest' : 'role.resident')}</p>
      <button type="button" data-booking-exit ${saving ? 'disabled' : ''}>${text('bookingFor.exit', { name: context.person.displayName })}</button></div>
      <p role="status">${escapeHtml(message)}</p>
      <div class="booking-for-navigation"><button type="button" data-booking-week="-7" ${busy ? 'disabled' : ''}>${text('week.previous')}</button>
      <button type="button" data-booking-week="7" ${busy ? 'disabled' : ''}>${text('week.next')}</button></div>
      <div class="booking-for-days">${context.days.map(day => `<section><h3>${escapeHtml(new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(day.date + 'T12:00:00')))}</h3>${day.meals.map(meal =>
        `<button type="button" data-booking-date="${escapeHtml(day.date)}" data-booking-meal="${escapeHtml(meal.mealTypeId)}" aria-pressed="${meal.effect === 'PRESENT'}" ${busy || !meal.isOpen ? 'disabled' : ''}>${text('meal.type.' + meal.mealTypeId)}: ${text(meal.effect === 'PRESENT' ? 'bookingFor.present' : 'bookingFor.absent')}${!meal.isOpen ? ' · ' + text('meal.status.closed') : ''}</button>`).join('')}</section>`).join('')}</div>`;
  }
  async function refresh(start = new Date(context.start)) {
    const value = context;
    const request = ++revision;
    busy = true;
    render(translate('bookingFor.loading'));
    try {
      const days = await loadWeek(value.person.participantId, new Date(start));
      if (request !== revision || !current(value)) return;
      value.days = days;
      value.start = start;
    } catch (error) {
      if (request === revision && current(value)) value.error = error.message;
    } finally {
      if (request === revision && context === value) {
        busy = false;
        if (!current(value)) close();
        else { render(value.error || translate('bookingFor.updated')); value.error = ''; }
      }
    }
  }
  async function open(participantId) {
    if (busy || !canBook()) return;
    const person = listPeople().find(person => person.participantId === participantId && person.status === 'ACTIVE');
    if (!person) return;
    context = { person: { ...person }, identity: identity(), start: today(), days: [] };
    render();
    dialog.showModal();
    await refresh();
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', async event => {
    if (event.target.closest('[data-booking-exit]')) { close(); return; }
    if (busy || !context) return;
    if (!current(context)) { close(); return; }
    const week = event.target.closest('[data-booking-week]');
    if (week) {
      const start = new Date(context.start);
      start.setDate(start.getDate() + Number(week.dataset.bookingWeek));
      await refresh(start);
      return;
    }
    const button = event.target.closest('[data-booking-meal]');
    if (!button) return;
    const value = context;
    const meal = value.days.find(day => day.date === button.dataset.bookingDate)?.meals.find(meal => meal.mealTypeId === button.dataset.bookingMeal);
    if (!meal?.isOpen) return;
    busy = true;
    saving = true;
    render(translate('common.status.saving'));
    let message;
    try {
      const effect = meal.effect === 'PRESENT' ? 'ABSENT' : 'PRESENT';
      await saveMeal(value.person, meal, effect);
      meal.effect = effect;
      message = translate('participant.meal.save.success');
    } catch (error) { message = error.message || translate('bookingFor.notSaved'); }
    finally {
      busy = false;
      saving = false;
      if (!current(value)) close();
      else render(message);
    }
  });
  return { open, close, checkIdentity() { if (context && !current(context)) close(); } };
}
