import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const index = readFileSync(new URL('index.html', root), 'utf8');
const app = readFileSync(new URL('app.js', root), 'utf8');
const view = readFileSync(new URL('summary-matrix-view.js', root), 'utf8');
const styles = readFileSync(new URL('summary-matrix-refinements.css', root), 'utf8');
const appStyles = readFileSync(new URL('styles.css', root), 'utf8');

test('riepilogo e cucina conservano Originale e Internazionale come viste distinte', () => {
  assert.match(view, /summary-layout-\$\{layout\}/);
  assert.match(styles, /\.summary-layout-classic \.summary-matrix/);
  assert.match(styles, /\.summary-international-grid[\s\S]*grid-template-columns: repeat\(3/);
});

test('le note cucina usano sempre una chiave traducibile completa', () => {
  assert.match(view, /t\("kitchen\.notes\.title"\)/);
  assert.doesNotMatch(view, /t\("kitchen\.notes"\)/);
});

test('le due giornate sono schermate intere con snap orizzontale', () => {
  assert.match(styles, /\.summary-matrix-track[\s\S]*scroll-snap-type: inline mandatory/);
  assert.match(styles, /\.summary-matrix-screen[\s\S]*flex: 0 0 100%/);
  assert.equal((index.match(/class="summary-day-segment"/g) || []).length, 2);
  assert.match(styles, /\[data-kitchen-panel\] \.meal-grid > \.summary-matrix-track[\s\S]*grid-column: 1 \/ -1/);
  assert.match(view, /summary-day-tone-\$\{normalizeDayTone\(column\.dayIndex\)\}/);
  assert.match(styles, /--summary-day-next:/);
  assert.match(styles, /--summary-day-following:/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.summary-international-mass \{[\s\S]*grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\)/);
});

test('la fascia Messa distingue visivamente Sì e No in ogni palette', () => {
  assert.match(view, /summary-mass-state-yes/);
  assert.match(view, /summary-mass-state-no/);
  assert.match(styles, /--mass-yes-bg:/);
  assert.match(styles, /--mass-no-bg:/);
  assert.match(styles, /\.summary-matrix-mass-band\.summary-mass-state-yes/);
  assert.match(styles, /\.summary-international-mass-group\.summary-mass-state-no/);
  assert.match(styles, /\.summary-mass-control \{[\s\S]*aspect-ratio: 1/);
  assert.match(styles, /\.summary-mass-control-day \{[\s\S]*border-bottom:/);
  assert.match(styles, /\.summary-layout-classic \.summary-day-tone-2 \.summary-mass-control-day \{[\s\S]*font-size: 0\.56rem/);
  assert.match(styles, /\.summary-mass-control \.summary-matrix-mass-yes,[\s\S]*border-radius: 0/);
  assert.match(styles, /--mass-no-bg: color-mix\(in srgb, var\(--danger\) 24%, var\(--surface\)\)/);
  assert.match(styles, /--mass-no-border: color-mix\(in srgb, var\(--danger\) 60%, var\(--line\)\)/);
});

test('la Cucina non mostra Prevista e il riepilogo mantiene nomi e contatti', () => {
  assert.match(view, /if \(kitchen \|\| column\.mealTypeId !== "breakfast"\) return ""/);
  assert.match(view, /href="tel:/);
  assert.match(view, /https:\/\/wa\.me\//);
  assert.match(view, /\$\{kitchen \? "" : `<section class="summary-international-names"/);
});

test('il mobile usa la stessa struttura per le due schermate anche senza situazioni speciali', () => {
  assert.match(view, /summary-screen-has-special/);
  assert.match(view, /summary-screen-ordinary/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.summary-matrix-unit \{\s*display: none/);
  assert.doesNotMatch(styles, /\.summary-screen-ordinary \.summary-international-card \{[\s\S]*grid-template-columns/);
  assert.match(styles, /\.summary-layout-classic \.summary-matrix-row-meals td \{\s*height: 62px/);
});

test('gli invitati restano visibili nel riepilogo internazionale mobile', () => {
  assert.match(view, /summary-international-mobile-guests/);
  assert.match(view, /summary-international-guest-row/);
  assert.match(styles, /\.summary-international-mobile-guests \{[\s\S]*display: none/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.summary-international-mobile-guests \{[\s\S]*display: inline-flex/);
});

test('telefono e WhatsApp restano ben distinti nel popup', () => {
  assert.match(styles, /\.summary-matrix-contact-actions \{[\s\S]*gap: 8px/);
  assert.match(styles, /\.summary-matrix-whatsapp img \{[\s\S]*width: 18px;[\s\S]*height: 18px/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.summary-matrix-contact-actions \{\s*gap: 6px/);
});

test('Originale e Internazionale aprono i contatti dal nome del commensale', () => {
  assert.match(view, /renderClassicNamesRow\(screen, residentLabel\)/);
  assert.match(view, /summary-matrix-people-icon/);
  assert.match(view, /renderNamesCell\(column, \{ compactActions: true, residentLabel \}\)/);
  assert.match(view, /class="summary-matrix-person-trigger" popovertarget=/);
  assert.match(view, /class="summary-matrix-contact-popover"[^>]*popover role="dialog"/);
  assert.match(view, /summary\.contactPerson/);
  assert.match(styles, /\.summary-matrix-contact-popover::backdrop/);
  assert.match(styles, /text-underline-offset: 3px;\s*}\s*\.summary-matrix-person-trigger \.summary-matrix-person-name/);
  assert.match(view, /renderInternationalCard[\s\S]*renderNamesCell\(column, \{ compactActions: true, residentLabel \}\)/);
  assert.match(styles, /\.summary-international-names \.summary-matrix-names \{[\s\S]*display: flex;[\s\S]*flex-wrap: wrap/);
  assert.match(styles, /\.summary-international-names \.summary-matrix-names > li \{[\s\S]*flex: 0 1 auto/);
  assert.match(styles, /\.summary-international-names \.summary-matrix-person-trigger \{[\s\S]*min-height: 30px;[\s\S]*line-height: 1\.05/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.summary-international-names \.summary-matrix-person-trigger \{[\s\S]*min-height: 34px/);
});

test('le diete operative mostrano solo identificatore e molteplicità', () => {
  assert.match(view, /function formatDietIdentifier\(tag\)/);
  assert.match(view, /count > 1 \? `\$\{identifier\} \(\$\{count\}\)` : identifier/);
  assert.match(view, /participant\.dietTags\.map\(\(tag\) => formatDietIdentifier\(tag\)\)/);
  assert.match(view, /dinner: "🍲"/);
});

test('mese e settimana condividono il selettore segmentato e la spunta verde', () => {
  assert.equal((index.match(/class="summary-day-segment meal-view-segment"/g) || []).length, 2);
  assert.doesNotMatch(index, /data-preference-view=/);
  assert.doesNotMatch(index, /data-view-preference-control/);
  assert.doesNotMatch(index, /data-view-pin-button/);
  assert.doesNotMatch(index, /class="meal-view-pin"/);
  assert.doesNotMatch(app, /VIEW_PREFERENCE_HOLD_MS|savePreferredView|loadStoredPreferredView/);
  assert.match(app, /return loadCachedDefaultView\(\) === 'week' \? 'week' : 'participant'/);
  assert.match(styles, /\.week-meal-button\.meal-state-present[\s\S]*background: var\(--primary\)/);
});

test('il pannello viene escluso dalle viste operative e monta una sola scheda alla volta', () => {
  assert.match(index, /needsAdminInterface[\s\S]*adminShell\.remove\(\)/);
  assert.match(app, /function initializeAdminProgressiveSections\(\)/);
  assert.match(app, /function mountAdminSection\(section\)/);
  assert.match(app, /node\.remove\(\)/);
  assert.match(app, /applyTranslations\(node\)/);
});

test('mese e settimana si possono cambiare anche con uno swipe orizzontale', () => {
  assert.match(app, /addEventListener\('touchstart', handleMealViewSwipeStart/);
  assert.match(app, /handleMealViewSwipeStart[\s\S]*?closest\('input, select, textarea, dialog, \[contenteditable="true"\]'\)/);
  assert.match(app, /touchend', handleMealViewSwipeEnd, \{ passive: false \}/);
  assert.match(app, /event\.preventDefault\(\)/);
  assert.match(app, /state\.mode === 'participant'[\s\S]*shiftMonth\(direction\)/);
  assert.match(app, /state\.mode === 'week'[\s\S]*shiftWeek\(direction \* 7\)/);
  assert.match(styles, /\[data-participant-panel\],[\s\S]*\[data-week-panel\] \{[\s\S]*touch-action: pan-y/);
});

test('il selettore Oggi Domani scorre con la stessa animazione nelle due direzioni', () => {
  assert.match(app, /selectSummaryMatrixDay\(offset, \{ smooth: true \}\)/);
  assert.match(app, /selectKitchenMatrixDay\(offset, \{ smooth: true \}\)/);
  assert.match(app, /function selectSummaryMatrixDay\(offset, \{ smooth = false, scroll = true \} = \{\}\)/);
  assert.match(app, /function selectKitchenMatrixDay\(offset, \{ smooth = false, scroll = true \} = \{\}\)/);
  assert.match(app, /scheduleOperationalAutoScroll\(\{ reset: true, delayMs: 220 \}\)/);
  assert.match(view, /behavior: smooth \? "smooth" : "auto"/);
});

test('impostazioni e manutenzione presentano controlli graficamente raggruppati', () => {
  assert.match(index, /fieldset class="admin-layout-settings-card"/);
  assert.match(index, /admin-audit-section admin-maintenance-row[\s\S]*<button[^>]*data-admin-audit-load/);
  assert.doesNotMatch(index, /Caricate solo quando servono\./);
});

test('Classic resta un valore interno ma viene presentato come Originale in ogni lingua', () => {
  const expected = {
    it: 'Originale',
    en: 'Original',
    fr: 'Original',
    es: 'Original',
    de: 'Original'
  };
  for (const [language, label] of Object.entries(expected)) {
    const translations = JSON.parse(readFileSync(new URL(`i18n/${language}.json`, root), 'utf8'));
    assert.equal(translations['admin.adaptations.layout.classic'], label);
  }
  assert.equal((index.match(/value="classic" data-i18n="admin\.adaptations\.layout\.classic">Originale/g) || []).length, 2);
});

test('Originale e Internazionale usano indicatori Messa distinti e proporzionati', () => {
  assert.match(styles, /summary-layout-diners\.summary-layout-classic[\s\S]*\.summary-matrix-mass-yes[\s\S]*width: 28px;[\s\S]*height: 28px;[\s\S]*border-radius: 50%;[\s\S]*color: #fff/);
  assert.match(styles, /summary-layout-kitchen\.summary-layout-classic[\s\S]*\.summary-matrix-mass-no[\s\S]*background: var\(--danger\)/);
  assert.match(styles, /summary-layout-diners\.summary-layout-classic td\.summary-matrix-mass-band\.summary-mass-state-yes,[\s\S]*background: var\(--mass-yes-bg\)/);
  assert.match(styles, /summary-layout-kitchen\.summary-layout-classic td\.summary-matrix-mass-band\.summary-mass-state-no[\s\S]*background: var\(--mass-no-bg\)/);
  assert.match(styles, /summary-layout-international \.summary-mass-control \.summary-matrix-mass-yes,[\s\S]*width: 34px;[\s\S]*height: 34px;[\s\S]*border-radius: 7px/);
});

test('il contorno di oggi conserva spazio interno in Elegante ed Essenziale', () => {
  assert.match(styles, /html\[data-interface-style="cool"\] \.week-matrix-row-today,[\s\S]*html\[data-interface-style="urban"\] \.week-matrix-row-today \{[\s\S]*padding: 2px;[\s\S]*border: 1px solid var\(--primary\)/);
  assert.match(styles, /week-matrix-row-today > button \{[\s\S]*min-height: calc\(var\(--week-cell-height\) - 4px\)/);
});

test('la manutenzione usa righe uniformi, registro in dialogo e backup con avanzamento', () => {
  assert.match(index, /admin-calendar-extension admin-maintenance-row[\s\S]*data-admin-calendar-extension-status[\s\S]*admin-maintenance-action/);
  assert.match(index, /data-admin-audit-load[^>]*>Visualizza registro<\/button>/);
  assert.match(index, /data-admin-audit-dialog[\s\S]*data-admin-audit-date-filter[\s\S]*data-admin-audit-user-filter[\s\S]*<table/);
  assert.match(index, /data-admin-export-button[\s\S]*data-admin-export-spinner[^>]*hidden/);
  assert.match(app, /listAuditEvents\(\{[\s\S]*maximum: 20[\s\S]*renderFilteredAuditEvents/);
  assert.match(app, /adminExportButton\.disabled = true[\s\S]*adminExportSpinner\.hidden = false/);
  assert.match(appStyles, /\.admin-maintenance-row \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(appStyles, /\.admin-maintenance-action,[\s\S]*min-height: 44px/);
});

test('il registro mostra Quando Chi Cosa e diventa una lista di schede su mobile', () => {
  assert.match(index, />Quando<\/th>[\s\S]*>Chi<\/th>[\s\S]*>Cosa<\/th>/);
  assert.match(index, /data-admin-audit-more[^>]*>Carica versioni precedenti<\/button>/);
  assert.match(app, /function resolveAuditActorLabel[\s\S]*participant\?\.displayName/);
  assert.match(app, /function formatAuditDateTime[\s\S]*admin\.activity\.todayAt[\s\S]*admin\.activity\.yesterdayAt/);
  assert.match(appStyles, /@media \(max-width: 767px\)[\s\S]*\.admin-audit-table tr \{[\s\S]*display: grid/);
});

test('le note non sopravvivono al cambio di giorno e quelle passate non vengono mostrate', () => {
  assert.match(app, /const selectedNote = state\.kitchenNotes\[state\.kitchenDayOffset\];[\s\S]*selectedNote\?\.dateId === formatDateId\(getKitchenDate\(\)\)[\s\S]*: null/);
  assert.match(app, /function filterKitchenNoteForToday\(note\)[\s\S]*writtenDateId === todayId/);
  assert.match(app, /const visibleNote = filterKitchenNoteForToday\(state\.weekOperationalNote\)/);
  assert.match(app, /const visibleKitchenOperations = state\.kitchenOperations\.map[\s\S]*filterKitchenNoteForToday\([\s\S]*operationDays: visibleKitchenOperations/);
});
