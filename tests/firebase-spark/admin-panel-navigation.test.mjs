import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectRoot = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const [html, css, refinements, app, firebaseClient, centerSettings, adminCenter, administratorAuth, summaryView] = await Promise.all([
  readFile(new URL('index.html', projectRoot), 'utf8'),
  readFile(new URL('styles.css', projectRoot), 'utf8'),
  readFile(new URL('summary-matrix-refinements.css', projectRoot), 'utf8'),
  readFile(new URL('app.js', projectRoot), 'utf8'),
  readFile(new URL('firebase-client.js', projectRoot), 'utf8'),
  readFile(new URL('center-settings.js', projectRoot), 'utf8'),
  readFile(new URL('admin-center.js', projectRoot), 'utf8'),
  import(new URL('domain/administrator-auth.mjs', projectRoot)),
  readFile(new URL('summary-matrix-view.js', projectRoot), 'utf8')
]);

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

test('la configurazione presenta responsabile salvataggio e icona nell ordine operativo', () => {
  const configuration = html.match(/id="admin-configuration-section"[\s\S]*?<div class="admin-role-stack"/)?.[0] || '';
  const responsible = configuration.indexOf('Responsabile del centro');
  const save = configuration.indexOf('data-admin-center-settings-save');
  const avatar = configuration.indexOf('Icona del centro');

  assert.ok(responsible >= 0 && responsible < save);
  assert.ok(save < avatar);
  assert.doesNotMatch(configuration, /data-admin-center-settings-cancel/);
  assert.doesNotMatch(configuration, /data-bootstrap-button/);
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
    'smeraldo',
    'terracotta',
    'confetto',
    'salvia',
    'oliva',
    'inchiostro',
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
  assert.match(centerSettings, /ALLOWED_THEME_PALETTES\.has\(value\) \? value : 'smeraldo'/);
});

test('Aspetto separa il linguaggio visivo dalla palette e viene salvato per il centro', () => {
  const styleSelect = html.match(/<select data-admin-interface-style-select[^>]*>([\s\S]*?)<\/select>/)?.[1] || '';
  const styleValues = [...styleSelect.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(styleValues, ['original', 'cool', 'urban']);
  assert.match(html, /data-i18n="admin\.adaptations\.interfaceStyle\.label">Aspetto/);
  assert.match(app, /applyInterfaceStyle\(activeInterfaceStyle\)/);
  assert.match(app, /interfaceStyle: interfaceStyleToSave/);
  assert.match(centerSettings, /const ALLOWED_INTERFACE_STYLES = new Set\(\['original', 'cool', 'urban'\]\)/);
  assert.match(app, /if \(isWeek && !needsResidentLogin && canManageDailyOperations\(\)\) \{[\s\S]*?renderWeekOperations\(\);/);
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

test('Impostazioni presenta testi compatti e Aspetto subito dopo la vista preferita', () => {
  assert.match(html, /admin\.adaptations\.description">Personalizzazioni dell'aspetto e del comportamento dell'app\./);
  assert.match(html, /viewPreference\.help">La vista con cui si apre l'app per tutte le persone\./);
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
});

test('i collegamenti operativi usano copia diretta e condivisione nativa o assistita', () => {
  assert.match(html, /data-access-link="pasti"/);
  assert.match(html, /data-access-link="cucina"/);
  assert.doesNotMatch(html, /data-copy-access-link/);
  assert.match(html, /data-share-access-link="pasti"/);
  assert.match(html, /data-share-access-link="cucina"/);
  assert.match(app, /btn\.addEventListener\('click', handleAccessLinkCopy\)/);
  assert.doesNotMatch(app, /handleAccessLinkOpen/);
  assert.match(app, /getCachedAccessLinkUrl\(scope\) \|\| await resolveAccessLinkUrl\(scope\)/);
  assert.match(app, /const url = getCachedAccessLinkUrl\(scope\)/);
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

test('Pasti Cucina ed Esci condividono il verde principale', () => {
  assert.match(css, /\.access-link-btn:not\(:disabled\)\s*\{[\s\S]*?background: var\(--primary\);[\s\S]*?border-color: var\(--primary\);/);
  assert.match(css, /\.primary-action\s*\{[\s\S]*?background: var\(--primary\) !important;/);
  assert.doesNotMatch(css, /\.access-link-btn:not\(:disabled\)\s*\{[\s\S]*?#2e7d32/);
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

test('il residente semplice vede e monta soltanto la scheda Impostazioni', () => {
  assert.match(app, /function selectedResidentCanUseFullControlPanel\(\)/);
  assert.match(app, /const RESIDENT_SETTINGS_ACCESS = 'resident-settings'/);
  assert.match(app, /function shouldOpenResidentSettingsPanel\(\)[\s\S]*?!hasStrongAdministratorIdentity\(\)[\s\S]*?!selectedResidentCanUseFullControlPanel\(\)/);
  assert.match(app, /function updateControlPanelEntryHref\(\)[\s\S]*?adminEntryUrl\.searchParams\.set\('access', RESIDENT_SETTINGS_ACCESS\)/);
  assert.match(app, /if \(state\.residentSettingsMode\) \{[\s\S]*?renderResidentSettingsPanel\(\);[\s\S]*?reconcileAdminAccessWithoutStrongUser\(\);[\s\S]*?return;/);
  assert.match(app, /if \(state\.residentSettingsMode\) \{[\s\S]*?elements\.adminNavConfiguration\.hidden = true;[\s\S]*?elements\.adminNavAdaptations\.hidden = false;[\s\S]*?elements\.adminNavAccess\.hidden = true;[\s\S]*?mountAdminSection\('adaptations'\);[\s\S]*?return;/);
  assert.match(app, /async function handleAdminAdaptationsSave\(\)[\s\S]*?if \(state\.residentSettingsMode\) \{[\s\S]*?storeResidentPreferences\(preferences\)/);
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
  assert.match(app, /selectAdminSection\(nextSection, \{ updateHash: true \}\)/);
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
  const ownerPanelEnd = html.indexOf('</section>', html.indexOf('data-owner-invitation-panel'));
  const exitPosition = html.indexOf('data-owner-exit');
  assert.ok(exitPosition > ownerPanelEnd);
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
  assert.match(profile, /Richiesti per iniziare · modificabili in seguito/);
  assert.match(app, /adminAdministratorEmail\.value = user\.email \|\| ''/);
  assert.match(app, /requiresAdministratorPassword\(user\)/);
  assert.match(app, /Inserisci la password amministratore/);
  assert.match(app, /!isAdministratorProfileComplete\(\) && section !== 'configuration'/);
});

test('Google non mostra e non richiede la password amministratore', () => {
  const googleUser = { providerData: [{ providerId: 'google.com' }] };
  const linkedUser = { providerData: [{ providerId: 'password' }, { providerId: 'google.com' }] };
  const passwordUser = { providerData: [{ providerId: 'password' }] };

  assert.equal(administratorAuth.requiresAdministratorPassword(googleUser), false);
  assert.equal(administratorAuth.requiresAdministratorPassword(linkedUser), false);
  assert.equal(administratorAuth.requiresAdministratorPassword(passwordUser), true);
  assert.match(app, /adminAdministratorPasswordRow\.hidden = state\.adminRole !== 'OWNER'[\s\S]*!requiresAdministratorPassword\(getCurrentUser\(\)\)/);
  assert.doesNotMatch(app, /administratorPasswordRequired === true\s*\|\|/);
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
  assert.doesNotMatch(html, /data-admin-email-mode-toggle/);
  assert.match(app, /adminInviteEmailExpanded: false/);
  assert.match(app, /const invitationNeedsDecision = hasRoleInvitation && !storedDecision/);
  assert.match(app, /elements\.adminAuthMethods\.hidden = invitationNeedsDecision/);
  assert.match(app, /elements\.inviteAcceptActions\.hidden = Boolean\(storedDecision\)/);
  assert.match(app, /t\('admin\.invitations\.acceptedIdentify'\)/);
  assert.match(app, /t\('auth\.email\.inviteHelp'\)/);
  assert.match(app, /error\?\.code === 'auth\/email-already-in-use'[\s\S]*signInAdministratorWithEmail\(email, password\)/);
  assert.doesNotMatch(app, /adminInviteEmailMode/);
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
  assert.match(html, /Scegli la Persona[\s\S]*completa qui il passaggio[\s\S]*il tuo incarico terminerà/);
  assert.match(html, /data-admin-invitation-result/);
  assert.match(html, /data-admin-invitation-link/);
  assert.match(html, /data-admin-invitation-copy/);
  assert.match(html, /data-admin-invitation-share/);
  assert.match(app, /handleAdministratorInvitationShare/);
  assert.match(app, /invitationUrl\.searchParams\.set\('adminInvite', invitation\.invitationId\)/);
  assert.match(app, /elements\.adminInvitationLink\.value = invitationUrl\.toString\(\)/);
  assert.match(app, /admin\.participantId[\s\S]*activeParticipantIds\.has\(admin\.participantId\)/);
  assert.match(app, /const successors = state\.adminAccounts\.filter/);
  assert.doesNotMatch(app, /const successors = state\.adminInvitations/);
  assert.match(adminCenter, /administratorName: String\(successorParticipant\.displayName/);
  assert.match(adminCenter, /administratorSignature: String\(successorParticipant\.signature/);
  assert.match(adminCenter, /adminEmail: successorEmail/);
  assert.match(adminCenter, /administratorPasswordRequired: successor\.administratorPasswordRequired === true/);
});

test('l’accettazione dell’invito accende una spia senza listener permanente', () => {
  assert.match(app, /admin\.succession\.acceptanceReady/);
  assert.match(app, /admin-nav-attention/);
  assert.match(app, /invitation\.status === 'USED'/);
  assert.match(app, /invitation\.createdBy === currentUid/);
  assert.match(app, /queueMicrotask\(refreshAdminRolesWhenVisible\)/);
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
  assert.match(app, /const membership = await loadCurrentAdminMembership\(user\)/);
  assert.match(app, /membership\.role !== state\.adminRole[\s\S]*applyAdminAuthState\(user\)/);
  assert.match(app, /admin\.succession\.completedMessage/);
  assert.match(app, /requiresDifferentAdminIdentity[\s\S]*adminAuthMethods\.hidden = !requiresDifferentAdminIdentity/);
  assert.match(app, /admin\.succession\.identityMismatch/);
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
  assert.match(app, /await acceptAdministratorInvitation\(\)/);
  assert.match(app, /showRoleInvitationAccepted/);
  assert.match(app, /acceptedWaitMessage/);
  assert.match(app, /viceActivatedMessage/);
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
  assert.match(app, /storeImplicitAdministratorInvitationAcceptance\(\)/);
  assert.match(app, /emailVerificationPending = requiresAdministratorPassword\(user\)/);
  assert.match(app, /storedDecision === 'ACCEPT' && emailVerificationPending/);
  assert.match(app, /adminPasswordReset\.hidden = hasCenterInvitation/);
  assert.doesNotMatch(app, /else if \(!getAdminInvitationId\(\)\)/);
});

test('il nuovo amministratore sceglie subito la password e non deve sostituirne una temporanea', () => {
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
});

test('il passaggio revoca il precedente responsabile e lo disconnette senza cancellare la Persona', () => {
  assert.match(app, /dialog\.transferOwnership\.finalMessage/);
  assert.match(app, /const revokePrevious = true/);
  assert.match(app, /transferCenterOwnership\(successorUid, \{ revokePrevious \}\)/);
  assert.match(app, /if \(revokePrevious\) \{[\s\S]*await signOutCurrentUser\(\)/);
  assert.match(adminCenter, /const revokePrevious = options\?\.revokePrevious === true/);
  assert.match(adminCenter, /revokePrevious[\s\S]*status: 'REVOKED'[\s\S]*revokedAt: now/);
  assert.match(adminCenter, /batch\.set\(currentProfileRef,[\s\S]*status: 'REVOKED'/);
  assert.match(adminCenter, /massPermission: false[\s\S]*dailyOperationsPermission: false/);
  assert.doesNotMatch(adminCenter, /batch\.delete\(currentMembershipRef\)/);
  assert.doesNotMatch(adminCenter, /publicParticipants[\s\S]*batch\.delete/);
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
