import test from 'node:test';
import assert from 'node:assert/strict';
import {
  setLocale,
  getLocale,
  t,
  formatDate,
  formatTime,
  resolveLocale,
  applyTranslations
} from '../../prototypes/firebase-spark-pwa/public/i18n/i18n.mjs?v=20260816f';
import { toUserMessage, classifyApplicationError } from '../../prototypes/firebase-spark-pwa/public/core/user-error.mjs';

// Setup mock DOM environment for node test
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.textContent = '';
    this.value = '';
    this.placeholder = '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'placeholder') this.placeholder = String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  querySelectorAll(selector) {
    const results = [];
    const attrName = selector.replace(/[\[\]]/g, '');
    const check = (el) => {
      if (el.hasAttribute(attrName)) results.push(el);
      for (const child of el.children) check(child);
    };
    check(this);
    return results;
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }
}

globalThis.document = new MockElement('html');
globalThis.document.documentElement = globalThis.document;

test('i18n runtime: cambio lingua aggiorna cataloghi, stringhe t() e formattazione', async () => {
  // Inizializza con italiano
  await setLocale('it');
  assert.equal(getLocale(), 'it');
  assert.equal(t('common.actions.save'), 'Salva');
  assert.equal(t('meal.type.breakfast'), 'Colazione');
  assert.equal(t('meal.type.lunch'), 'Pranzo');
  assert.equal(t('meal.type.dinner'), 'Cena');

  // Passa ad Inglese
  await setLocale('en');
  assert.equal(getLocale(), 'en');
  assert.equal(t('common.actions.save'), 'Save');
  assert.equal(t('meal.type.breakfast'), 'Breakfast');
  assert.equal(t('meal.type.lunch'), 'Lunch');
  assert.equal(t('meal.type.dinner'), 'Dinner');
  assert.equal(t('time.today'), 'Today');
  assert.equal(t('time.tomorrow'), 'Tomorrow');
  assert.equal(t('app.header.controlPanel'), 'Control panel');

  // Passa a Francese
  await setLocale('fr');
  assert.equal(getLocale(), 'fr');
  assert.equal(t('common.actions.save'), 'Enregistrer');
  assert.equal(t('meal.type.breakfast'), 'Petit-déjeuner');
  assert.equal(t('meal.type.lunch'), 'Déjeuner');
  assert.equal(t('meal.type.dinner'), 'Dîner');
  assert.equal(t('week.agenda.title'), 'Agenda du centre');
  assert.equal(t('dialog.deactivateCenter.title'), 'Désactiver le centre');

  // Passa a Spagnolo
  await setLocale('es');
  assert.equal(getLocale(), 'es');
  assert.equal(t('common.actions.save'), 'Guardar');
  assert.equal(t('meal.type.breakfast'), 'Desayuno');
  assert.equal(t('meal.type.lunch'), 'Almuerzo');
  assert.equal(t('meal.type.dinner'), 'Cena');
  assert.equal(t('dialog.deletePerson.title'), 'Eliminar persona');

  // Passa a Tedesco
  await setLocale('de');
  assert.equal(getLocale(), 'de');
  assert.equal(t('common.actions.save'), 'Speichern');
  assert.equal(t('meal.type.breakfast'), 'Frühstück');
  assert.equal(t('meal.type.lunch'), 'Mittagessen');
  assert.equal(t('meal.type.dinner'), 'Abendessen');
  assert.equal(t('dialog.transferOwnership.title'), 'Verantwortung übertragen');
});

test('i18n runtime: interpolazione placeholder e opzioni dinamiche', async () => {
  await setLocale('en');
  assert.equal(
    t('admin.invitations.validUntil', { date: '31 Dec 2026' }),
    'Invitation valid until 31 Dec 2026'
  );
  assert.equal(
    t('dialog.deletePerson.message', { name: 'John Doe' }),
    'John Doe, associated bookings, and access links will be deleted permanently.'
  );

  await setLocale('it');
  assert.equal(
    t('admin.invitations.validUntil', { date: '31 Dic 2026' }),
    'Invito valido fino al 31 Dic 2026'
  );
  assert.equal(
    t('dialog.deletePerson.message', { name: 'Mario Rossi' }),
    'Verranno eliminati Mario Rossi, le prenotazioni e gli accessi personali collegati. Non sarà possibile ripristinarli.'
  );

  await setLocale('fr');
  assert.equal(
    t('confirm.typeToConfirm', { text: 'SUPPRIMER' }),
    'Écrivez SUPPRIMER pour confirmer'
  );
});

test('i18n runtime: messaggi di errore tradotti reattivamente', async () => {
  await setLocale('en');
  assert.equal(
    toUserMessage({ code: 'permission-denied' }),
    'This operation is not authorized for your role.'
  );
  assert.equal(
    toUserMessage({ code: 'auth/invalid-credential' }),
    'Invalid credentials. Check code and password.'
  );

  await setLocale('it');
  assert.equal(
    toUserMessage({ code: 'permission-denied' }),
    'Questa operazione non è autorizzata per il tuo ruolo.'
  );
  assert.equal(
    toUserMessage({ code: 'auth/invalid-credential' }),
    'Credenziali non valide. Controlla sigla e password.'
  );

  await setLocale('de');
  assert.equal(
    toUserMessage({ code: 'permission-denied' }),
    'Diese Aktion ist für Ihre Rolle nicht autorisiert.'
  );
});

test('i18n runtime: applicazione traduzioni nel DOM simulato con data-i18n', async () => {
  const root = new MockElement('div');
  const title = new MockElement('h2');
  title.setAttribute('data-i18n', 'admin.adaptations.title');
  title.textContent = 'Impostazioni';

  const input = new MockElement('input');
  input.setAttribute('data-i18n-placeholder', 'placeholder.specialNotes');
  input.setAttribute('placeholder', 'Per esempio: pranzo servito alle 12:30');

  const nav = new MockElement('nav');
  nav.setAttribute('data-i18n-aria-label', 'a11y.participantNavigation');
  nav.setAttribute('aria-label', 'Navigazione partecipante');

  root.children.push(title, input, nav);

  // Applica in Inglese
  await setLocale('en');
  applyTranslations(root);
  assert.equal(title.textContent, 'Settings');
  assert.equal(input.placeholder, 'For example: lunch served at 12:30');
  assert.equal(nav.getAttribute('aria-label'), 'Participant navigation');

  // Applica in Tedesco
  await setLocale('de');
  applyTranslations(root);
  assert.equal(title.textContent, 'Einstellungen');
  assert.equal(input.placeholder, 'Zum Beispiel: Mittagessen um 12:30 serviert');
  assert.equal(nav.getAttribute('aria-label'), 'Teilnehmer-Navigation');

  // Applica in Francese
  await setLocale('fr');
  applyTranslations(root);
  assert.equal(title.textContent, 'Paramètres');
  assert.equal(input.placeholder, 'Par exemple : déjeuner servi à 12h30');
  assert.equal(nav.getAttribute('aria-label'), 'Navigation participant');
});

test('i18n runtime: precedenza risoluzione lingua', () => {
  // Senza preferenze salvate, usa lingua centro se supportata
  const resolvedCenter = resolveLocale('fr');
  assert.equal(resolvedCenter, 'fr');

  // Con lingua non valida, fallback a italiano
  const resolvedInvalid = resolveLocale('xx');
  assert.equal(resolvedInvalid, 'it');
});
