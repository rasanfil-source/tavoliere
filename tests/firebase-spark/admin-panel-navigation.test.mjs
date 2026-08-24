import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectRoot = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const [html, css, refinements, app, firebaseClient, centerSettings, adminCenter, administratorAuth, summaryView, participantData] = await Promise.all([
  readFile(new URL('index.html', projectRoot), 'utf8'),
  readFile(new URL('styles.css', projectRoot), 'utf8'),
  readFile(new URL('summary-matrix-refinements.css', projectRoot), 'utf8'),
  readFile(new URL('app.js', projectRoot), 'utf8'),
  readFile(new URL('firebase-client.js', projectRoot), 'utf8'),
  readFile(new URL('center-settings.js', projectRoot), 'utf8'),
  readFile(new URL('admin-center.js', projectRoot), 'utf8'),
  import(new URL('domain/administrator-auth.mjs', projectRoot)),
  readFile(new URL('summary-matrix-view.js', projectRoot), 'utf8'),
  readFile(new URL('participant-data.js', projectRoot), 'utf8')
]);

test('il nome Oggi a tavola non incorpora mai il punto esclamativo', async () => {
  for (const language of ['it', 'en', 'fr', 'es', 'de']) {
    const catalog = await readFile(new URL(`i18n/${language}.json`, projectRoot), 'utf8');
    assert.doesNotMatch(catalog, /Oggi a tavola\s*!/);
  }
});

test('il riepilogo amministrativo non richiede il vecchio indicatore visivo del calendario', () => {
  assert.doesNotMatch(html, /data-admin-overview-calendar/);
  assert.match(app, /if \(elements\.adminOverviewCalendar\) \{[\s\S]*elements\.adminOverviewCalendar\.textContent/);
});

test('ordine operativo delle schede amministrative', () => {
  const navigation = html.match(/<nav class="admin-section-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  const sections = [...navigation.matchAll(/data-admin-section-id="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(sections, ['configuration', 'people', 'overview', 'adaptations', 'access', 'activity']);
  assert.match(navigation, /role="tablist"/);
  assert.match(navigation, />Link per accedere<\/a>/);
  assert.match(navigation, />Manutenzione<\/a>/);
  assert.doesNotMatch(navigation, />Attività<\/a>/);
  assert.doesNotMatch(navigation, /data-admin-week-link/);
});

test('il Pannello proprietario usa didascalie grammaticalmente coerenti', () => {
  assert.match(html, /<h2>Pannello Proprietario<\/h2>[\s\S]*Genera il collegamento per il responsabile del centro[\s\S]*Gestisce centri e amministratori\./);
  assert.doesNotMatch(html, />Gestisci centri e amministratori\.</);
});

test('la configurazione raggruppa identita e orari e termina con un solo salvataggio', () => {
  const configuration = html.match(/id="admin-configuration-section"[\s\S]*?<div class="admin-role-stack"/)?.[0] || '';
  const identity = configuration.indexOf('Identità centro');
  const centerName = configuration.indexOf('Nome centro');
  const avatar = configuration.indexOf('Icona del centro');
  const displayName = configuration.indexOf('Nome di presentazione');
  const schedule = configuration.indexOf('Orari delle prenotazioni');
  const breakfast = configuration.indexOf('data-admin-cutoff-breakfast');
  const lunch = configuration.indexOf('data-admin-cutoff-lunch');
  const dinner = configuration.indexOf('data-admin-cutoff-dinner');
  const responsible = configuration.indexOf('Responsabile del centro');
  const save = configuration.indexOf('data-admin-center-settings-save');

  assert.ok(identity >= 0 && identity < centerName);
  assert.ok(centerName < avatar && avatar < displayName);
  assert.ok(displayName < schedule && schedule < breakfast);
  assert.ok(breakfast < lunch && lunch < dinner);
  assert.ok(dinner < responsible && responsible < save);
  assert.equal((configuration.match(/data-admin-center-settings-save/g) || []).length, 1);
  assert.doesNotMatch(configuration, /data-admin-center-avatar-save/);
  assert.doesNotMatch(app, /adminCenterAvatarSave|handleAdminCenterAvatarSave/);
  assert.match(app, /state\.pendingCenterAvatarDataUrl = await prepareCenterAvatar\(file\);[\s\S]*?state\.adminCenterDirty = true/);
  assert.doesNotMatch(configuration, /data-admin-center-settings-cancel/);
  assert.doesNotMatch(configuration, /data-bootstrap-button/);
});

test('la scheda Amministratore usa tutta la larghezza anche su tablet', () => {
  const tabletRules = css.match(/@media \(max-width: 899px\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(tabletRules, /\.admin-role-stack \{[\s\S]*display: block;[\s\S]*width: 100%/);
  assert.match(tabletRules, /#admin-access-section > \.admin-control-section \{[\s\S]*width: 100%;[\s\S]*max-width: none/);
  assert.doesNotMatch(tabletRules, /\.admin-role-stack \{[\s\S]*grid-template-columns: repeat\(2/);
});

test('i contatti del progetto compaiono una sola volta e soltanto in Aspetto', () => {
  assert.equal((html.match(/href="https:\/\/github\.com\/rasanfil-source\/tavoliere#readme"/g) || []).length, 1);
  assert.equal((html.match(/class="happyduck-contact" href="mailto:rasanfil@gmail\.com"/g) || []).length, 1);
  assert.doesNotMatch(html, /project-info-card|project-info-title|project\.info\./);
  assert.match(html, /class="happyduck-contact" href="mailto:rasanfil@gmail\.com"[^>]*data-i18n-aria-label="project\.contact\.ariaLabel"/);
  assert.match(html, /class="happyduck-duck"[\s\S]*class="happyduck-name"[\s\S]*Happy[\s\S]*Duck[\s\S]*class="happyduck-action"/);
  assert.doesNotMatch(html, />\s*rasanfil@gmail\.com\s*</);
  assert.match(html, /class="project-readme-footer project-signature-footer"[\s\S]*data-i18n="project\.contact\.heading">Per informazioni e contatti[\s\S]*class="project-contact-links"[\s\S]*class="happyduck-contact"[\s\S]*class="project-readme-link project-link-card"[\s\S]*data-i18n="project\.github\.label">Oggi a tavola/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /<img class="happyduck-duck" src="\/icons\/happyduck\.png\?v=20260823a" width="34" height="34" loading="lazy" decoding="async" alt="">/);
  assert.match(css, /\.happyduck-contact[\s\S]*min-height: 44px[\s\S]*\.happyduck-duck[\s\S]*width: 34px[\s\S]*object-fit: contain/);
  assert.doesNotMatch(css, /\.project-info-card|\.project-info-line/);
  assert.match(css, /\.project-signature-footer[\s\S]*min-height: 44px/);
  assert.match(css, /\.project-link-card[\s\S]*min-height: 44px[\s\S]*border-radius: 12px[\s\S]*\.github-mark[\s\S]*width: 30px/);
});

test('HappyDuck e GitHub hanno la stessa altezza e restano affiancati anche su mobile', () => {
  assert.match(css, /\.project-link-card\s*\{[\s\S]*height:\s*48px/);
  assert.match(css, /\.happyduck-contact\s*\{[\s\S]*height:\s*48px/);
  assert.match(css, /\.project-contact-links\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*\.project-contact-links[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});

test('la firma usa il nome pubblico Oggi a tavola', () => {
  const footer = html.match(/<footer class="project-readme-footer project-signature-footer">[\s\S]*?<\/footer>/)?.[0] || '';
  assert.match(footer, /class="github-mark"[\s\S]*data-i18n="project\.github\.label">Oggi a tavola/);
  assert.doesNotMatch(footer, /Tutti a tavola|Tavoliere/);
  assert.match(footer, /data-i18n-aria-label="project\.github\.repositoryAriaLabel"/);
});

test('agenda centro vive nella vista settimana e sostituisce il vecchio collegamento', () => {
  assert.doesNotMatch(html, /data-admin-week-link|>Settimana operativa<\/a>/);
  assert.match(html, /<details class="week-operations"[\s\S]*class="agenda-center-toggle"[\s\S]*Agenda centro/);
  assert.match(html, /class="week-operations-grid"[\s\S]*Ammalati[\s\S]*Note[\s\S]*Dieta occasionale/);
  assert.match(css, /\.week-operations-grid[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.week-operations-grid[\s\S]*grid-template-columns: 1fr/);
});

test('la palette colori usa un selettore nativo con anteprima immediata', () => {
  const paletteSelect = html.match(/<select data-admin-theme-select[^>]*>([\s\S]*?)<\/select>/)?.[1] || '';
  const paletteValues = [...paletteSelect.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(paletteValues, [
    'inchiostro',
    'smeraldo',
    'terracotta',
    'confetto',
    'salvia',
    'oliva',
    'neutro'
  ]);
  assert.match(html, /value="terracotta" data-i18n="admin\.adaptations\.theme\.terracotta"/);
  assert.match(css, /html\[data-theme="terracotta"\][\s\S]*--primary: #b1502f;[\s\S]*--bg: #f8f1e7;[\s\S]*--surface: #fffdf9;/);
  assert.doesNotMatch(html, /value="(?:giallino|beige|rosso-pallido)"/);
  assert.match(html, /data-theme-select-preview/);
  assert.doesNotMatch(html, /data-theme-select-trigger|data-admin-theme-radio/);
  assert.match(app, /adminThemeSelect\.addEventListener\('change', handleThemeSelectChange\)/);
  assert.match(app, /document\.documentElement\.dataset\.theme = selectedPalette/);
  assert.match(app, /function renderMode\(\) \{[\s\S]*?const activePalette = state\.pendingThemePalette[\s\S]*?\|\| state\.centerContactSettings\.themePalette[\s\S]*?document\.documentElement\.dataset\.theme = activePalette/);
  assert.match(html, /Se ti piace, salva questa scelta di colori/);
  assert.match(centerSettings, /const ALLOWED_THEME_PALETTES = new Set/);
  assert.match(centerSettings, /ALLOWED_THEME_PALETTES\.has\(value\) \? value : 'inchiostro'/);
  assert.match(html, /<html lang="it" data-theme="inchiostro">/);
  assert.match(app, /themePalette: 'inchiostro'/);
  assert.match(app, /summaryResidentLabel: 'name'/);
  assert.match(centerSettings, /normalizeResidentLabel\(data\.summaryResidentLabel, 'name'\)/);
});

test('il proprietario condivide un unico messaggio breve senza nominare il centro', () => {
  assert.equal((html.match(/data-owner-invitation-share/g) || []).length, 1);
  assert.match(html, /data-owner-invitation-share[^>]*>[\s\S]*?Condividi/);
  assert.match(app, /function buildOwnerInvitationShareText\(expiryLabel\)/);
  assert.match(app, /Ecco il collegamento personale per accedere come responsabile del centro su Oggi a tavola/);
  assert.doesNotMatch(app, /Ti invio il collegamento personale per configurare/);
  assert.doesNotMatch(app, /buildOwnerInvitationShareText[\s\S]{0,1600}centerContactSettings\.name/);
});

test('Aspetto separa il linguaggio visivo dalla palette e viene salvato per il centro', () => {
  const styleSelect = html.match(/<select data-admin-interface-style-select[^>]*>([\s\S]*?)<\/select>/)?.[1] || '';
  const styleValues = [...styleSelect.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(styleValues, ['original', 'cool', 'urban-plus', 'future']);
  assert.match(html, /data-i18n="admin\.adaptations\.interfaceStyle\.label">Aspetto/);
  assert.match(app, /applyInterfaceStyle\(activeInterfaceStyle\)/);
  assert.match(app, /interfaceStyle: interfaceStyleToSave/);
  assert.match(centerSettings, /const ALLOWED_INTERFACE_STYLES = new Set\(\['original', 'cool', 'urban-plus', 'future'\]\)/);
  assert.match(centerSettings, /value === 'urban' \? 'urban-plus' : value/);
  assert.match(styleSelect, /value="urban-plus"[^>]*selected/);
  assert.match(app, /INTERFACE_STYLE_VALUES\.has\(migratedValue\) \? migratedValue : 'urban-plus'/);
  assert.match(centerSettings, /ALLOWED_INTERFACE_STYLES\.has\(migratedValue\) \? migratedValue : 'urban-plus'/);
  assert.match(app, /if \(isWeek && !needsResidentLogin && canManageDailyOperations\(\)\) \{[\s\S]*?renderWeekOperations\(\);/);
});

test('il nuovo amministratore richiede una persona diversa da quello attuale', () => {
  assert.match(html, /data-admin-candidate-select>[\s\S]*admin\.invitations\.choosePerson">Scegli una persona/);
  assert.match(app, /const configuredAdministratorId = getConfiguredAdministratorParticipantId\(\)/);
  assert.match(app, /participant\.participantId !== configuredAdministratorId/);
  assert.match(app, /<option value="" selected disabled>/);
});

test('i link operativi non sono utilizzabili senza token e viaggiano con il login vice', () => {
  assert.match(participantData, /privateSettings'[\s\S]*'operationalLinks'/);
  assert.match(participantData, /administratorAuthorized: true,[\s\S]*operationalLinks/);
  assert.match(
    participantData,
    /await authorizeResidentAdministratorSession\([\s\S]*authorizedLinksSnapshot[\s\S]*privateSettings'[\s\S]*'operationalLinks'/
  );
  assert.match(app, /normalizeOperationalLinksFromAuthorizedLogin\(result\.operationalLinks\)/);
  assert.match(app, /control\.disabled = !enabled/);
  assert.match(app, /control\.removeAttribute\('href'\)/);
  assert.match(app, /\[data-copy-access-link\], \[data-open-access-link\], \[data-share-access-link\]/);
  assert.match(app, /input\.value = canView && tokenReady \? getCachedAccessLinkUrl\(kind\) : ''/);
});

test('titolo e seconda riga iniziali appartengono al solo responsabile', () => {
  const configuration = html.match(/id="admin-configuration-section"[\s\S]*?<div class="admin-role-stack"/)?.[0] || '';
  const adaptations = html.match(/id="admin-adaptations-section"[\s\S]*?id="admin-access-section"/)?.[0] || '';
  assert.match(html, /<h1 data-title>Oggi a tavola<\/h1>/);
  assert.match(configuration, /data-admin-app-display-name-picker hidden/);
  assert.match(configuration, /data-admin-app-display-name[^>]*maxlength="60"/);
  assert.match(configuration, /data-admin-app-display-subtitle[^>]*maxlength="100"/);
  assert.match(configuration, /data-admin-startup-presentation-enabled/);
  assert.doesNotMatch(adaptations, /data-admin-app-display-name/);
  assert.doesNotMatch(adaptations, /data-admin-app-display-subtitle/);
  assert.match(app, /const canEditAppDisplayName = state\.adminRole === 'OWNER' && !state\.residentSettingsMode/);
  assert.match(app, /state\.adminRole === 'OWNER'[\s\S]*?appDisplayName: elements\.adminAppDisplayName\?\.value/);
  assert.match(app, /appDisplaySubtitle: elements\.adminAppDisplaySubtitle\?\.value/);
  assert.doesNotMatch(app, /appDisplayNameToSave/);
  assert.match(app, /showResidentLogin[\s\S]*?\? appDisplayName/);
  assert.match(centerSettings, /DEFAULT_APP_DISPLAY_NAME = 'Oggi a tavola'/);
  assert.match(centerSettings, /DEFAULT_APP_DISPLAY_SUBTITLE = 'Per prenotarsi sempre in tempo!'/);
  assert.match(html, /<div class="startup-gate"[^>]*data-startup-gate/);
  const splash = html.match(/<div class="startup-splash"[\s\S]*?<\/div>/)?.[0] || '';
  assert.match(splash, /<div class="startup-splash" data-startup-splash>/);
  assert.match(splash, /<img src="\/icons\/splash-512-transparent\.png/);
  assert.match(css, /\.startup-gate\s*\{[\s\S]*?background:\s*#ffffff;/);
  assert.match(splash, /data-startup-splash-copy[^>]*hidden/);
  assert.match(splash, /data-startup-splash-title[\s\S]*Oggi a tavola/);
  assert.doesNotMatch(splash, /Oggi a Tavola/);
  assert.match(splash, /data-startup-splash-subtitle[\s\S]*Per prenotarsi sempre in tempo!/);
  assert.match(app, /function syncStartupSplashPresentation\(\)[\s\S]*appDisplaySubtitle/);
  assert.match(app, /startupSplashCopy\.hidden = state\.centerContactSettings\.startupPresentationEnabled !== true/);
  assert.match(app, /function hideStartupSplash\(\)[\s\S]*?\[data-startup-gate\]/);
  assert.doesNotMatch(app, /function hideStartupSplash\(\)[\s\S]{0,160}?querySelector\('\[data-startup-splash\]'\)/);
  assert.doesNotMatch(splash, /data-title/);
});

test('la posizione zero resta valida quando si salva una Persona esistente', () => {
  assert.equal((app.match(/participant\?\.sortOrder\s*\?\?/g) || []).length, 2);
  assert.doesNotMatch(app, /participant\?\.sortOrder\s*\|\|/);
});

test('la configurazione permette di impostare o sostituire la password amministratori', () => {
  const configuration = html.match(/id="admin-configuration-section"[\s\S]*?<div class="admin-role-stack"/)?.[0] || '';
  assert.match(configuration, /data-admin-shared-password-row/);
  assert.match(configuration, /data-admin-shared-password-new/);
  assert.match(configuration, /admin\.sharedPassword\.configurationHelp/);
  assert.match(app, /adminSharedPasswordRow\.hidden = !canConfigureCenter \|\| state\.residentSettingsMode/);
  assert.doesNotMatch(app, /newSharedAdminPassword && state\.centerContactSettings\.adminSharedPasswordSet[\s\S]*!currentSharedAdminPassword/);
  assert.match(firebaseClient, /getAdministratorTechnicalEmail\(centerId, nextVersion\)/);
  assert.match(firebaseClient, /uid: replacement\.user\.uid/);
});

test('il riepilogo Essenziale usa le icone lineari di Elegante', () => {
  assert.match(summaryView, /interfaceStyle === "cool" \|\| interfaceStyle === "urban"/);
});

test('swipe mese e settimana cambia il periodo e applica uno snap leggero', () => {
  assert.match(app, /handleMealViewSwipeStart[\s\S]*?closest\('input, select, textarea, dialog, \[contenteditable="true"\]'\)/);
  assert.match(app, /touchend', handleMealViewSwipeEnd, \{ passive: false \}/);
  assert.match(app, /event\.preventDefault\(\)/);
  assert.match(app, /state\.mode === 'participant'[\s\S]*shiftMonth\(direction\)/);
  assert.match(app, /state\.mode === 'week'[\s\S]*shiftWeek\(direction \* 7\)/);
  assert.match(refinements, /@keyframes meal-snap-forward/);
  assert.match(refinements, /prefers-reduced-motion:\s*reduce/);
});

test('Aspetto elimina il falso riferimento a tutte le persone e descrive le viste operative corrette', () => {
  assert.match(html, /admin\.adaptations\.description">Personalizzazioni dell'aspetto e del comportamento dell'app\./);
  assert.match(html, /data-view-preference-help[^>]*>Vista di apertura predefinita del centro\./);
  assert.match(html, /data-admin-layouts-help[^>]*>Scegli l'aspetto del riepilogo e della cucina\./);
  assert.doesNotMatch(html, /per tutte le persone/i);
  assert.match(html, /admin\.adaptations\.theme\.help">Scegli la combinazione di colori dell'app\. L'anteprima si applica subito\./);
  const viewPosition = html.indexOf('data-admin-default-view-picker');
  const stylePosition = html.indexOf('data-admin-interface-style-picker');
  const layoutsPosition = html.indexOf('data-admin-layout-pickers');
  assert.ok(viewPosition >= 0 && stylePosition > viewPosition && stylePosition < layoutsPosition);
});

test('il salvataggio della configurazione conserva la lingua del centro', () => {
  const start = app.indexOf('async function performAdminCenterSettingsSave()');
  const end = app.indexOf('async function saveAdministratorAsParticipant', start);
  const handler = app.slice(start, end);
  assert.match(handler, /language: state\.centerContactSettings\.language \|\| 'it'/);
});

test('gli elenchi amministrativi vuoti mostrano un solo messaggio', () => {
  const invitations = app.match(/function renderAdminInvitationList\(\)[\s\S]*?\r?\n}\r?\n\r?\nasync function handleAdminInvitationListClick/)?.[0] || '';
  const accounts = app.match(/function renderAdminAccountList\(\)[\s\S]*?\r?\n}\r?\n\r?\nasync function handleAdminAccountListClick/)?.[0] || '';

  assert.doesNotMatch(invitations, /\.join\(''\) \|\|/);
  assert.match(invitations, /adminInvitationManagementStatus\.textContent/);
  assert.doesNotMatch(accounts, /\.join\(''\) \|\|/);
  assert.match(accounts, /adminAccountStatus\.textContent/);
  assert.doesNotMatch(accounts, /t\('status\.active'\)/);
  assert.match(accounts, /const statusBadge = active[\s\S]*\? ''[\s\S]*admin\.accounts\.revoked/);
});

test('i collegamenti operativi mostrano URL e azioni esplicite di copia apertura e condivisione', () => {
  assert.match(html, /data-operational-link-url="pasti"[^>]*readonly/);
  assert.match(html, /data-operational-link-url="cucina"[^>]*readonly/);
  assert.match(html, /data-copy-access-link="pasti"/);
  assert.match(html, /data-copy-access-link="cucina"[^>]*aria-label="Copia il link per la cucina"/);
  assert.match(html, /data-open-access-link="pasti"/);
  assert.match(html, /data-open-access-link="cucina"/);
  assert.match(html, /data-share-access-link="pasti"/);
  assert.match(html, /data-share-access-link="cucina"/);
  assert.match(app, /button\.addEventListener\('click', handleAccessLinkCopy\)/);
  assert.match(html, /data-open-access-link="cucina"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(app, /getCachedAccessLinkUrl\(scope\) \|\| await resolveAccessLinkUrl\(scope\)/);
  assert.match(app, /await navigator\.clipboard\.writeText\(url\)/);
  assert.match(app, /control\.href = getCachedAccessLinkUrl\(kind\)/);
  assert.match(app, /showOperationalLinkFeedback\(scope, t\('status\.linkCopied'\)\)/);
  assert.match(app, /data-access-link-feedback[\s\S]*2000/);
  assert.match(
    app,
    /async function handleAccessLinkShare[\s\S]*getCachedAccessLinkUrl\(scope\) \|\| await resolveAccessLinkUrl\(scope\)/
  );
  assert.match(app, /await navigator\.share\(shareData\)/);
  assert.match(app, /openAccessShareDialog\(label, url\)/);
  assert.match(app, /https:\/\/wa\.me\/\?text=/);
  assert.match(app, /mailto:\?subject=/);
  assert.match(app, /access-share-target/);
  assert.match(app, /access-share-option/);
  assert.match(app, /function handleAccessLinkCopy/);
  assert.match(app, /function handleAccessLinkShare/);
  assert.match(app, /navigator\.share/);
  assert.match(html, /<svg aria-hidden="true" viewBox="0 0 24 24">/);
  assert.doesNotMatch(html, /data-generate-links/);
  assert.match(app, /ensureOperationalLinks\(\)/);
  assert.match(app, /buildOperationalLink\('participant', links\.publicTokenId, centerId, 'friendly'\)/);
  assert.match(app, /buildOperationalLink\('kitchen', links\.kitchenTokenId, centerId\)/);
});

test('Copia conserva la gerarchia primaria senza modificare il tasto Esci', () => {
  assert.match(css, /\.access-link-copy\s*\{[\s\S]*?border: 1px solid var\(--primary\);[\s\S]*?background: var\(--primary\);/);
  assert.match(css, /\.primary-action\s*\{[\s\S]*?background: var\(--primary\) !important;/);
  assert.doesNotMatch(css, /\.access-link-copy\s*\{[\s\S]*?#2e7d32/);
});

test('la navigazione precede il contenuto completo della panoramica', () => {
  const navigationPosition = html.indexOf('data-admin-section-nav');
  const overviewPosition = html.indexOf('class="admin-overview-content"');
  const linksPosition = html.indexOf('data-operational-links');

  assert.ok(navigationPosition >= 0);
  assert.ok(overviewPosition > navigationPosition);
  assert.ok(linksPosition > overviewPosition);
});

test('il primo accesso apre Configurazione e i successivi Panoramica', () => {
  assert.match(app, /\? 'overview'\s*:\s*'configuration'/);
  assert.match(app, /getCenterScopedStorageKey\(ADMIN_SECTION_VISIT_KEY\)/);
});

test('deep-link e capability governano la scheda richiesta', () => {
  assert.match(app, /window\.addEventListener\('hashchange', handleAdminHashChange\)/);
  assert.match(app, /function isAdminSectionAllowed\(section\)/);
  assert.match(app, /CAPABILITIES\.MANAGE_CENTER_SETTINGS/);
  assert.match(app, /CAPABILITIES\.MANAGE_PARTICIPANTS/);
  assert.match(app, /CAPABILITIES\.VIEW_AUDIT_LOG/);
});

test('il vice non può aprire la scheda Amministratore neppure con un deep-link', () => {
  assert.match(app, /access: \[CAPABILITIES\.MANAGE_ADMINS\]/);
  assert.match(app, /function isAdminSectionAllowed\(section\)/);
  assert.match(app, /if \(!isAdminSectionAllowed\(state\.adminActiveSection\)\)/);
  assert.match(app, /elements\.adminNavAccess\.hidden = !canManageAccess/);
});

test('il residente semplice vede e monta soltanto la scheda Aspetto', () => {
  assert.match(app, /const RESIDENT_SETTINGS_ACCESS = 'resident-settings'/);
  assert.match(app, /function shouldOpenResidentSettingsPanel\(\)[\s\S]*?!state\.residentAdministratorAuthorized[\s\S]*?!state\.adminRole/);
  assert.match(app, /function updateControlPanelEntryHref\(\)[\s\S]*?adminEntryUrl\.searchParams\.set\('access', RESIDENT_SETTINGS_ACCESS\)/);
  assert.match(app, /if \(state\.residentSettingsMode\) \{[\s\S]*?renderResidentSettingsPanel\(\);[\s\S]*?reconcileAdminAccessWithoutStrongUser\(\);[\s\S]*?return;/);
  assert.match(app, /if \(state\.residentSettingsMode\) \{[\s\S]*?elements\.adminNavConfiguration\.hidden = true;[\s\S]*?elements\.adminNavAdaptations\.hidden = false;[\s\S]*?elements\.adminNavAccess\.hidden = true;[\s\S]*?mountAdminSection\('adaptations'\);[\s\S]*?return;/);
  assert.match(app, /async function handleAdminAdaptationsSave\(\)[\s\S]*?if \(state\.residentSettingsMode\) \{[\s\S]*?storeResidentPreferences\(preferences\)/);
  assert.match(app, /function syncAdaptationsContextCopy\(\)[\s\S]*?adminSectionNav\.hidden = residentDeviceMode/);
  assert.match(app, /resident\.preferences\.defaultViewHelp/);
  assert.match(app, /resident\.preferences\.layoutsHelp/);
  assert.match(app, /adminKitchenLayoutPicker\.hidden = residentDeviceMode/);
  assert.match(app, /summaryResidentLabel: elements\.adminSummaryResidentLabelSelect\?\.value/);
  assert.match(app, /preferences\.summaryResidentLabel \? \{ summaryResidentLabel: preferences\.summaryResidentLabel \}/);
});

test('una sola scheda amministrativa è visibile su tutti gli schermi', () => {
  assert.match(css, /Modalità schedario: una sola scheda amministrativa visibile alla volta/);
  assert.match(css, /\.admin-panel\[data-admin-section="overview"\]/);
  assert.doesNotMatch(css, /\.admin-panel\[data-mobile-section=/);
  assert.match(css, /display: none !important/);
});

test('la navigazione dichiara controlli e stato accessibili', () => {
  const tabs = [...html.matchAll(/data-admin-section-id="([^"]+)"[^>]*role="tab"[^>]*aria-controls="([^"]+)"/g)];
  assert.equal(tabs.length, 6);
  assert.match(app, /aria-selected/);
});

test('sul mobile le schede supportano swipe e snap sincronizzato', () => {
  assert.match(app, /addEventListener\('touchstart', handleAdminSectionSwipeStart/);
  assert.match(app, /addEventListener\('touchend', handleAdminSectionSwipeEnd/);
  assert.match(app, /ADMIN_SECTIONS\.filter\(isAdminSectionAllowed\)/);
  assert.match(app, /await requestAdminSectionChange\(nextSection, \{ updateHash: true \}\)/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.admin-section-nav \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(css, /\.admin-section-nav[\s\S]{0,240}scroll-snap-type: inline mandatory/);
  assert.match(css, /body\[data-mode="admin"\] \.admin-panel[\s\S]*touch-action: pan-y/);
  assert.match(css, /admin-snap-in-forward/);
  assert.match(css, /admin-snap-in-backward/);
});

test('la manutenzione mobile non schiaccia il testo dell archivio', () => {
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.admin-tools-row \{[\s\S]*display: grid;[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.admin-export-copy,[\s\S]*\.admin-download-action \{[\s\S]*width: 100%;[\s\S]*min-width: 0/);
  assert.match(css, /\.admin-export-copy strong,[\s\S]*overflow-wrap: normal;[\s\S]*word-break: normal/);
});

test('il proprietario esce con un azione primaria e l amministrazione non usa sigle residenti', () => {
  assert.match(html, /class="primary-action owner-panel-exit"[^>]*data-owner-exit/);
  assert.match(html, /class="primary-action owner-panel-exit platform-owner-panel-exit"[^>]*data-platform-owner-exit/);
  const ownerPanelEnd = html.indexOf('</section>', html.indexOf('data-owner-invitation-panel'));
  const platformExitPosition = html.indexOf('data-platform-owner-exit');
  const exitPosition = html.indexOf('data-owner-exit');
  assert.ok(platformExitPosition > html.indexOf('data-owner-invitation-panel'));
  assert.ok(platformExitPosition < ownerPanelEnd);
  assert.ok(exitPosition > ownerPanelEnd);
  assert.match(css, /\.owner-invitation-panel > \.platform-owner-panel-exit \{[\s\S]*width: 100%/);
  assert.match(app, /platformOwnerExitButton\?\.addEventListener\('click', handleOwnerExit\)/);
  assert.match(app, /platformOwnerExitButton\.hidden = !isAdminView \|\| !state\.platformOwner/);
  assert.match(css, /\.auth-actions-signed-in \{[\s\S]*?display: none/);
  assert.match(html, /data-owner-exit[\s\S]*class="exit-icon"[\s\S]*data-i18n="common.actions.exit">Esci/);
  assert.doesNotMatch(html, /data-change-signature|Cambia sigla/);
  assert.doesNotMatch(app, /handleChangeSignature|changeSignatureButton/);
});

test('il primo accesso richiede i dati del responsabile e riusa la email autenticata', () => {
  const profile = html.match(/<fieldset class="admin-administrator-profile"[\s\S]*?<\/fieldset>/)?.[0] || '';
  assert.match(profile, /data-admin-administrator-name[^>]*required/);
  assert.match(profile, /data-admin-administrator-signature[^>]*required/);
  assert.match(profile, /data-admin-administrator-email[^>]*required/);
  assert.match(profile, /data-admin-administrator-password/);
  assert.match(profile, /Nome, sigla ed email sono obbligatori\./);
  assert.match(profile, /admin\.administrator\.signature\.help[^>]*>Codice personale usato per accedere come residente\./);
  assert.match(app, /adminAdministratorEmail\.value = user\.email \|\| ''/);
  assert.match(app, /requiresAdministratorPassword\(user\)/);
  assert.match(app, /Inserisci la password amministratore/);
  assert.match(app, /!isAdministratorProfileComplete\(\) && section !== 'configuration'/);
});

test('Google non richiede la password ma il responsabile può aggiungerla per l accesso email', () => {
  const googleUser = { providerData: [{ providerId: 'google.com' }] };
  const linkedUser = { providerData: [{ providerId: 'password' }, { providerId: 'google.com' }] };
  const passwordUser = { providerData: [{ providerId: 'password' }] };

  assert.equal(administratorAuth.requiresAdministratorPassword(googleUser), false);
  assert.equal(administratorAuth.requiresAdministratorPassword(linkedUser), false);
  assert.equal(administratorAuth.requiresAdministratorPassword(passwordUser), true);
  assert.match(app, /adminAdministratorPasswordRow\.hidden = state\.adminRole !== 'OWNER'/);
  assert.match(app, /adminAdministratorPassword\.required = false/);
  assert.match(firebaseClient, /hasPasswordProvider[\s\S]*updatePassword\(user, password\)[\s\S]*linkWithCredential\(user, EmailAuthProvider\.credential\(user\.email, password\)\)/);
  assert.doesNotMatch(app, /administratorPasswordRequired === true\s*\|\|/);
});

test('l archivio affianca scarica e carica con un ripristino configurazione protetto', () => {
  const archive = html.match(/class="admin-control-section admin-tools-row admin-maintenance-row"[\s\S]*?data-admin-restore-input[^>]*>/)?.[0] || '';
  assert.match(archive, /class="admin-backup-actions"/);
  assert.match(archive, /data-admin-export-button[\s\S]*data-admin-restore-button/);
  assert.match(archive, /data-admin-restore-input[^>]*accept="application\/json,\.json"[^>]*hidden/);
  assert.match(css, /\.admin-backup-actions \{[\s\S]*grid-template-columns: repeat\(2, minmax\(120px, 1fr\)\)/);
  assert.match(app, /CAPABILITIES\.RESTORE_CENTER_DATA/);
  assert.match(app, /requiredText: t\('admin\.backup\.requiredText'\)/);
  assert.match(app, /const safetyBackup = await exportCenterData\(\)/);
  assert.match(app, /await restoreCenterConfiguration\(backup\)/);
  assert.match(centerSettings, /membership\.role !== 'OWNER'/);
  assert.match(centerSettings, /administratorName: current\.administratorName/);
  assert.match(centerSettings, /adminEmail: current\.adminEmail/);
  assert.match(participantData, /restoreCenterConfiguration/);
});

test('il salvataggio del responsabile crea o aggiorna automaticamente la Persona', () => {
  assert.match(app, /saveAdministratorAsParticipant\(\{/);
  assert.match(app, /participantWithPreviousSignature \|\| participantWithNextSignature/);
  assert.match(app, /groupId: participant\?\.groupId \|\| 'group_residenti'/);
  assert.match(app, /state\.adminParticipants = await listAdminParticipants\(\)/);
  assert.match(app, /state\.adminParticipantId = administratorParticipantId/);
  assert.match(app, /Configurazione e scheda Persona salvate/);
});

test('i campi del responsabile restano contenuti nelle rispettive colonne', () => {
  assert.match(css, /\.admin-administrator-profile-fields\s*\{[\s\S]*?align-items: start;/);
  assert.match(css, /\.admin-administrator-profile-fields input\s*\{[\s\S]*?width: 100%;[\s\S]*?max-width: 100%;[\s\S]*?min-width: 0;/);
});

test('l invito email usa una credenziale temporanea e richiede la password definitiva', () => {
  assert.match(html, /data-admin-password-label/);
  assert.match(app, /elements\.adminPassword\.value = centerInvitationId/);
  assert.match(app, /elements\.adminPassword\.readOnly = true/);
  assert.match(app, /Password temporanea dell\\'invito/);
  assert.match(app, /elements\.initializerPassword\.required = isEmailAuth/);
  assert.match(app, /await updateAdministratorPassword\(newPassword\)/);
  assert.match(app, /elements\.adminAdministratorEmail\.value = user\.email \|\| ''/);
});

test('l invito di successione separa decisione e identificazione senza percorsi duplicati', () => {
  assert.match(html, /data-admin-auth-methods/);
  assert.match(html, /data-admin-email-choice/);
  assert.match(html, /data-admin-invite-accept-actions/);
  assert.match(html, /data-admin-invite-response-status[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /data-admin-email-mode-toggle/);
  assert.match(app, /adminInviteEmailExpanded: false/);
  assert.match(app, /const invitationNeedsDecision = hasRoleInvitation && !storedDecision/);
  assert.match(app, /elements\.adminAuthMethods\.hidden = invitationNeedsDecision/);
  assert.match(app, /elements\.inviteAcceptActions\.hidden = Boolean\(storedDecision\)/);
  assert.match(app, /clearAdminInvitationDecision\(roleInvitationId\)[\s\S]*admin\.invitations\.acceptFailed/);
  assert.match(app, /elements\.inviteAcceptActions\.hidden = !invitationPending/);
  assert.match(app, /invitationAcceptanceFailed[\s\S]*elements\.inviteAccept\.focus/);
  assert.match(app, /t\('admin\.invitations\.acceptedIdentify'\)/);
  assert.match(app, /t\('auth\.email\.inviteHelp'\)/);
  assert.match(app, /error\?\.code === 'auth\/email-already-in-use'[\s\S]*signInAdministratorWithEmail\(email, password\)/);
  assert.doesNotMatch(app, /adminInviteEmailMode/);
  assert.doesNotMatch(app, /storeImplicitAdministratorInvitationAcceptance/);
  assert.match(app, /storeAdminInvitationDecision\('ACCEPT'\)/);
  assert.match(app, /storeAdminInvitationDecision\('REJECT'\)/);
  assert.match(app, /reuseAdministratorAccountForInvitation\(email, password\)/);
  assert.match(app, /Account riconosciuto\. Puoi attivare il nuovo centro\./);
  assert.match(app, /const centerInvitationId = getAdminInvitationId\(\)/);
  assert.match(app, /const roleInvitationId = getAdminRoleInvitationId\(\)/);
  assert.match(app, /else if \(roleInvitationId \|\| !centerInvitationId\)/);
  assert.match(app, /t\('auth\.email\.existingAccountHelp'\)/);
});

test('un amministratore può recuperare la password senza perdere il link di invito', () => {
  assert.match(html, /data-admin-password-reset/);
  assert.match(app, /handleAdministratorPasswordReset/);
  assert.match(app, /await sendAdminPasswordResetEmail\(email\)/);
  assert.match(app, /Se questo account usa una password, riceverai il collegamento/);
  assert.match(app, /Se usa Google, accedi con Google\./);
  assert.match(firebaseClient, /url: window\.location\.href/);
});

test('il cambio responsabile usa un invito consegnabile e aggiorna la Persona associata', () => {
  assert.doesNotMatch(html, /data-admin-role-badge/);
  assert.doesNotMatch(app, /adminRoleBadge/);
  assert.match(html, /Invita prima una persona come amministratore[\s\S]*trasferirle la responsabilità/);
  assert.match(html, /data-admin-invitation-result/);
  assert.doesNotMatch(html, /data-admin-vice-invitation-generate/);
  assert.match(html, /data-admin-invitation-link/);
  assert.match(html, /data-admin-invitation-copy/);
  assert.match(html, /data-admin-invitation-share/);
  assert.match(app, /handleAdministratorInvitationShare/);
  assert.doesNotMatch(app, /handleViceInvitationGeneration/);
  assert.doesNotMatch(app, /Invito vice amministratore generato\./);
  assert.match(app, /invitationUrl\.searchParams\.set\('adminInvite', invitation\.invitationId\)/);
  assert.match(app, /elements\.adminInvitationLink\.value = invitationUrl\.toString\(\)/);
  assert.match(app, /admin\.participantId[\s\S]*activeParticipantIds\.has\(admin\.participantId\)/);
  assert.match(app, /const successors = state\.adminAccounts\.filter/);
  assert.doesNotMatch(app, /const successors = state\.adminInvitations/);
  assert.match(app, /acceptedInvitationByUid\.get\(admin\.adminUid\)\?\.invitationId === admin\.invitationId/);
  assert.match(participantData, /invitationId: String\(item\.data\(\)\.invitationId \|\| ''\)/);
  assert.match(adminCenter, /administratorName: String\(successorParticipant\.displayName/);
  assert.match(adminCenter, /administratorSignature: String\(successorParticipant\.signature/);
  assert.match(adminCenter, /adminEmail: successorEmail/);
  assert.match(adminCenter, /administratorPasswordRequired: successor\.administratorPasswordRequired === true/);
  assert.match(adminCenter, /successorInvitation\.acceptedEmail[\s\S]*successor\.email/);
  assert.match(adminCenter, /administratorName: String\(successorParticipant\.displayName/);
  assert.match(adminCenter, /status: 'TRANSFERRED'[\s\S]*transferredTo: normalizedSuccessorUid/);
});

test('l’accettazione dell’invito accende una spia senza listener permanente', () => {
  assert.match(app, /admin\.succession\.acceptanceReady/);
  assert.match(app, /admin-nav-attention/);
  assert.match(app, /invitation\.status === 'USED'/);
  assert.match(app, /admin\.invitationId === invitation\.invitationId/);
  assert.match(app, /refreshAdminParticipants\(\{ progressive: true, section \}\)/);
  assert.doesNotMatch(adminCenter, /\bonSnapshot\s*\(/);
  assert.match(css, /\.admin-section-nav a\.admin-nav-attention::after/);
  assert.match(css, /\.admin-invitation-accepted/);
});

test('inviti e amministratori si aggiornano al ritorno nel pannello e mostrano invio e scadenza', () => {
  assert.match(app, /const \[invitations, accounts\] = await Promise\.all\(\[[\s\S]*listAdministratorInvitations\(\)[\s\S]*listCenterAdministrators\(\)/);
  assert.match(app, /window\.addEventListener\('focus', refreshAdminRolesWhenVisible\)/);
  assert.match(app, /document\.addEventListener\('visibilitychange', refreshAdminRolesWhenVisible\)/);
  assert.match(app, /invitation\.createdAt[\s\S]*admin\.invitations\.sentOn/);
  assert.match(app, /invitation\.expiresAt[\s\S]*admin\.invitations\.expiresOn/);
});

test('il nuovo responsabile rileva il trasferimento senza ricaricare e un account non associato resta gestibile', () => {
  assert.match(adminCenter, /export async function loadCurrentAdminMembership/);
  assert.match(adminCenter, /roleInvitationId: String\(data\.invitationId/);
  assert.match(app, /storePendingAdminSuccession\(result\.centerId, user\.uid\)/);
  assert.match(app, /scheduleAdminSuccessionRoleCheck/);
  assert.match(app, /const membership = await loadCurrentAdminMembershipStatus\(user\)/);
  assert.match(app, /membership\.role !== state\.adminRole[\s\S]*applyAdminAuthState\(user\)/);
  assert.match(app, /forceSettingsRefresh: successionCompleted/);
  assert.match(app, /resource === 'settings' && forceSettingsRefresh/);
  assert.match(app, /loadCenterContactSettings\(\{ forceRefresh: shouldForceResource\('settings'\) \}\)/);
  assert.match(app, /admin\.succession\.completedMessage/);
  assert.match(app, /requiresDifferentAdminIdentity[\s\S]*adminAuthMethods\.hidden = !requiresDifferentAdminIdentity/);
  assert.match(app, /admin\.succession\.identityMismatch/);
});

test('l amministratore forte riapre il calendario dalla vista mese usando il refresh orchestrato', () => {
  assert.match(app, /if \(state\.mode === 'participant' \|\| state\.mode === 'week'\) \{/);
  assert.match(app, /await refreshNow\('autorizzazione'\)/);
  assert.doesNotMatch(app, /if \(state\.mode === 'week'\) \{[\s\S]*await refreshParticipant\('autorizzazione'\)/);
});

test('l autenticazione del candidato non accetta automaticamente l invito', () => {
  const pendingBranch = adminCenter.slice(
    adminCenter.indexOf('const roleInvitationId = getAdminRoleInvitationId()'),
    adminCenter.indexOf('const profileSnapshot = await getDoc')
  );
  assert.match(html, /Sì, accetto/);
  assert.match(adminCenter, /invitationPending: true/);
  assert.doesNotMatch(pendingBranch, /claimRoleInvitation/);
  assert.match(adminCenter, /export async function acceptAdministratorInvitation/);
  assert.match(app, /await acceptAdministratorInvitation\(invitationId, user\)/);
  assert.match(app, /setAdminInvitationResponseStatus\(friendlyErrorMessage/);
  assert.match(app, /showRoleInvitationAccepted/);
  assert.match(app, /acceptedWaitMessage/);
  assert.doesNotMatch(app, /viceActivatedMessage/);
  assert.match(app, /hideCancel: true/);
  assert.match(app, /Invito in attesa della tua risposta/);
  assert.match(app, /t\('admin\.invitations\.accepted'\)/);
  assert.match(app, /t\('admin\.invitations\.rejected'\)/);
});

test('una sola risposta viene conservata e completata dopo l identificazione', () => {
  assert.match(app, /ADMIN_INVITATION_DECISION_STORAGE_PREFIX/);
  assert.match(app, /storeAdminInvitationDecision\('ACCEPT'\)/);
  assert.match(app, /storeAdminInvitationDecision\('REJECT'\)/);
  assert.match(app, /const storedDecision = access\.invitationPending/);
  assert.match(app, /storedDecision === 'ACCEPT'[\s\S]*acceptAdministratorInvitation/);
  assert.match(app, /storedDecision === 'REJECT'[\s\S]*rejectAdministratorInvitation/);
  assert.match(app, /clearAdminInvitationDecision\(roleInvitationId\)/);
  assert.match(app, /state\.adminInviteEmailExpanded = false;[\s\S]*setSignedOutState\(\)/);
});

test('l invito amministratore funziona anche con email non Google senza corse sulla verifica', () => {
  assert.match(app, /const centerInvitationId = getAdminInvitationId\(\)/);
  assert.match(app, /const roleInvitationId = getAdminRoleInvitationId\(\)/);
  assert.match(app, /else if \(roleInvitationId \|\| !centerInvitationId\)/);
  assert.doesNotMatch(app, /storeImplicitAdministratorInvitationAcceptance/);
  assert.match(app, /emailVerificationPending = requiresAdministratorPassword\(user\)/);
  assert.match(app, /storedDecision === 'ACCEPT' && emailVerificationPending/);
  assert.match(app, /adminPasswordReset\.hidden = hasCenterInvitation/);
  assert.doesNotMatch(app, /else if \(!getAdminInvitationId\(\)\)/);
});

test('il percorso nuovo non attiva la compatibilità storica della password temporanea', () => {
  assert.match(html, /data-admin-password-setup-dialog/);
  assert.match(app, /showRequiredAdminPasswordSetup\(user, access\.passwordSetupRequired === true\)/);
  assert.match(app, /elements\.adminPasswordSetupDialog\.showModal\(\)/);
  assert.match(app, /await updateAdministratorPassword\(password\)/);
  assert.match(app, /await completeAdministratorPasswordSetup\(\)/);
  assert.match(app, /requiresAdministratorPassword\(user\)/);
  assert.match(app, /addEventListener\('cancel', \(event\) => event\.preventDefault\(\)\)/);
  assert.doesNotMatch(app, /ADMIN_PASSWORD_SETUP_STORAGE_PREFIX/);
  assert.match(adminCenter, /passwordSetupRequired: false/);
  assert.match(adminCenter, /export async function completeAdministratorPasswordSetup/);
  assert.doesNotMatch(adminCenter, /passwordSetupRequired:\s*true/);
});

test('la revoca del vice non consulta più i vecchi inviti Firebase di ruolo MANAGER', () => {
  const revokeVice = adminCenter.match(/export async function revokeViceAdministratorAccess\([\s\S]*?\n}\n/)?.[0] || '';
  const renderInvitations = app.match(/function renderAdminInvitationManagement\([\s\S]*?\n}\n/)?.[0] || '';
  assert.match(revokeVice, /viceSessions/);
  assert.doesNotMatch(revokeVice, /ADMIN_INVITATION_COLLECTION/);
  assert.doesNotMatch(revokeVice, /invitationsSnapshot/);
  assert.match(revokeVice, /status: 'REVOKED'[\s\S]*massPermission: false[\s\S]*dailyOperationsPermission: false/);
  assert.doesNotMatch(revokeVice, /massPermission: true/);
  assert.doesNotMatch(renderInvitations, /role\.vice|role === 'MANAGER'/);
});

test('i controlli amministrativi riconoscono entrambe le forme di permission denied', () => {
  assert.match(
    adminCenter,
    /function isPermissionDeniedError\(error\)[\s\S]*permission-denied[\s\S]*firestore\/permission-denied/
  );
  assert.equal((adminCenter.match(/isPermissionDeniedError\(error\)/g) || []).length, 6);
});

test('il passaggio revoca il precedente responsabile e lo disconnette senza cancellare la Persona', () => {
  const transfer = adminCenter.match(/export async function transferCenterOwnership\([\s\S]*?\n}\n/)?.[0] || '';
  assert.match(app, /dialog\.transferOwnership\.finalMessage/);
  assert.match(app, /const revokePrevious = true/);
  assert.match(app, /transferCenterOwnership\(successorUid, \{ revokePrevious \}\)/);
  assert.match(app, /if \(revokePrevious\) \{[\s\S]*await signOutCurrentUser\(\)/);
  assert.match(app, /admin\.succession\.outgoingCompletedMessage[\s\S]*await signOutCurrentUser\(\)/);
  assert.match(app, /classList\.remove\('admin-nav-attention'\)/);
  assert.match(transfer, /const revokePrevious = options\?\.revokePrevious === true/);
  assert.match(transfer, /revokePrevious[\s\S]*status: 'REVOKED'[\s\S]*revokedAt: now/);
  assert.match(transfer, /massPermission: false[\s\S]*dailyOperationsPermission: false/);
  assert.doesNotMatch(transfer, /batch\.set\([^\n]*ProfileRef/);
  assert.match(transfer, /Non va incluso nel batch critico/);
  assert.doesNotMatch(transfer, /batch\.delete\(currentMembershipRef\)/);
  assert.doesNotMatch(transfer, /publicParticipants[\s\S]*batch\.delete/);
  assert.match(app, /friendlyErrorMessage\(error, 'Trasferimento non riuscito'\)[\s\S]*showActionDialog/);
});

test('il responsabile uscente non legge il profilo globale privato del successore', () => {
  const transfer = adminCenter.match(/export async function transferCenterOwnership\([\s\S]*?\n}\n/)?.[0] || '';
  assert.doesNotMatch(transfer, /successorProfileRef/);
  assert.doesNotMatch(transfer, /ADMIN_PROFILE_COLLECTION/);
  assert.match(transfer, /successorInvitation\.acceptedEmail[\s\S]*successor\.email/);
});

test('il nuovo responsabile sincronizza la propria email e può ripulire un vecchio OWNER', () => {
  assert.match(app, /synchronizeCenterOwnerEmail/);
  assert.match(app, /state\.adminRole === 'OWNER'[\s\S]*getCurrentUser\(\)\?\.email/);
  assert.match(app, /centerSettings\.adminEmail = await synchronizeCenterOwnerEmail/);
  assert.match(app, /account\.adminUid !== currentUid/);
  assert.match(app, /admin\.accounts\.previousOwner/);
  assert.match(adminCenter, /const staleFormerOwner = membership\.role === 'OWNER'/);
  assert.match(adminCenter, /targetProfileSnapshot\.data\(\)\?\.centerId === centerId/);
  assert.match(adminCenter, /status: 'REVOKED'[\s\S]*massPermission: false[\s\S]*dailyOperationsPermission: false/);
});
