import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url),
  'utf8'
);
const app = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url),
  'utf8'
);
const styles = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/styles.css', import.meta.url),
  'utf8'
);

test('la pagina dichiara lingua viewport e regioni di stato', () => {
  assert.match(index, /<html lang="it" data-theme="inchiostro">/);
  assert.match(index, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  assert.match(index, /aria-live="polite"/);
  assert.match(index, /aria-labelledby="admin-overview-title"/);
});

test('ogni pulsante statico dichiara il proprio tipo', () => {
  const buttons = [...index.matchAll(/<button\b[^>]*>/g)].map(([button]) => button);
  assert.ok(buttons.length > 20);
  assert.deepEqual(buttons.filter((button) => !/\btype="(?:button|submit)"/.test(button)), []);
});

test('focus e azioni principali rispettano il target tattile minimo', () => {
  assert.match(styles, /:where\(button, a, input, select, textarea\):focus-visible[\s\S]*outline: 3px solid/);
  for (const selector of ['primary-action', 'secondary-action', 'tertiary-action', 'danger-action', 'week-pill']) {
    assert.match(styles, new RegExp(`\\.${selector}\\s*\\{[\\s\\S]{0,240}?min-height:\\s*44px`));
  }
});

test('la directory persone comunica selezione e stato anche senza colore', () => {
  assert.match(app, /aria-current="true"/);
});

test('il pannello amministrativo ha un layout dedicato a 320 pixel', () => {
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.admin-overview-grid[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.admin-dashboard-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 899px\)[\s\S]*\.admin-person-options-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
});

test('il pannello amministrativo espone percorsi rapidi alle aree di lavoro', () => {
  assert.match(index, /class="admin-section-nav"[^>]*aria-label="Sezioni amministrazione"/);
  assert.match(index, /class="agenda-center-toggle"[\s\S]*Agenda centro/);
  assert.doesNotMatch(index, /data-admin-week-link/);
  for (const target of [
    'admin-person-editor',
    'admin-adaptations-section',
    'admin-access-section',
    'admin-configuration-section',
    'admin-activity-section'
  ]) {
    assert.match(index, new RegExp(`href="#${target}"`));
    assert.match(index, new RegExp(`id="${target}"[^>]*tabindex="-1"`));
  }
  assert.match(styles, /\.admin-section-nav a[\s\S]*min-height: 44px/);
});

test('la navigazione amministrativa mostra soltanto le sezioni consentite', () => {
  assert.match(index, /data-admin-nav-people/);
  assert.match(index, /data-admin-nav-access/);
  assert.match(index, /data-admin-nav-configuration/);
  assert.match(index, /data-admin-nav-activity/);
  assert.match(app, /elements\.adminNavPeople\.hidden = !canManagePeople/);
  assert.match(app, /elements\.adminNavAccess\.hidden = !canManageAccess/);
  assert.match(app, /elements\.adminNavConfiguration\.hidden = !canConfigureCenter/);
  assert.match(app, /elements\.adminNavActivity\.hidden = !canViewActivity/);
  assert.match(app, /elements\.adminAccessSection\.hidden = !canManageAccess/);
  assert.match(index, /data-admin-permissions-group/);
  assert.match(app, /elements\.adminPermissionsGroup\.hidden = !canAssignOperationalRoles\(\)[\s\S]*!canDesignateCenterAdministrator\(\)/);
});

test('ruoli, contatti e indicatori della directory hanno etichette accessibili', () => {
  assert.match(index, /admin-person-options[\s\S]*admin\.people\.permissions\.title/);
  assert.match(index, /admin-contact-options[\s\S]*admin\.people\.contactOptions\.title/);
  assert.match(index, /data-admin-participant-administrative-role/);
  assert.match(app, /admin\.people\.initialsTitle[\s\S]*aria-label=/);
  assert.match(app, /admin\.people\.phonePresent[\s\S]*aria-label=/);
});

test('la scheda persona conserva le modifiche e offre annullamento esplicito', () => {
  assert.match(index, /data-admin-cancel-participant>Annulla</);
  assert.match(app, /adminPersonDirty: false/);
  assert.match(app, /function markAdminPersonDirty/);
  assert.match(app, /function confirmAdminPersonTransition/);
  assert.match(app, /function handleAdminCancelParticipant/);
  assert.match(app, /if \(!state\.adminPersonDirty\) \{\s*syncAdminContactForm\(\)/);
});

test('la scheda persona assegna larghezze coerenti ai campi brevi', () => {
  assert.match(index, /admin-person-field-signature/);
  assert.match(index, /admin-person-field-group/);
  assert.match(index, /admin-person-field-diet/);
  assert.match(index, /admin-person-field-phone/);
  assert.match(styles, /\.admin-person-fields\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 0\.85fr\) minmax\(0, 1fr\) minmax\(0, 1\.25fr\)/);
  assert.match(styles, /\.admin-person-field-signature,[\s\S]*?\.admin-person-field-group,[\s\S]*?\.admin-person-field-diet\s*\{[\s\S]*?min-width:\s*0/);
  assert.doesNotMatch(index, /class="field-label admin-field-wide"\s*>\s*Dieta/);
  assert.doesNotMatch(index, /class="field-label admin-field-wide"\s*>\s*Telefono/);
});

test('la configurazione del centro conserva la compilazione fino al salvataggio', () => {
  assert.doesNotMatch(index, /data-admin-center-settings-cancel/);
  assert.match(app, /adminCenterDirty: false/);
  assert.match(app, /function markAdminCenterDirty/);
  assert.doesNotMatch(app, /function handleAdminCenterSettingsCancel/);
  assert.match(app, /if \(!state\.adminCenterDirty\) \{\s*syncAdminCenterSettingsForm\(\)/);
  assert.match(app, /function handleBeforeUnload/);
  assert.match(app, /adminCenterSettingsSection\.setAttribute\('aria-busy', 'true'\)/);
});

test('la scheda persona valida i campi prima della scrittura', () => {
  assert.match(index, /data-admin-participant-name[^>]*required/);
  assert.match(index, /data-admin-participant-signature[^>]*pattern="\[A-Za-z0-9\]\{2,12\}"[^>]*required/);
  assert.match(app, /const profile = validateParticipantProfile\(/);
  assert.match(app, /function focusInvalidAdminParticipantField/);
  assert.match(app, /setAttribute\('aria-invalid', 'true'\)/);
  assert.match(app, /adminPersonEditor\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(app, /adminCancelParticipant\.disabled = true/);
});
