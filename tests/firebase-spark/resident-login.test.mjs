import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const participantData = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/participant-data.js', import.meta.url),
  'utf8'
);
const firebaseClient = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/firebase-client.js', import.meta.url),
  'utf8'
);
const app = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url),
  'utf8'
);
const kitchenNotes = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/kitchen-notes.js', import.meta.url),
  'utf8'
);
const index = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url),
  'utf8'
);
const styles = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/styles.css', import.meta.url),
  'utf8'
);
const summaryStyles = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/summary-matrix-refinements.css', import.meta.url),
  'utf8'
);
const adminCenter = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/admin-center.js', import.meta.url),
  'utf8'
);
const centerSettings = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/center-settings.js', import.meta.url),
  'utf8'
);
const calendarConfiguration = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/calendar-configuration.js', import.meta.url),
  'utf8'
);
const scheduleUtils = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs', import.meta.url),
  'utf8'
);
const bootstrapDemo = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/bootstrap-demo.js', import.meta.url),
  'utf8'
);
const rolePolicy = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/role-policy.mjs', import.meta.url),
  'utf8'
);
const participantProfile = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/domain/participant-profile.mjs', import.meta.url),
  'utf8'
);
const auditLog = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/audit-log.js', import.meta.url),
  'utf8'
);
const dietUtils = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/diet-utils.mjs', import.meta.url),
  'utf8'
);
const dailyOperations = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/daily-operations.js', import.meta.url),
  'utf8'
);

test('admin can create and fully edit participant profiles', () => {
  assert.match(index, /data-admin-new-participant/);
  assert.match(index, /data-admin-participant-name/);
  assert.match(index, /data-admin-participant-signature/);
  assert.match(index, /data-admin-participant-group/);
  assert.match(index, /data-admin-participant-diets/);
  assert.match(app, /populateAdminDietSelect\('Nessuna dieta'\)/);
  assert.match(app, /populateDietSelect\(elements\.weekDietType, 'Nessuna dieta occasionale', elements\.weekDietNumber\)/);
  assert.match(app, /adminParticipantDiets\.value = 'STANDARD'/);
  assert.match(index, /data-admin-participant-diet-number/);
  assert.match(dietUtils, /function isNumericDietCode\(value\)/);
  assert.doesNotMatch(dietUtils, /getDietOptions|isCustomDietNumber|resolveDietSelection|BIANCO|DIAB|IPO|CARDIO/);
  assert.match(app, /BASE_ADMIN_DIET_NUMBERS = Object\.freeze\(\[1, 2, 3, 4\]\)/);
  assert.match(app, /function getAdminDietNumbers\(\)/);
  assert.match(app, /addOption\.textContent = t\('diet\.option\.ADD_HIGHER'\)/);
  assert.match(app, /const nextDietNumber = Math\.max\(\.\.\.getAdminDietNumbers\(\)\) \+ 1/);
  assert.match(app, /const dietCode = readAdminDietCode\(\)/);
  assert.doesNotMatch(app.match(/function populateAdminDietSelect[\s\S]*?\n\}/)?.[0] || '', /BIANCO|DIAB|IPO|CARDIO/);
  const agendaDietSelect = app.match(/function populateDietSelect[\s\S]*?\n\}/)?.[0] || '';
  assert.match(agendaDietSelect, /option\.textContent = String\(number\)/);
  assert.match(agendaDietSelect, /diet\.option\.ADD_HIGHER/);
  assert.doesNotMatch(agendaDietSelect, /diet\.option\.label|BIANCO|DIAB|IPO|CARDIO|getDietOptions/);
  const agendaDietAssignments = dailyOperations.match(/function normalizeDietAssignments[\s\S]*?\n\}/)?.[0] || '';
  assert.match(agendaDietAssignments, /\^\\d\+\$/);
  assert.match(agendaDietAssignments, /Number\(assignment\.dietTag\) >= 1/);
  assert.match(agendaDietAssignments, /Number\(assignment\.dietTag\) <= 999/);
  assert.match(index, /data-admin-participant-administrative-role[\s\S]*option value="vice"/);
  assert.match(app, /if \(otherViceCount >= 4\)/);
  assert.match(app, /admin\.people\.viceLimit/);
  assert.match(index, /data-admin-people-list/);
  assert.match(index, /data-admin-participant-group[\s\S]*value="group_ospiti"/);
  assert.doesNotMatch(index, /data-admin-guest-preset|data-admin-add-guest/);
  assert.match(app, /function renderAdminPeopleList/);
  assert.match(app, /signature: participant\.signature/);
  assert.match(app, /admin-person-signature[\s\S]*?signatureTitle/);
  assert.match(app, /data-admin-person-open/);
  assert.doesNotMatch(app, /function handleAdminAddGuest|adminGuestPreset/);
  assert.match(participantData, /validateParticipantProfile\(profile\)/);
  assert.match(participantProfile, /viceAdminRole: profile\.viceAdminRole === true/);
});

test('la preparazione del centro comunica chiaramente l attesa e impedisce azioni concorrenti', () => {
  assert.match(index, /data-bootstrap-progress[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(index, /Attendere, prego\.\.\./);
  assert.match(app, /function setBootstrapProgress\(active/);
  assert.match(index, /Estendi calendario prenotazioni/);
  assert.match(app, /elements\.bootstrapButton\.disabled = active/);
  assert.match(app, /elements\.authButton\.disabled = active/);
  assert.match(app, /elements\.authStatus\.textContent = `Estensione calendario prenotazioni\.\.\. \$\{percentage\}%`/);
  assert.match(app, /elements\.bootstrapProgressDetail\.textContent = `Estensione calendario prenotazioni: \$\{percentage\}%\.`/);
  assert.match(styles, /\.bootstrap-progress-spinner[\s\S]*animation: bootstrap-progress-spin/);
});

test('il calendario copre un anno e si estende manualmente dalla scheda Attività', () => {
  assert.match(scheduleUtils, /CALENDAR_COVERAGE_DAYS = 365/);
  assert.match(index, /data-admin-calendar-extension[\s\S]*Estendi calendario prenotazioni/);
  assert.match(app, /admin\.calendar\.availableUntil/);
  assert.match(index, /data-admin-calendar-extension-status[^>]*aria-live="polite"/);
  assert.doesNotMatch(app, /function maybeAutoExtendCalendar/);
  assert.doesNotMatch(app, /automaticCalendarExtensionAttempted/);
});

test('resident login has the complete persistent-session surface', () => {
  assert.match(participantData, /export async function signInFriendlyResident/);
  assert.match(participantData, /export async function restoreFriendlyResidentSession/);
  assert.match(participantData, /export async function forgetResidentDevice/);
  assert.match(participantData, /localStorage\.setItem\(getCenterScopedStorageKey\(RESIDENT_SIGNATURE_STORAGE_KEY\)/);
  assert.match(participantData, /localStorage\.setItem\(getCenterScopedStorageKey\(RESIDENT_PARTICIPANT_STORAGE_KEY\)/);
  assert.match(participantData, /localStorage\.setItem\(getCenterScopedStorageKey\(RESIDENT_TOKEN_STORAGE_KEY\)/);
  assert.match(participantData, /PERSONAL_TOKEN_LIFETIME_DAYS = 9000/);
  assert.match(participantData, /async function loadPublicParticipantById/);
  assert.match(participantData, /async function loadPublicParticipantBySignature/);
  assert.match(participantData, /'publicParticipants',\s*participantId/);
  assert.match(participantData, /where\('signature', '==', normalized\),\s*limit\(1\)/);
  assert.match(participantData, /createPersonalTokenForParticipant\([\s\S]*matchedParticipant\.participantId/);
  assert.match(participantData, /createPersonalAnonymousSession\(participant\.participantId, token\)/);
  assert.match(participantData, /reusePersonalSession[\s\S]*ensurePersonalSession\(participant\.participantId, token\)/);
  assert.match(participantData, /await replaceWithAnonymousUser\(\)/);
  assert.match(participantData, /withResidentTechnicalSession\([\s\S]*technicalDb/);
  assert.match(participantData, /await ensurePersonalSession\(participantId, token\)/);
  assert.match(participantData, /ensureStoredResidentSession/);
  assert.doesNotMatch(participantData, /selectPublicParticipant/);
  assert.doesNotMatch(participantData, /localStorage\.setItem\([^,]+,\s*commonPassword/);
});

test('technical resident auth uses local Firebase persistence', () => {
  assert.match(firebaseClient, /browserLocalPersistence/);
  assert.match(firebaseClient, /signInWithEmailAndPassword/);
  assert.match(firebaseClient, /signInResidentTechnicalUser/);
  assert.match(firebaseClient, /withResidentTechnicalSession[\s\S]*getFirestore\(maintenanceAuth\.app\)/);
  assert.match(firebaseClient, /async function runAuthMutation\(operation\)[\s\S]*await authPersistenceReady;[\s\S]*return await operation\(\)/);
  assert.match(firebaseClient, /waitForStableAuth/);
  assert.match(firebaseClient, /watchAuth[\s\S]*revision === eventRevision/);
});

test('friendly access is explicit and offers device exit', () => {
  assert.match(app, /get\('access'\) === 'friendly'/);
  assert.match(app, /\['participant', 'week'\]\.includes\(initialMode\)/);
  assert.match(app, /data-forget-device/);
  assert.match(app, /const showResidentExit = isOrdinaryView/);
  assert.match(app, /const showResidentLogin = needsResidentLogin\s*&& !isAdminView/);
  assert.match(app, /document\.body\.dataset\.residentLoginVisible = showResidentLogin \? 'true' : 'false'/);
  assert.match(app, /elements\.residentLogin\.hidden = !showResidentLogin/);
  assert.match(app, /const showAdministratorAccess = isAdminView/);
  assert.match(app, /elements\.adminShell\.hidden = isKitchen \|\| !showAdministratorAccess/);
  assert.match(app, /elements\.ownerExitButton\.hidden = !isAdminView/);
  assert.match(app, /const usePanelExit = isAdminView && state\.residentSettingsMode/);
  assert.match(app, /elements\.forgetDeviceButton\.hidden = !showResidentExit \|\| usePanelExit/);
  assert.match(app, /async function handleOwnerExit\(\) \{[\s\S]*if \(state\.residentSettingsMode\) \{[\s\S]*return handleForgetDevice\(\)/);
  assert.match(app, /async function handleOwnerExit\(\)[\s\S]*await signOutCurrentUser\(\)[\s\S]*setSignedOutState\(\)/);
  assert.match(
    app,
    /function handleAuthButton\(\)[\s\S]*!currentUser\.isAnonymous[\s\S]*!isResidentTechnicalEmail\(currentUser\.email\)[\s\S]*hasStrongAdministratorIdentity/
  );
  assert.doesNotMatch(
    app.match(/async function handleOwnerExit\(\)[\s\S]*?\n\}/)?.[0] || '',
    /forgetResidentDevice/
  );
  assert.match(app, /const hasVisibleAdminFooter = hasAdminInterface/);
  assert.match(styles, /\.account-footer \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /body\[data-resident-login-visible="true"\] \.account-footer \{[\s\S]*?width: min\(100%, 420px\);[\s\S]*?margin-inline: auto/);
  assert.match(styles, /\.footer-exit-button \{[\s\S]*?width: 100%/);
  assert.match(index, /class="primary-action footer-exit-button" data-forget-device/);
  assert.match(styles, /\.auth-actions-signed-in \{[\s\S]*?order: 100;[\s\S]*?display: none/);
  assert.match(app, /if \(authenticatedAdministrator\) \{[\s\S]*auth-actions-signed-in[\s\S]*common\.actions\.exit[\s\S]*adminEmailAuth\.hidden = true/);
  assert.match(app, /if \(authenticatedAdministrator\) \{[\s\S]*elements\.authActions\.hidden = true/);
  assert.match(index, /data-resident-login-form/);
  assert.match(index, /data-resident-signature-input/);
  assert.match(index, /data-resident-password-input/);
  assert.doesNotMatch(index, /data-admin-entry-link/);
  assert.doesNotMatch(index, /data-agenda-admin-entry/);
  assert.match(index, /data-control-panel-entry[^>]+href="\/\?view=admin"/);
  assert.match(index, /data-meals-return-entry/);
  assert.match(app, /elements\.controlPanelEntry\.href = adminEntryUrl\.pathname \+ adminEntryUrl\.search/);
  assert.match(app, /selectedResidentCanOpenControlPanel\(\)/);
  assert.match(app, /function selectedResidentCanOpenControlPanel\(\) \{[\s\S]*return state\.residentReady/);
  assert.match(app, /state\.residentSettingsMode = shouldOpenResidentSettingsPanel\(\)/);
  assert.match(app, /RESIDENT_SETTINGS_ACCESS = 'resident-settings'/);
  assert.match(app, /if \(isControlPanelTarget && !hasAdminInterface\) \{\s*return;\s*\}[\s\S]*event\.preventDefault\(\);/);
  assert.match(app, /async function hydrateAdminNavigation\(\)[\s\S]*await reconcileAdminAccessWithoutStrongUser\(\)/);
  assert.match(
    app,
    /function ensureAuthorizedAdminRoute\(\)[\s\S]*state\.mode !== 'admin'[\s\S]*!state\.adminRole[\s\S]*view', 'admin'[\s\S]*searchParams\.delete\('access'\)[\s\S]*history\.replaceState/
  );
  const applyAuth = app.match(/async function resolveAdminAuthState\(user[\s\S]*?\n}/)?.[0] || '';
  assert.match(applyAuth, /state\.adminRole = isAdmin \? access\.role : ''[\s\S]*ensureAuthorizedAdminRoute\(\)/);
  assert.match(app, /async function handleForgetDevice\(\)[\s\S]*const leavingAdminPanel = state\.mode === 'admin'[\s\S]*view', 'participant'[\s\S]*access', 'friendly'/);
  assert.match(index, /needsAdminInterface[\s\S]*adminShell\.remove\(\)/);
});

test('il link operativo residente prevale anche su una sessione amministrativa', () => {
  assert.match(app, /elements\.adminShell\.open = state\.mode === 'admin'/);
  assert.match(app, /const shouldShowLogin = showLogin\s*&& !state\.residentRestorePending\s*&& state\.mode !== 'admin'/);
  assert.match(app, /elements\.participantPanel\.hidden = !isParticipant \|\| needsResidentLogin \|\| state\.platformOwner/);
  assert.match(app, /elements\.weekPanel\.hidden = !isWeek \|\| needsResidentLogin \|\| state\.platformOwner/);
  assert.match(app, /elements\.summaryPanel\.hidden = !isSummary \|\| needsResidentLogin \|\| state\.platformOwner/);
});

test('i login aiutano la digitazione e le azioni sensibili hanno conferme proporzionate', () => {
  assert.match(index, /data-password-toggle="resident"/);
  assert.match(index, /data-password-toggle="admin"/);
  assert.match(index, /autocapitalize="characters"[^>]*autocorrect="off"[^>]*spellcheck="false"/);
  assert.match(index, /chiedila al responsabile del centro/);
  assert.match(app, /elements\.residentPasswordInput\.focus\(\)/);
  assert.match(index, /data-action-dialog/);
  assert.match(app, /requiredText: t\('dialog\.transferOwnership\.requiredText'\)/);
  assert.match(app, /function showActionDialog/);
  const monthBulkHandler = app.match(/async function handleMonthBulkButton\(button\)[\s\S]*?\n}/)?.[0] || '';
  assert.doesNotMatch(monthBulkHandler, /showActionDialog|dialog\.clearSelection/);
  assert.doesNotMatch(app, /window\.(?:alert|confirm|prompt)/);
  const exportHandler = app.match(/async function handleAdminExport\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.doesNotMatch(exportHandler, /window\.confirm/);
});

test('meal pages show a fixed title and the authenticated name in the status row', () => {
  assert.match(app, /const useCompactMobileTitle = activeInterfaceStyle !== 'original'[\s\S]*max-width: 620px[\s\S]*const mealTitle = useCompactMobileTitle[\s\S]*t\('app\.title\.compact'\)[\s\S]*t\('app\.title'\)/);
  assert.match(app, /element\.textContent = participantName/);
  assert.match(index, /data-participant-status-name/);
  assert.match(index, /data-week-status-name/);
  assert.match(index, /data-participant-status-name[^>]*><\/strong>\s*<p data-participant-status/);
  assert.match(index, /data-week-status-name[^>]*><\/strong>\s*<p data-week-status/);
  assert.match(styles, /\.participant-status-name \{[\s\S]*?text-align: left/);
  assert.match(styles, /\.participant-status-row > p \{[\s\S]*?text-align: right/);
  assert.doesNotMatch(index, /data-participant-select/);
  assert.doesNotMatch(index, /data-week-participant-select/);
});

test('il livello dati conserva la lingua esistente quando un chiamante la omette', () => {
  assert.match(centerSettings, /language: typeof language === 'string' && language\.trim\(\) \? language : undefined/);
  assert.match(calendarConfiguration, /typeof center\.language === 'string' && center\.language\.trim\(\) \? center\.language : 'it'/);
});

test('nel riepilogo mobile il nome del centro occupa una riga sotto il titolo', () => {
  assert.match(index, /class="topbar-heading"/);
  assert.match(index, /data-title-center/);
  assert.match(app, /elements\.titleCenter\.hidden = /);
  assert.match(app, /document\.body\.dataset\.mode = state\.mode/);
  assert.match(styles, /body\[data-mode="summary"\] \.topbar-heading[\s\S]*flex-direction: column/);
});

test('le viste personali non caricano il riepilogo completo del centro', () => {
  assert.match(app, /if \(state\.mode === 'summary'\) \{[\s\S]*loadParticipantDaySummaries/);
  assert.match(app, /state\.selectedParticipant && state\.mode !== 'summary'/);
  assert.doesNotMatch(app, /listPublicParticipants\(\),\s*loadParticipantDaySummaries/);
});

test('uscendo da mese, settimana o riepilogo si torna alla rotta residente stabile', () => {
  const logout = app.match(/async function handleForgetDevice\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(logout, /residentUrl\.searchParams\.set\('view', 'participant'\)/);
  assert.match(logout, /residentUrl\.searchParams\.set\('access', 'friendly'\)/);
  assert.match(logout, /state\.mode = 'participant'/);
  assert.match(logout, /invalidateViewRequests\(\)/);
  assert.match(logout, /leavingPrivilegedControlPanel[\s\S]*if \(!leavingPrivilegedControlPanel\)[\s\S]*closeResidentEntryGate\(\)/);
  assert.match(logout, /if \(!leavingPrivilegedControlPanel\)[\s\S]*return;[\s\S]*await forgetResidentDevice\(\)[\s\S]*clearAdminAuthorizationState\(\)/);
  const login = app.match(/async function handleResidentLogin\(event\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(login, /openResidentEntryGate\(\)/);
  assert.match(login, /clearAdminAuthorizationState\(\)[\s\S]*state\.residentEntryKind = 'common'/);
  assert.match(app, /function clearAdminAuthorizationState\(\)[\s\S]*state\.adminHydrationVersion \+= 1[\s\S]*state\.adminRole = ''[\s\S]*state\.adminCanManageDailyOperations = false[\s\S]*state\.residentAdministratorAuthorized = false/);
});

test('le preferenze locali residenti non sovrascrivono lo stile del pannello amministrativo', () => {
  assert.match(app, /if \(!state\.residentReady \|\| state\.adminRole \|\| \(state\.mode === 'admin' && !state\.residentSettingsMode\)\)\s*\{\s*return settings;/);
  assert.match(app, /if \(state\.residentReady \|\| state\.adminRole\) \{\s*const residentPreferences = loadResidentPreferences\(\);/);
});

test('gli aggiornamenti concorrenti vengono serializzati e accodati', () => {
  assert.match(app, /if \(state\.refreshInFlight\)/);
  assert.match(app, /state\.pendingRefreshSource/);
  assert.match(app, /await performRefresh\(source\)/);
});

test('un aggiornamento fallito conserva i dati partecipante già visibili', () => {
  const refresh = app.match(/async function refreshParticipant\(source, options = \{\}\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(refresh, /const hadVisibleData/);
  assert.match(refresh, /if \(hadVisibleData\) \{[\s\S]*renderParticipantMeals\(\)/);
  assert.match(refresh, /formatPreviousDataMessage/);
});

test('un errore temporaneo conserva identita e sessione residente', () => {
  const restore = participantData.match(/export async function restoreFriendlyResidentSession\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(restore, /isRecoverableSessionError\(error\)/);
  assert.match(restore, /error\.preserveResidentIdentity = true/);
  assert.match(restore, /throw error/);
  assert.match(app, /residentRestorePending: Boolean\(loadStoredResidentSignature\(\)\)/);
  assert.match(app, /shouldPreserveResidentViewAfterRefreshError/);
  assert.match(app, /state\.residentRestorePending = !state\.residentReady/);
});

test('un amministratore forte ripristina la propria persona anche senza una vecchia sessione residente locale', () => {
  const restore = participantData.match(/export async function restoreFriendlyResidentSession\(\)[\s\S]*?\n}/)?.[0] || '';
  const restoreAdmin = participantData.match(/export async function restoreResidentIdentityForAuthorizedAdministrator\([\s\S]*?\n}/)?.[0] || '';
  assert.match(restore, /if \(authorizedAdministrator\) \{\s*return restoreResidentIdentityForAuthorizedAdministrator\(authorizedAdministrator\);/);
  assert.match(restoreAdmin, /membershipSnapshot\.exists\(\)[\s\S]*membershipSnapshot\.data\(\)\.status !== 'ACTIVE'/);
  assert.match(restoreAdmin, /const membershipParticipantId = String\(/);
  assert.match(restoreAdmin, /!membershipParticipantId && membershipRole !== 'OWNER'/);
  assert.match(restoreAdmin, /loadCenterContactSettings\(\{ forceRefresh: false \}\)/);
  assert.doesNotMatch(restoreAdmin, /loadStoredResidentParticipantId|loadStoredResidentSignature/);
  assert.match(restoreAdmin, /return \{\s*participant,\s*participants: \[participant\],\s*strongAdministrator: true\s*\};/);
});

test('un account Google non autorizzato non blocca il successivo accesso residente', () => {
  const adminProbe = participantData.match(
    /async function getAuthorizedAdministratorUser\(\)[\s\S]*?\n}/
  )?.[0] || '';
  const login = participantData.match(
    /export async function signInFriendlyResident\(signature, commonPassword\)[\s\S]*?\n}/
  )?.[0] || '';
  assert.match(adminProbe, /catch \(error\)/);
  assert.match(adminProbe, /permission-denied/);
  assert.match(adminProbe, /return null/);
  assert.match(login, /withResidentTechnicalSession/);
  assert.match(login, /createPersonalAnonymousSession/);
});

test('la vista settimana usa una matrice con intestazioni pasto e comandi compatti', () => {
  const weekHandler = app.match(/async function handleWeekBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  const weekMealHandler = app.match(/async function handleWeekMealBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(app, /class="week-matrix\$\{showMassColumn \? ' week-matrix-with-mass' : ''\} week-controls-\$\{weekControlsOnLeft \? 'left' : 'right'\}"/);
  assert.match(app, /class="week-matrix-header"/);
  assert.match(app, /data-week-effect/);
  assert.match(app, /data-week-meal-effect/);
  assert.match(app, /data-week-meal-type/);
  assert.match(app, /formatWeekDayCode/);
  assert.match(app, /week-meal-heading/);
  assert.match(weekHandler, /saveParticipantMonthSelection/);
  assert.match(weekHandler, /state\.participantWeek/);
  assert.match(weekMealHandler, /saveParticipantMonthSelection/);
  assert.match(weekMealHandler, /mealTypeId/);
  assert.doesNotMatch(app, /class="day-bulk-actions"/);
});

test('la colonna dei giorni settimanali segue il lato scelto per i controlli mensili', () => {
  assert.match(app, /weekControlsOnLeft = \(state\.centerContactSettings\.monthControlsSide \|\| 'right'\) === 'left'/);
  assert.match(app, /controlsSide: weekControlsOnLeft \? 'left' : 'right'/);
  assert.match(app, /weekControlsOnLeft \? weekScopeButtonMarkup : ''/);
  assert.match(app, /weekControlsOnLeft \? dayButtonMarkup : ''/);
  assert.match(styles, /\.week-controls-right \.week-matrix-header,[\s\S]*repeat\(3, minmax\(0, 1fr\)\) var\(--week-day-column\)/);
  assert.match(styles, /\.week-matrix-with-mass\.week-controls-right[\s\S]*repeat\(4, minmax\(0, 1fr\)\) var\(--week-day-column\)/);
});

test('il comando mensile compatto sostituisce la barra doppia', () => {
  assert.match(app, /class="month-toggle-button/);
  assert.match(app, /data-month-scope="month"/);
  assert.match(app, /function getMonthSelectionEffect/);
  assert.match(app, /month-day-number-today/);
  assert.match(app, /day\.isToday \? ', oggi' : ''/);
  assert.doesNotMatch(app, /month-today-badge|>OGGI</);
  assert.match(app, /aria-current="date"/);
  assert.match(styles, /--today-ink: #24698f/);
  assert.match(styles, /\.month-day-today \{[\s\S]*?background: var\(--today-surface\)/);
  assert.match(styles, /\.month-day-number-today \{[\s\S]*?border: 1px solid var\(--today-line\)/);
  assert.match(styles, /\.month-day > \.month-day-number-today \{[\s\S]*?background: var\(--today-surface\)/);
  assert.match(styles, /\.month-day-number-today \.month-day-number-value \{[\s\S]*?border-radius: 50%;[\s\S]*?background: var\(--today-ink\);[\s\S]*?color: #fff/);
  assert.match(styles, /html\[data-theme="terracotta"\][\s\S]*?--today-ink: #b1502f/);
  assert.match(styles, /html\[data-theme="confetto"\][\s\S]*?--today-ink: #a92b52/);
  assert.match(styles, /\.week-matrix-row-today \.week-day-button strong \{[\s\S]*?border-radius: 999px;[\s\S]*?background: var\(--today-ink\)/);
  assert.match(styles, /\.month-week-mobile-header \.month-day-number-today \{[\s\S]*?height: 27px;[\s\S]*?border-bottom: 0;[\s\S]*?background: var\(--today-surface\)/);
  assert.match(styles, /\.month-day-today \{[\s\S]*?border-top: 0;[\s\S]*?background: var\(--today-surface\)/);
  assert.match(app, /renderMonthDayNumber\(day, 'month-day-number-inline'\)/);
  assert.match(styles, /\.month-day-number-inline,[\s\S]*?display: none !important/);
  assert.match(styles, /\.month-week-action-row\.month-week-complete \{[\s\S]*?box-shadow: none/);
  assert.match(styles, /\.month-day-today \{[\s\S]*?box-shadow: 0 0 0 1px color-mix/);
  assert.match(styles, /--calendar-heading-bg: #eef4f6/);
  assert.match(styles, /\.month-weekday-cell \{[\s\S]*?background: var\(--calendar-heading-bg\)/);
  assert.match(styles, /--month-weekday-control-height: 36px/);
  assert.match(styles, /\.month-weekday-cell,[\s\S]*?\.month-toggle-button \{\s*height: var\(--month-weekday-control-height\)/);
  assert.match(styles, /\.month-toggle-glyph \{[\s\S]*?place-items: center/);
  assert.doesNotMatch(app, /class="month-bulk-toolbar"/);
  assert.doesNotMatch(app, />Prenota mese<|>Svuota mese</);
});

test('la vista mese mobile porta la griglia in primo piano senza scavalcare l utente', () => {
  assert.match(index, /data-calendar-panel/);
  assert.match(app, /const MONTH_AUTO_SCROLL_DELAY_MS = 1800/);
  assert.match(app, /\['pointerdown', 'touchstart', 'wheel', 'keydown'\]/);
  assert.match(app, /window\.matchMedia\('\(max-width: 620px\)'\)\.matches/);
  assert.match(app, /window\.scrollY > 24/);
  assert.match(app, /elements\.calendarPanel\.scrollIntoView\(\{ behavior, block: 'start' \}\)/);
  assert.doesNotMatch(app, /querySelector\('\[data-current-week\]'\)/);
  assert.match(app, /scheduleMonthAutoScroll\(\)/);
});

test('la vista futura mantiene selezioni singole e azioni collettive', () => {
  assert.match(app, /function renderFutureMonth\(\)/);
  assert.match(app, /function renderFutureMonthScopeButton\(label, weekStart, mealTypeId/);
  assert.match(app, /renderFutureMonthScopeButton\('Mese', null, null, \{ scope: 'month' \}\)/);
  assert.match(app, /renderFutureMonthScopeButton\('Settimana', weekStart, null\)/);
  assert.match(app, /renderFutureMonthScopeButton\(getLocalizedMealLabel\(mealTypeId\), weekStart, mealTypeId\)/);
  assert.match(app, /data-month-scope="\$\{resolvedScope\}"/);
  assert.match(app, /data-month-effect="\$\{effect\}"/);
  assert.match(app, /handleMonthBulkButton\(scopeButton\)/);
  assert.match(app, /function renderFutureMonthMeal\(day, mealTypeId\)/);
  assert.match(app, /class="month-future-meal month-future-meal-locked" data-month-meal/);
  assert.match(app, /button\.classList\.toggle\('month-future-scope-selected', selected\)/);
  assert.match(app, /button\.classList\.toggle\('month-future-meal-present', isPresent\)/);
  assert.match(app, /button\.textContent = isPresent \? '✓' : '–'/);
  assert.match(app, /elements\.monthGrid\.querySelector\('\.month-future'\)/);
  assert.match(styles, /\.month-future-scope \{/);
  assert.match(styles, /\.month-future-scope-selected \{/);
});

test('la vista futura mese allinea creazione modifica e sincronizzazione delle prenotazioni', () => {
  const futureMealRenderer = app.match(/function renderFutureMonthMeal\(day, mealTypeId\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(futureMealRenderer, /data-month-meal/);
  assert.match(futureMealRenderer, /data-month-date/);
  assert.match(futureMealRenderer, /data-month-meal-id/);
  assert.match(futureMealRenderer, /data-month-effect="\$\{isPresent \? 'ABSENT' : 'PRESENT'\}"/);
  assert.match(futureMealRenderer, /aria-pressed="\$\{isPresent\}"/);

  const monthGridRenderer = app.match(/function renderMonthGrid\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(monthGridRenderer, /isFuture\s*\?\s*Boolean\(elements\.monthGrid\.querySelector\('\.month-future'\)\)/);
  assert.match(monthGridRenderer, /elements\.monthGrid\.dataset\.renderKey === monthRenderKey && hasGridBody/);
  assert.match(monthGridRenderer, /renderFutureMonth\(\);\s*elements\.monthGrid\.dataset\.renderKey = monthRenderKey;/);

  const syncMeal = app.match(/function syncMonthMealButton\(button, meal\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(syncMeal, /button\.classList\.contains\('month-future-meal'\)/);
  assert.match(syncMeal, /button\.classList\.toggle\('month-future-meal-present', isPresent\)/);
  assert.match(syncMeal, /button\.classList\.toggle\('month-future-meal-locked', !meal\.isOpen\)/);
  assert.match(syncMeal, /button\.textContent = isPresent \? '✓' : '–'/);

  const syncControls = app.match(/function syncMonthSelectionControls\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(syncControls, /button\.classList\.toggle\('month-future-scope-selected', selected\)/);
});

test('riepilogo e cucina portano il selettore giorni in primo piano solo quando serve', () => {
  assert.match(index, /data-summary-date-tabs/);
  assert.match(index, /data-kitchen-date-tabs/);
  assert.match(app, /const OPERATIONAL_AUTO_SCROLL_DELAY_MS = 1800/);
  assert.match(app, /const needsMoreRoom = panelRect\.bottom > window\.innerHeight && targetRect\.top > 8/);
  assert.match(app, /target\.scrollIntoView\(\{ behavior, block: 'start' \}\)/);
  assert.match(app, /scheduleOperationalAutoScroll\(\)/);
  assert.match(app, /scheduleOperationalAutoScroll\(\{ reset: true, delayMs: 220 \}\)/);
  assert.match(app, /previousOffset !== state\.summaryDayOffset/);
  assert.match(app, /previousOffset !== state\.kitchenDayOffset/);
});

test('una sessione residente non viene presentata come accesso amministratore', () => {
  assert.match(app, /user\.isAnonymous \|\| isResidentTechnicalEmail\(user\.email\)/);
  assert.match(app, /void reconcileAdminAccessWithoutStrongUser\(\)/);
  assert.doesNotMatch(app, /elements\.authStatus\.textContent = 'Accesso amministratore'/);
});

test('una richiesta residente superata non può rimontare il login dopo l accesso', () => {
  const refresh = app.match(/async function refreshParticipant\(source, options = \{\}\)[\s\S]*?\n}/)?.[0] || '';
  const login = app.match(/async function handleResidentLogin\(event\)[\s\S]*?\n}/)?.[0] || '';
  const logout = app.match(/async function handleForgetDevice\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(refresh, /if \(state\.residentAuthTransition\) return/);
  assert.match(refresh, /!isCurrentParticipantRequest\(request\) \|\| state\.residentAuthTransition/);
  assert.match(login, /state\.residentAuthTransition = 'signing-in'[\s\S]*invalidateViewRequests\(\)/);
  assert.match(logout, /state\.residentAuthTransition = 'signing-out'[\s\S]*invalidateViewRequests\(\)/);
});

test('l uscita residente chiude soltanto il modulo mentre il pannello privilegiato termina Firebase Auth', () => {
  const logout = app.match(/async function handleForgetDevice\(\)[\s\S]*?\n\}/)?.[0] || '';
  const softExit = logout.match(/if \(!leavingPrivilegedControlPanel\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(softExit, /closeResidentEntryGate\(\)/);
  assert.match(softExit, /renderResidentAccess\(true\)/);
  assert.doesNotMatch(softExit, /forgetResidentDevice|signOutCurrentUser/);
  assert.match(logout, /await forgetResidentDevice\(\)/);
  assert.match(app, /isResidentEntryGateClosed\(\)[\s\S]*renderResidentAccess\(true\)/);
});

test('il pannello amministrativo appare soltanto dopo autorizzazioni e dati operativi', () => {
  const applyAuth = app.match(/async function resolveAdminAuthState\(user[\s\S]*?\n}/)?.[0] || '';
  assert.match(app, /function beginAdminAuthorizationCheck\(\)[\s\S]*elements\.adminPanel\.hidden = true/);
  assert.match(app, /await i18nPromise;[\s\S]*initializeAuthPanel\(\)/);
  assert.match(applyAuth, /elements\.adminPanel\.hidden = true[\s\S]*await refreshAdminParticipants\(\)[\s\S]*finishAdminAuthorizationCheck\(\)[\s\S]*elements\.adminPanel\.hidden = !isAdmin/);
  assert.match(app, /adminPanelHydrating: false/);
  assert.match(app, /hydrationVersion === state\.adminHydrationVersion/);
});

test('il refresh del pannello completa il ripristino residente o vice pendente', () => {
  const reconcile = app.match(
    /function reconcileAdminAccessWithoutStrongUser\(\)[\s\S]*?\n\}/
  )?.[0] || '';
  assert.match(reconcile, /if \(state\.residentAuthTransition\)/);
  assert.doesNotMatch(reconcile, /residentRestorePending[\s\S]*return Promise\.resolve/);
  assert.match(reconcile, /await restoreResidentSettingsPanel\(\)/);
  assert.match(reconcile, /!isResidentEntryGateClosed\(\)/);
  assert.match(
    app,
    /residentRestorePending[\s\S]*!state\.residentAuthTransition[\s\S]*!strongAuthUser[\s\S]*reconcileAdminAccessWithoutStrongUser\(\)/
  );
  assert.match(
    app,
    /function renderResidentSettingsPanel\(\)[\s\S]*elements\.authStatus\.textContent = state\.selectedParticipant/
  );
});

test('i link operativi riallineano i pulsanti dopo ogni rendering del pannello', () => {
  const syncActions = app.match(
    /function syncOperationalLinkActionState\([\s\S]*?\n\}/
  )?.[0] || '';
  const overview = app.match(/function renderAdminOverview\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(syncActions, /CAPABILITIES\.VIEW_OPERATIONAL_LINKS/);
  assert.match(syncActions, /\[data-copy-access-link\], \[data-open-access-link\], \[data-share-access-link\]/);
  assert.match(syncActions, /control\.disabled = !enabled/);
  assert.match(syncActions, /control\.setAttribute\('aria-disabled', String\(!enabled\)\)/);
  assert.match(syncActions, /data-operational-link-url/);
  assert.match(overview, /syncOperationalLinkActionState\(\)/);
  assert.match(app, /syncOperationalLinkActionState\(canViewOperationalLinks\)/);
  assert.match(app, /getCachedAccessLinkUrl\(scope\) \|\| await resolveAccessLinkUrl\(scope\)/);
});

test('l uscita residente non impedisce il successivo accesso Google o email', () => {
  assert.match(
    app,
    /residentRestorePending: Boolean\(loadStoredResidentSignature\(\)\)[\s\S]*&& !isResidentEntryGateClosed\(\)/
  );
  const reconcile = app.match(
    /function reconcileAdminAccessWithoutStrongUser\(\)[\s\S]*?\n\}/
  )?.[0] || '';
  assert.match(reconcile, /const canRestoreResident = state\.mode === 'admin'[\s\S]*!isResidentEntryGateClosed\(\)/);
});

test('il logout dal pannello vice torna al nuovo accesso residente', () => {
  const ownerExit = app.match(/async function handleOwnerExit\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(ownerExit, /state\.adminRole === 'MANAGER'/);
  assert.match(ownerExit, /state\.residentAdministratorAuthorized/);
  assert.match(ownerExit, /return handleForgetDevice\(\)/);
});

test('le transizioni auth non possono smontare una sessione residente in corso', () => {
  const authPanel = app.match(/function initializeAuthPanel\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(authPanel, /shouldProcessAdminAuthEvent/);
  assert.match(authPanel, /mode: state\.mode/);
  assert.match(app, /function reconcileAdminAccessWithoutStrongUser\(\)[\s\S]*residentAuthTransition[\s\S]*residentRestorePending/);
  assert.match(app, /function isCenterAccessRevokedError\(error\)[\s\S]*firestore\/permission-denied/);
  assert.doesNotMatch(
    app.match(/function isCenterAccessRevokedError\(error\)[\s\S]*?\n}/)?.[0] || '',
    /non autorizzat|insufficient permission/
  );
  assert.match(app, /await waitForAuthReady\(\)[\s\S]*recoverStoredResidentSession\(\)[\s\S]*:auth-retry/);
  const residentAuthorization = participantData.match(
    /export async function loadResidentAdministratorAuthorization\(\)[\s\S]*?\n\}/
  )?.[0] || '';
  assert.match(residentAuthorization, /getDoc\(doc\(\s*db,/);
  assert.doesNotMatch(residentAuthorization, /sourceDb/);
});

test('Originale rigenera subito la matrice e non riusa le icone della vista precedente', () => {
  assert.match(app, /interfaceStyle: document\.documentElement\.dataset\.interfaceStyle \|\| 'original'/);
  assert.match(app, /if \(state\.residentReady \|\| \(state\.mode === 'week' && canUseWeekWithoutParticipant\(\)\)\) \{[\s\S]*renderParticipantMeals\(\)/);
});

test('l area amministrativa segue il ruolo registrato nel centro', () => {
  assert.doesNotMatch(participantData, /loadAdminAccess/);
  assert.match(adminCenter, /export async function loadAdminCenterAccess/);
  assert.match(adminCenter, /'centers', centerId, 'admins', user\.uid/);
  assert.match(adminCenter, /ADMIN_PROFILE_COLLECTION/);
  assert.match(adminCenter, /export async function initializeAdminCenter/);
  assert.match(app, /let access = await adminModule\.loadAdminCenterAccess\(user\)/);
  assert.match(app, /const isAdmin = access\.active/);
  assert.match(app, /elements\.adminPanel\.hidden = !isAdmin/);
  assert.match(app, /elements\.bootstrapButton\.hidden = !hasCurrentCapability\(CAPABILITIES\.MANAGE_CALENDAR\)/);
  assert.match(app, /function applyAdminCapabilityVisibility\(\)/);
  assert.match(rolePolicy, /MANAGE_CENTER_SETTINGS: 'manageCenterSettings'/);
  assert.match(index, /data-center-initializer/);
  assert.match(index, /data-admin-email-signin/);
  assert.match(index, /data-admin-email-create/);
  assert.match(app, /signInAdministratorWithEmail/);
  assert.match(app, /createAdministratorWithEmail/);
  assert.match(app, /reuseAdministratorAccountForInvitation/);
  assert.match(firebaseClient, /EmailAuthProvider\.credential/);
  assert.match(firebaseClient, /linkWithCredential/);
  assert.match(firebaseClient, /authenticatedEmail !== normalizedEmail/);
  assert.match(adminCenter, /getAdminInvitationId/);
  assert.match(adminCenter, /createCenterInvitation/);
});

test('il profilo amministratore ricorda l ultimo centro senza impedire appartenenze multiple', () => {
  const requestedCenterCheck = adminCenter.indexOf('const requestedCenterId = getActiveCenterId()');
  const profileFallback = adminCenter.indexOf("getDoc(doc(db, ADMIN_PROFILE_COLLECTION, user.uid))");
  assert.ok(requestedCenterCheck >= 0 && requestedCenterCheck < profileFallback);
  assert.doesNotMatch(adminCenter, /Questo account gestisce già il centro/);
  assert.match(adminCenter, /saveAdminProfile\(user, requestedCenterId, existingAccess\.role\)/);
  const ownershipTransfer = adminCenter.match(/export async function transferCenterOwnership\([\s\S]*?\n}\n/)?.[0] || '';
  assert.doesNotMatch(ownershipTransfer, /batch\.set\([^\n]*ProfileRef/);
  assert.doesNotMatch(ownershipTransfer, /successorProfileSnapshot|successorProfileRef/);
  assert.match(ownershipTransfer, /successorInvitation\.acceptedEmail[\s\S]*successor\.email/);
  assert.match(ownershipTransfer, /La membership del centro e'\s*\/\/ la fonte autorevole/);
});

test('il salvataggio settimanale non provoca una seconda lettura completa', () => {
  const mealHandler = app.match(/async function handleMealButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  const dayHandler = app.match(/async function handleDayBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(mealHandler, /refreshNow\('prenotazione'\)/);
  assert.doesNotMatch(dayHandler, /refreshNow\('prenotazione'\)/);
  assert.doesNotMatch(mealHandler, /loadCurrentParticipantWeek\(/);
  assert.doesNotMatch(dayHandler, /loadCurrentParticipantWeek\(/);
});

test('i salvataggi aggiornano lo stato locale e i bulk usano batch piccoli', () => {
  const monthMealHandler = app.match(/async function handleMonthMealButton\(event, button\)[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(monthMealHandler, /loadCurrentParticipantCalendar\(/);
  assert.match(participantData, /const RESERVATION_BATCH_SIZE = 6/);
  assert.match(participantData, /const RESERVATION_BATCH_CONCURRENCY = 3/);
  assert.match(participantData, /async function saveReservationGroup/);
  assert.match(participantData, /meals\.forEach\(\(meal\) => markMealSaved\(meal, effect\)\)/);
  assert.match(app, /state\.pendingMealKeys\.add\(pendingKey\)/);
  assert.match(app, /meal\.effect = effect;\s*sync\(\)/);
});

test('le prenotazioni usano la sorgente coerente con la sessione attiva', () => {
  assert.match(participantData, /function getReservationWriteSource\(\)/);
  assert.match(participantData, /!user\.isAnonymous[\s\S]*'ADMIN'[\s\S]*'PERSONAL'/);
  assert.match(participantData, /source: getReservationWriteSource\(\)/);
});

test('un bulk riuscito conserva createdAt e non ricrea gli override al clic successivo', () => {
  const optimisticBulk = app.match(/function beginOptimisticBulkSelection\(days, effect, mealTypeId = null\)[\s\S]*?\n\}/)?.[0] || '';
  const dayHandler = app.match(/async function handleDayBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  const weekHandler = app.match(/async function handleWeekBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  const weekMealHandler = app.match(/async function handleWeekMealBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  const monthHandler = app.match(/async function handleMonthBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(optimisticBulk, /commit\(\)[\s\S]*meal\.createdAt = savedAt/);
  assert.match(optimisticBulk, /\[state\.participantWeek, state\.participantMonth\]/);
  assert.match(dayHandler, /optimistic\.commit\(\)/);
  assert.match(weekHandler, /result\.failed > 0[\s\S]*optimistic\.commit\(\)/);
  assert.match(weekMealHandler, /result\.failed > 0[\s\S]*optimistic\.commit\(\)/);
  assert.match(monthHandler, /result\.failed === 0[\s\S]*optimistic\.commit\(\)/);
});

test('le griglie usano listener delegati invece di ricrearli a ogni render', () => {
  assert.match(app, /elements\.participantMeals\.addEventListener\('click', handleParticipantMealsClick\)/);
  assert.match(app, /function handleParticipantMealsClick\(event\)[\s\S]*data-meal-date[\s\S]*data-day-effect[\s\S]*data-summary-date/);
  assert.match(app, /function handleMonthGridClick\(event\)[\s\S]*data-month-meal[\s\S]*data-month-day[\s\S]*data-month-scope/);
  assert.doesNotMatch(app, /elements\.monthGrid\.querySelectorAll\([^\n]+\)\.forEach\([^\n]+addEventListener/);
});

test('i controlli multipli delle settimane senza pasti modificabili nascono disabilitati', () => {
  assert.match(
    app,
    /function renderMonthScopeButtons[\s\S]*const editableMeals = getMonthScopeMeals\(weekStart, mealTypeId\)[\s\S]*editableMeals\.length > 0 \? '' : ' disabled'/
  );
});

test('sessioni e refresh ravvicinati evitano round trip duplicati senza anticipare le letture protette', () => {
  assert.match(participantData, /const SESSION_RECHECK_MS = 5 \* 60 \* 1000/);
  assert.match(participantData, /if \(canReuseCurrentSession\(user, 'PUBLIC'\)\)/);
  assert.match(app, /function scheduleBackgroundRefresh\(source\)/);
  assert.match(app, /window\.clearTimeout\(state\.backgroundRefreshTimerId\)/);
  assert.match(app, /sessionPromise = ensurePublicDemoSession\(\)/);
  assert.match(app, /await sessionPromise;[\s\S]*const centerSettings = await loadCenterContactSettings/);
  assert.match(app, /await ensureKitchenDemoSession\(\)[\s\S]*const centerSettings = await loadCenterContactSettings/);
  assert.match(centerSettings, /refreshCenterContactSettings\(\)\.catch\(\(\) => undefined\);\s*}\s*return centerContactSettingsCache\.value/);
});

test('il bootstrap residente completa la sessione prima delle letture protette', () => {
  const refresh = app.match(/async function refreshParticipant\(source, options = \{\}\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(refresh, /sessionPromise = ensureStoredResidentSession\(\)/);
  assert.match(refresh, /await sessionPromise;[\s\S]*const centerSettings = await loadCenterContactSettings/);
  assert.doesNotMatch(refresh, /Promise\.all\(\[sessionPromise, settingsPromise\]\)/);
  assert.match(participantData, /export async function recoverStoredResidentSession/);
  assert.match(participantData, /ensurePersonalSession\(participantId, token, \{ forceRefresh: true \}\)/);
});

test('il primo caricamento mostra subito le selezioni del periodo corrente', () => {
  const refresh = app.match(/async function refreshParticipant\(source, options = \{\}\)[\s\S]*?\n}/)?.[0] || '';
  const anchor = app.match(/function anchorCalendarToCenterToday\(\)[\s\S]*?\n}/)?.[0] || '';
  const calendarLoad = app.match(/async function loadCurrentParticipantCalendar\(options = \{\}\)[\s\S]*?\n}/)?.[0] || '';

  assert.match(refresh, /if \(anchorCalendarToCenterToday\(\)\) \{\s*request = beginParticipantRequest\(\);\s*}/);
  assert.match(anchor, /state\.calendarAnchoredToCenter[\s\S]*return false/);
  assert.match(anchor, /state\.calendarAnchoredToCenter = true;\s*return true/);
  assert.match(calendarLoad, /const participantMonth = await loadParticipantWeek\(/);
  assert.match(calendarLoad, /if \(options\.isCurrentRequest && !options\.isCurrentRequest\(\)\) return false;\s*state\.participantMonth = participantMonth/);
  assert.doesNotMatch(calendarLoad, /state\.participantMonth = await loadParticipantWeek\(/);
});

test('un caricamento impostazioni iniziato prima del salvataggio non ripristina lo stile precedente', () => {
  assert.match(centerSettings, /let centerContactSettingsRevision = 0/);
  assert.match(centerSettings, /centerContactSettingsRevision \+= 1/);
  assert.match(centerSettings, /const requestRevision = centerContactSettingsRevision/);
  assert.match(centerSettings, /requestRevision !== centerContactSettingsRevision[\s\S]*refreshCenterContactSettings\(\)/);
  assert.match(centerSettings, /centerContactSettingsLoad === request/);
});

test('mese e settimana condividono la domenica come primo giorno', () => {
  assert.match(app, /result\.setDate\(result\.getDate\(\) - result\.getDay\(\)\)/);
  assert.match(app, /gridStart\.setDate\(firstDay\.getDate\(\) - firstDay\.getDay\(\)\)/);
});

test('mese e settimana tornano al periodo corrente al cambio vista e avanzano oltre mezzanotte', () => {
  const viewEntry = app.match(/function prepareMonthAutoScrollEntry\(previousMode, nextMode\)[\s\S]*?\n}/)?.[0] || '';
  const anchor = app.match(/function anchorCalendarToCenterToday\(\)[\s\S]*?\n}/)?.[0] || '';

  assert.match(viewEntry, /nextMode === 'participant' \|\| nextMode === 'week'/);
  assert.match(viewEntry, /const today = getCenterToday\(\)/);
  assert.match(viewEntry, /state\.weekStartDate = startOfWeek\(today\)/);
  assert.match(viewEntry, /state\.monthDate = startOfMonth\(today\)/);
  assert.match(anchor, /state\.calendarAnchorDateId === todayId/);
  assert.match(anchor, /wasCurrentWeek[\s\S]*state\.weekStartDate = startOfWeek\(today\)/);
  assert.match(anchor, /wasCurrentMonth[\s\S]*state\.monthDate = startOfMonth\(today\)/);
  assert.match(anchor, /state\.calendarAnchorDateId = todayId/);
});

test('i numeri di telefono vengono normalizzati prima del salvataggio', () => {
  assert.match(app, /normalizePhoneNumber\(value\)/);
  assert.match(participantProfile, /digits\.length < 6 \|\| digits\.length > 15/);
  assert.match(participantProfile, /Il numero di telefono deve contenere da 6 a 15 cifre/);
  assert.match(app, /validateParticipantProfile\(/);
});

test('avatar centro e comandi di pagina seguono la disposizione contestuale', () => {
  assert.match(index, /class="center-avatar" data-center-avatar/);
  assert.match(index, /data-admin-center-avatar-input/);
  assert.match(index, /class="account-footer"[\s\S]*data-admin-shell[\s\S]*data-forget-device/);
  assert.equal((index.match(/data-refresh-button/g) || []).length, 4);
  assert.match(index, /participant-status-row[\s\S]*data-refresh-button/);
  assert.match(index, /summary-status-row[\s\S]*data-summary-status[\s\S]*data-refresh-button/);
  assert.match(index, /data-kitchen-panel[\s\S]*kitchen-status-row[\s\S]*data-status[\s\S]*data-refresh-button/);
  assert.equal((index.match(/data-participant-nav-link/g) || []).length, 1);
  assert.match(index, /summary-status-row[\s\S]*data-summary-status[\s\S]*data-refresh-button/);
  assert.match(index, /data-summary-date-tabs[\s\S]*data-participant-nav-link[\s\S]*data-operational-view-switch/);
  const kitchenPanel = index.match(/<section class="board"[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(kitchenPanel, /data-participant-nav-link|compact-status-link|<a\b/);
  assert.match(app, /const monthHref = buildOperationalLink\('participant'/);
  assert.match(app, /elements\.monthNavLinks\.forEach\(\(link\) => \{\s*link\.href = monthHref/);
  assert.match(styles, /\.summary-status-row > p \{[\s\S]*?justify-self: end;[\s\S]*?text-align: right;/);
  assert.match(styles, /\.kitchen-status-row > p \{[\s\S]*?justify-self: end;[\s\S]*?text-align: right;/);
  assert.match(app, /elements\.refreshButtons\.forEach/);
  assert.match(app, /loadCachedCenterAvatar\(\)/);
  assert.match(app, /renderCenterAvatar\(isParticipant \|\| isWeek \|\| isSummary \|\| isKitchen, centerName\)/);
  assert.match(app, /!state\.adminCenterDirty[\s\S]*?!state\.pendingCenterAvatarDataUrl[\s\S]*?!hasPendingAdminAdaptationChanges\(\)/);
  assert.match(app, /await ensureKitchenDemoSession\(\)[\s\S]*?const centerSettings = await loadCenterContactSettings[\s\S]*?renderMode\(\);[\s\S]*?loadKitchenCounts/);
  assert.match(centerSettings, /CENTER_AVATAR_STORAGE_KEY/);
  assert.match(centerSettings, /cached\?\.version === avatarVersion/);
  assert.match(app, /admin\.avatar\.readyNeedsPassword/);
  assert.match(app, /state\.pendingCenterAvatarDataUrl && state\.centerContactSettings\.commonPasswordSet/);
  assert.doesNotMatch(index, /data-admin-center-avatar-save/);
  assert.doesNotMatch(app, /adminCenterAvatarSave|handleAdminCenterAvatarSave/);
  assert.match(app, /state\.pendingCenterAvatarDataUrl = await prepareCenterAvatar\(file\);[\s\S]*?state\.adminCenterDirty = true/);
  assert.match(centerSettings, /export async function saveCenterAvatar/);
  assert.doesNotMatch(participantData.match(/export async function forgetResidentDevice\(\)[\s\S]*?\n\}/)?.[0] || '', /CENTER_AVATAR/);
});

test('la sessione amministrativa forte sopravvive alle viste Pasti e Riepilogo', () => {
  assert.match(firebaseClient, /export async function verifyResidentCommonPassword/);
  assert.match(firebaseClient, /getResidentMaintenanceAuth\(\)[\s\S]*signInWithEmailAndPassword\(maintenanceAuth/);
  assert.match(participantData, /function getStrongAuthenticatedUser\(\)/);
  assert.match(participantData, /async function getAuthorizedAdministratorUser\(\)/);
  assert.match(participantData, /hasCapability\(role, CAPABILITIES\.OPEN_ADMIN_AREA\)/);
  const adminCheck = participantData.match(/async function getAuthorizedAdministratorUser\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(adminCheck, /catch\s*\{/);
  assert.match(participantData, /const keepStrongAdministratorSession = Boolean\(strongAuthenticatedUser && authorizedAdministrator\)/);
  assert.match(participantData, /if \(keepStrongAdministratorSession\) \{[\s\S]*verifyResidentCommonPassword/);
  assert.match(participantData, /if \(!keepStrongAdministratorSession\) \{[\s\S]*createPersonalAnonymousSession/);
  assert.match(participantData, /if \(strongAuthenticatedUser && !authorizedAdministrator\) \{[\s\S]*return null/);
  assert.match(participantData, /export async function ensureStoredResidentSession\(\) \{[\s\S]*return authorizedAdministrator/);
  assert.match(participantData, /export async function ensurePublicDemoSession\(\) \{[\s\S]*return authorizedAdministrator/);
  assert.match(app, /elements\.controlPanelEntry,[\s\S]*elements\.mealsReturnEntry[\s\S]*handleInAppNavigation/);
  assert.match(app, /const isControlPanelTarget = targetMode === 'admin'/);
  assert.match(app, /if \(isOperationalTarget && hasStrongAdministratorIdentity\(\) && state\.adminRole\)[\s\S]*restoreResidentIdentityForAuthorizedAdministrator\(\)/);
  assert.match(participantData, /membershipParticipantId[\s\S]*administratorParticipantId[\s\S]*strongAdministrator: true/);
  assert.match(app, /elements\.controlPanelEntry\.hidden = !isOrdinaryView\s*\|\| \(!needsResidentLogin && !canOpenControlPanel\)/);
});

test('sul mobile selettori e pulsante operativo restano affiancati e stabili', () => {
  assert.equal((index.match(/data-operational-view-switch/g) || []).length, 3);
  assert.match(index, /operational-view-switch-measure[\s\S]*data-i18n="app\.action\.book">Prenota/);
  assert.match(index, /data-participant-nav-link data-operational-view-switch[\s\S]*data-i18n="app\.action\.book">Prenota/);
  assert.match(index, /data-participant-nav-link data-operational-view-switch[\s\S]*operational-view-switch-measure[\s\S]*data-i18n="summary\.view\.title"/);
  assert.match(summaryStyles, /\.operational-view-switch > span \{[\s\S]*grid-area: 1 \/ 1/);
  assert.match(summaryStyles, /\.operational-view-switch \{[\s\S]*height: 42px !important;[\s\S]*min-height: 42px !important/);
  assert.match(summaryStyles, /@media \(max-width: 520px\)[\s\S]*\.meal-view-nav \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) max-content/);
  assert.match(summaryStyles, /\[data-summary-panel\] \.summary-date-tabs \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) max-content/);
  assert.match(summaryStyles, /@media \(min-width: 621px\)[\s\S]*\[data-summary-panel\] \.summary-date-tabs > \[data-participant-nav-link\] \{[\s\S]*margin-left: auto/);
});

test('ogni nuovo ingresso nel riepilogo riparte da Oggi', () => {
  assert.match(app, /if \(nextMode === 'summary'\) \{[\s\S]*state\.summaryDayOffset = 0/);
});

test('il riepilogo non interpreta il caricamento incompleto come Messa No', () => {
  assert.match(
    app,
    /const hasLegacySummaryData = state\.todayOverview\.length > 0[\s\S]*state\.summaryDailyOperation !== null[\s\S]*state\.summaryDailyHealth !== null/
  );
  assert.match(
    app,
    /if \(!hasLegacySummaryData\) \{[\s\S]*elements\.todayOverview\.replaceChildren\(\);[\s\S]*delete elements\.todayOverview\.dataset\.renderKey;[\s\S]*return;/
  );
  assert.match(app, /function renderMassCard\(dailyOperation\) \{\s*if \(!dailyOperation\) return '';/);
});

test('la cucina non mostra Messa No prima che il dato operativo sia disponibile', () => {
  assert.match(index, /data-kitchen-mass[^>]*aria-label="Messa: No"[^>]*hidden/);
  assert.match(app, /massCard\.hidden = state\.kitchenDailyOperation === null/);
  assert.match(app, /function renderKitchenMass\(\) \{[\s\S]*state\.kitchenDailyOperation === null[\s\S]*card\.hidden = true[\s\S]*return;/);
});

test('il pannello amministratore mantiene una gerarchia responsive senza duplicare i comandi', () => {
  assert.match(index, /class="admin-dashboard-grid"/);
  assert.match(index, /class="admin-control-section admin-center-settings"/);
  assert.match(index, /class="admin-control-section admin-person-editor"/);
  assert.match(index, /class="admin-people-overview admin-control-section admin-people-directory"/);
  assert.match(styles, /\.admin-dashboard-grid\s*\{[\s\S]*grid-template-columns: minmax\(280px, 0\.82fr\) minmax\(420px, 1\.18fr\)/);
  assert.match(styles, /@media \(max-width: 899px\)[\s\S]*\.admin-person-editor\s*\{[\s\S]*grid-column: 1/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.admin-option-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.equal((index.match(/data-admin-save-button/g) || []).length, 1);
  assert.equal((index.match(/data-admin-delete-participant/g) || []).length, 1);
  assert.equal((index.match(/data-admin-center-settings-save/g) || []).length, 1);
});

test('il pannello desktop usa soltanto la larghezza necessaria ed è centrato', () => {
  assert.match(styles, /body\[data-mode="admin"\] \.topbar,[\s\S]*?body\[data-mode="admin"\] \.admin-shell\s*\{[\s\S]*?width: min\(100%, 820px\);[\s\S]*?margin-inline: auto;/);
  assert.match(styles, /@media \(min-width: 900px\)[\s\S]*?body\[data-mode="admin"\] \.admin-shell\s*\{[\s\S]*?width: min\(100%, 820px\);[\s\S]*?margin-inline: auto;/);
  assert.match(styles, /body\[data-mode="admin"\] \.admin-section-nav\s*\{[\s\S]*?flex-wrap: nowrap;[\s\S]*?justify-content: center;/);
  assert.match(styles, /\.admin-panel > \.admin-overview-content,[\s\S]*?\.admin-panel > \.admin-dashboard-grid\s*\{[\s\S]*?max-width: 720px;[\s\S]*?margin-inline: auto;/);
  assert.match(styles, /\.admin-shell\[data-admin-owner="true"\] \{[\s\S]*?margin-top: 10px;/);
  assert.match(index, /data-meals-return-entry[\s\S]*data-i18n-aria-label="app\.header\.bookings"[\s\S]*data-i18n="app\.header\.bookings">Prenotazioni/);
  assert.match(styles, /\.topbar-meals-return small \{[\s\S]*?color: var\(--muted\);[\s\S]*?font-weight: 400;/);
});

test('il residente trova sempre il ritorno alle prenotazioni nel pannello Aspetto', () => {
  assert.match(
    app,
    /elements\.mealsReturnEntry\.hidden = !isAdminView[\s\S]*?\|\| \(state\.platformOwner && !state\.residentSettingsMode\)/
  );
  assert.match(
    app,
    /function renderResidentSettingsPanel\(\)[\s\S]*?elements\.topbarContextNav\.hidden = false;[\s\S]*?elements\.mealsReturnEntry\.hidden = false;/
  );
});

test('le traduzioni contestuali del pannello residente non vengono sovrascritte da i18n', () => {
  const contextualCopy = app.match(/function syncAdaptationsContextCopy\(\)[\s\S]*?function setContextualTranslation[\s\S]*?\n}/)?.[0] || '';
  assert.match(contextualCopy, /element\.dataset\.i18n = key/);
  assert.match(contextualCopy, /resident\.preferences\.title/);
  assert.match(contextualCopy, /resident\.preferences\.description/);
  assert.match(contextualCopy, /resident\.preferences\.layoutsHelp/);
  assert.match(contextualCopy, /resident\.preferences\.save/);
});

test('la scheda Aspetto usa tutta la larghezza disponibile sul tablet', () => {
  assert.match(styles, /@media \(max-width: 899px\)[\s\S]*?#admin-adaptations-section \{[\s\S]*?display: block;[\s\S]*?width: 100%;/);
  assert.match(styles, /#admin-adaptations-section > \.admin-control-section \{[\s\S]*?width: 100%;[\s\S]*?max-width: none;/);
});

test('il riepilogo mostra telefono e WhatsApp soltanto con consenso', () => {
  assert.match(app, /includeContacts: state\.centerContactSettings\.participantContactSharingEnabled/);
  assert.match(participantData, /async function listSummaryParticipants/);
  assert.match(participantData, /const phoneConsent = Boolean\(data\.phoneConsent && phone\)/);
  assert.match(participantData, /whatsappEnabled: Boolean\(data\.whatsappEnabled && phoneConsent\)/);
  assert.match(app, /href="tel:\$\{escapeHtml\(phone\)\}"/);
  assert.match(app, /href="https:\/\/wa\.me\/\$\{whatsappNumber\}"/);
  assert.match(app, /src="\/icons\/whatsapp\.svg\?v=20260808a"/);
  assert.match(app, /renderParticipantContact\(participant, ` \(\$\{dietCodes\.join\(', '\)\}\)`\)/);
});

test('la chiamata ai commensali e attiva per impostazione predefinita', () => {
  assert.match(bootstrapDemo, /participantContactSharingEnabled: true/);
  assert.match(adminCenter, /participantContactSharingEnabled: true/);
  assert.match(app, /centerContactSettings: \{[\s\S]*participantContactSharingEnabled: true/);
  assert.match(centerSettings, /participantContactSharingEnabled: data\.participantContactSharingEnabled !== false/);
});

test('la scheda Persone resta aperta dopo il salvataggio e presenta un elenco compatto per sigla', () => {
  assert.match(index, /admin\.people\.intro[^>]*>Inserisci i commensali del centro e condividi il collegamento per accedere al calendario\./);
  assert.match(app, /state\.adminActiveSection \|\| resolveInitialAdminSection\(\)/);
  assert.match(app, /function getAdminParticipantsSortedBySignature\(\)/);
  assert.match(app, /localeCompare\([\s\S]*numeric: true/);
  assert.match(app, /admin-person-signature[\s\S]*admin-person-display/);
  assert.match(app, /participantHasAdministratorRole\(participant\) \? t\('role\.admin'\)/);
  assert.match(app, /admin\.people\.phonePresent/);
  assert.match(styles, /\.admin-person-row \{[\s\S]*min-height: 44px;[\s\S]*padding: 2px 0;/);
  assert.match(styles, /\.admin-person-name strong \{[\s\S]*display: inline-flex;/);
});

test('la Persona designata come amministratore riceve una membership persistente', () => {
  assert.match(app, /await linkCurrentAdministratorParticipant\(administratorParticipantId\)/);
  assert.match(adminCenter, /export async function linkCurrentAdministratorParticipant/);
  assert.match(adminCenter, /batch\.update\(doc\(db, 'centers', centerId, 'admins', user\.uid\)/);
  assert.match(index, /data-admin-participant-administrative-role[\s\S]*option value="administrator"/);
  assert.match(app, /assignCenterAdministratorParticipant/);
  assert.match(participantData, /administratorParticipantId:\s*normalizedParticipantId/);
});

test('il pannello amministratore distingue sospensione ed eliminazione definitiva', () => {
  assert.match(app, /data-admin-person-toggle-active/);
  assert.match(app, /data-admin-person-delete/);
  assert.match(index, /data-admin-delete-participant[^>]*hidden>Elimina persona/);
  assert.match(app, /handleAdminDeleteParticipant/);
  assert.match(app, /title: 'Elimina definitivamente la persona'[\s\S]*destructive: true/);
  const deleteHandler = app.match(/async function deleteParticipantFromAdminPanel[\s\S]*?\n}/)?.[0] || '';
  assert.doesNotMatch(deleteHandler, /requiredText/);
  assert.match(app, /pendingAdminParticipantStatusIds: new Set\(\)/);
  assert.match(app, /pendingAdminParticipantDeleteIds: new Set\(\)/);
  assert.match(app, /participant\.status = nextActive \? 'ACTIVE' : 'DISABLED'[\s\S]*renderAdminPeopleList\(\)[\s\S]*setAdminParticipantActiveStatus/);
  assert.match(deleteHandler, /state\.adminParticipants = state\.adminParticipants\.filter[\s\S]*deleteAdminParticipant/);
  assert.match(deleteHandler, /catch \(error\)[\s\S]*state\.adminParticipants = previousAdminParticipants/);
});

test('la condivisione contatti appartiene alla Configurazione e usa il salvataggio globale', () => {
  const settingsStart = index.indexOf('id="admin-configuration-section"');
  const settingsEnd = index.indexOf('id="admin-access-section"', settingsStart);
  const personStart = index.indexOf('id="admin-person-editor"');
  const personEnd = index.indexOf('class="admin-people-overview', personStart);
  const settingsSection = index.slice(settingsStart, settingsEnd);
  const personSection = index.slice(personStart, personEnd);
  assert.match(settingsSection, /data-admin-contact-sharing-select/);
  assert.doesNotMatch(personSection, /data-admin-contact-sharing-select/);
  assert.doesNotMatch(app, /updateParticipantContactSharing/);
  assert.match(app, /participantContactSharingEnabled: elements\.adminContactSharingSelect/);
  assert.match(app, /adminCenterSettingsSection\.addEventListener\('change', markAdminCenterDirty\)/);
  assert.match(app, /administratorName: state\.centerContactSettings\.administratorName/);
  assert.match(centerSettings, /participantContactSharingEnabled: Boolean\(participantContactSharingEnabled\)/);
  assert.match(calendarConfiguration, /participantContactSharingEnabled: target\.participantContactSharingEnabled/);
  assert.doesNotMatch(app, /saveRequests\.push\(updateCenterContactSettings/);
});

test('la scheda persona modifica i dati e l’elenco consente la cancellazione rapida', () => {
  assert.match(app, /data-admin-person-open/);
  assert.doesNotMatch(app, /data-admin-person-save/);
  assert.match(app, /data-admin-person-delete="\$\{participantId\}"/);
  assert.match(app, /deleteParticipantFromAdminPanel\(participant, deleteButton\)/);
  assert.match(index, /Scegli una persona per modificarne la scheda/);
  assert.match(index, /data-admin-new-participant[^>]*admin\.people\.newPerson/);
  assert.doesNotMatch(index, /data-admin-participant-select/);
  assert.match(app, /data-admin-person-open/);
  assert.doesNotMatch(app, /renderAdminParticipantOptions|handleAdminParticipantChange/);
});

test('amministratore e vice sono ruoli mutuamente esclusivi nel modulo persona', () => {
  const roleSelect = index.match(/<select data-admin-participant-administrative-role>[\s\S]*?<\/select>/)?.[0] || '';
  assert.match(roleSelect, /option value="none"/);
  assert.match(roleSelect, /option value="vice"/);
  assert.match(roleSelect, /option value="administrator"/);
  assert.doesNotMatch(index, /data-admin-participant-vice|data-admin-participant-administrator/);
  assert.match(app, /const selectedAdministrativeRole = elements\.adminParticipantAdministrativeRole\?\.value \|\| 'none'/);
  assert.match(app, /const administratorChecked = selectedAdministrativeRole === 'administrator'/);
  assert.match(app, /selectedAdministrativeRole === 'vice'/);
  assert.match(app, /function syncAdminAdministrativeRoleControl\(participant\)/);
  assert.match(app, /function canDesignateCenterAdministrator\(\) \{\s*return state\.adminRole === 'OWNER';\s*\}/);
  assert.doesNotMatch(app.match(/function canDesignateCenterAdministrator\(\)[\s\S]*?\n\}/)?.[0] || '', /residentAdministratorAuthorized/);
});

test('la messa si programma nella vista settimana per i ruoli autorizzati', () => {
  assert.match(index, /data-admin-participant-liturgy/);
  assert.doesNotMatch(index, /data-admin-mass-week-grid/);
  assert.doesNotMatch(index, /data-admin-mass-week-prev/);
  assert.doesNotMatch(index, /data-admin-mass-week-next/);
  assert.match(app, /loadDailyOperations/);
  assert.match(app, /week-matrix-with-mass/);
  assert.match(app, /week-mass-heading/);
  assert.match(app, /week-mass-mobile-icon[^>]*aria-hidden="true">\$\{getInterfaceIcon\('church', '⛪'\)\}<\/span>/);
  assert.match(app, /week-heading-label">\$\{escapeHtml\(t\('summary\.mass'\)\)\}<\/span>/);
  assert.doesNotMatch(app, /week-heading-icon[^>]*aria-hidden="true">M<\/span>/);
  assert.match(app, /data-week-mass-bulk/);
  assert.match(app, /handleWeekMassBulkButton/);
  assert.match(app, /saveMassStatuses/);
  assert.match(app, /openDays\.map\(\(day\) => parseDateId\(day\.date\)\)/);
  assert.match(app, /data-week-mass-date/);
  assert.match(app, /getMealCutoffDate\([\s\S]*'dinner'/);
  assert.match(app, /week-mass-button-locked/);
  assert.doesNotMatch(styles, /\.week-mass-mobile-icon\s*\{[\s\S]*?display:\s*none/);
  assert.match(app, /state\.adminCanManageMass = isAdmin && access\.canManageMass === true/);
  assert.match(app, /liturgicalRole: state\.selectedParticipant\?\.liturgicalRole === true/);
  assert.match(app, /restoreResidentIdentityForAuthorizedAdministrator/);
  assert.match(app, /state\.weekDailyOperations\.push\(\{ dateId, massScheduled \}\)/);
  assert.match(app, /state\.weekDailyOperations = state\.weekDailyOperations\.filter/);
  assert.doesNotMatch(app, /data-week-mass-(?:row|effect)/);
  assert.match(participantProfile, /liturgicalRole: profile\.liturgicalRole === true/);
  assert.match(adminCenter, /canManageMass: hasCapability\(role, CAPABILITIES\.MANAGE_MASS/);
  assert.match(adminCenter, /publicParticipants[\s\S]*liturgicalRole/);
  assert.match(adminCenter, /canManageDailyOperations: hasCapability\(role, CAPABILITIES\.MANAGE_DAILY_OPERATIONS\)/);
  assert.match(participantProfile, /viceAdminRole: profile\.viceAdminRole === true/);
  assert.match(participantData, /export async function listCenterAdministrators/);
  assert.match(app, /listPublicParticipants\(\{/);
  assert.match(app, /viceAdminRole: options\.viceAdminRole === true/);
  assert.match(app, /function canEditParticipantLiturgy\(participant\)/);
  assert.match(app, /participant\.participantId === state\.selectedParticipant\?\.participantId/);
  assert.match(app, /elements\.adminParticipantLiturgy\.disabled = !canEditParticipantLiturgy\(participant\)/);
  assert.match(app, /liturgicalRole: canEditParticipantLiturgy\(participant\)/);
});

test('la gestione quotidiana resta nella vista settimana e alimenta riepilogo e cucina', () => {
  assert.match(index, /data-week-operations/);
  assert.match(index, /class="agenda-center-icon"/);
  assert.match(index, /data-week-health-section/);
  assert.doesNotMatch(index, /data-week-health-section[^>]*\sopen/);
  assert.match(index, /data-week-health-list/);
  assert.match(index, /data-week-health-save/);
  assert.match(index, /data-week-diet-participant/);
  assert.match(index, /data-week-diet-duration/);
  assert.match(index, /data-week-kitchen-note-input/);
  assert.match(index, /data-week-kitchen-note-list/);
  assert.doesNotMatch(index, /data-admin-health-day/);
  assert.doesNotMatch(index, /data-admin-kitchen-note-day/);
  assert.match(index, /data-kitchen-sick/);
  assert.match(app, /loadDailyHealth/);
  assert.match(app, /saveSickPeople/);
  assert.match(app, /data-week-sick-select/);
  assert.match(app, /elements\.weekHealthSection\.open = sickCount > 0/);
  assert.match(app, /removeKitchenNoteMessage/);
  assert.match(app, /data-week-kitchen-note-remove/);
  assert.doesNotMatch(app, /weekKitchenNoteInput\.value = state\.weekOperationalNote/);
  assert.match(kitchenNotes, /export async function removeKitchenNoteMessage/);
  assert.match(kitchenNotes, /nextMessages = \[\.\.\.messages/);
  assert.match(kitchenNotes, /runTransaction/);
  assert.match(kitchenNotes, /const cacheKey = `\$\{getActiveCenterId\(\)\}:\$\{mealDate\}`/);
  assert.match(app, /saveDietAssignments/);
  assert.match(app, /function applyDailyDietsToSummary/);
  assert.match(app, /function applyDailyDietsToKitchenMeals/);
  assert.match(app, /function renderSickCard/);
  assert.match(app, /function renderKitchenSickPeople/);
  assert.match(app, /state\.mode === 'week'[\s\S]*canManageDailyOperations\(\)[\s\S]*state\.adminParticipants\.length === 0/);
});

test('il refresh diretto della settimana ripristina le capability operative dell amministratore', () => {
  const refresh = app.match(/async function refreshParticipant\(source, options = \{\}\)[\s\S]*?\n\}/)?.[0] || '';
  const strongAuthorization = app.match(
    /async function refreshStrongAdministratorOperationalAuthorization\(\)[\s\S]*?\n\}/
  )?.[0] || '';
  assert.match(
    refresh,
    /await refreshResidentAdministratorAuthorization\(\);[\s\S]*await refreshStrongAdministratorOperationalAuthorization\(\);[\s\S]*loadCurrentParticipantCalendar/
  );
  assert.match(strongAuthorization, /state\.residentEntryKind !== 'strong-admin'/);
  assert.match(strongAuthorization, /loadCurrentAdminMembership\(user\)/);
  assert.match(strongAuthorization, /getCurrentUser\(\)\?\.uid !== user\?\.uid/);
  assert.match(strongAuthorization, /state\.adminRole = membership\.role/);
  assert.match(strongAuthorization, /state\.adminCanManageDailyOperations = membership\.canManageDailyOperations === true/);
  assert.match(strongAuthorization, /state\.residentAdministratorAuthorized = false/);
  assert.doesNotMatch(strongAuthorization, /state\.residentEntryKind === 'common'/);
});

test('il ruolo vice usa direttamente sigla e password amministratori nel login residente', () => {
  assert.match(index, /data-admin-participant-administrative-role[\s\S]*option value="vice"/);
  assert.doesNotMatch(index, /data-admin-vice-flow/);
  assert.doesNotMatch(index, /data-admin-vice-invitation-generate/);
  assert.doesNotMatch(app, /createViceInvitation/);
  assert.doesNotMatch(app, /handleViceInvitationGeneration/);
  assert.doesNotMatch(adminCenter, /export async function createViceInvitation/);
  assert.match(app, /revokeViceAdministratorAccess/);
  assert.doesNotMatch(index, /data-vice-auth-google/);
  assert.doesNotMatch(index, /data-vice-auth-email-form/);
  assert.match(app, /signInFriendlyViceAdministrator/);
  assert.match(app, /result\.administratorAuthorized === true/);
  const directViceAccess = app.match(
    /if \(result\.administratorAuthorized === true\) \{([\s\S]*?)\r?\n    \}\r?\n    \/\/ L'ingresso esplicito/
  )?.[1] || '';
  assert.match(directViceAccess, /state\.residentEntryKind = 'shared-admin'/);
  assert.match(directViceAccess, /applyResidentEntryView\(\)/);
  assert.match(directViceAccess, /refreshParticipant\('avvio', \{ loginHandshake: true \}\)/);
  assert.match(directViceAccess, /openResidentEntryGate\(\)/);
  assert.doesNotMatch(directViceAccess, /state\.mode = 'admin'/);
  assert.doesNotMatch(directViceAccess, /activateResidentAdministratorPanel\(\)/);
  assert.match(app, /if \(state\.adminRole && hasStrongAdministratorIdentity\(\)\)/);
  assert.match(participantData, /export async function signInFriendlyViceAdministrator/);
  assert.match(participantData, /withAdministratorTechnicalSession/);
  assert.match(participantData, /loadCenterContactSettings\(\{ forceRefresh: true \}\)/);
  assert.match(participantData, /const technicalEmails = \[\.\.\.new Set/);
  assert.match(firebaseClient, /technicalEmailOverride = ''/);
  assert.match(app, /authorizeResidentAdministratorSession/);
  assert.match(app, /elements\.residentAdminUnlock\.hidden = true/);
});

test('il responsabile invita amministratori e trasferisce la responsabilita con conferma forte', () => {
  assert.match(index, /data-admin-leadership/);
  assert.match(index, /admin\.access\.managementTitle/);
  assert.match(index, /admin\.invitations\.stepTitle/);
  assert.match(index, /admin\.succession\.stepTitle/);
  assert.doesNotMatch(index, /Prepara il passaggio/);
  assert.match(index, /data-admin-invitation-generate/);
  assert.doesNotMatch(index, /data-admin-vice-invitation-generate/);
  assert.match(index, /data-admin-successor-select/);
  assert.match(index, /data-admin-transfer-ownership/);
  assert.match(adminCenter, /export async function createAdministratorInvitation/);
  assert.doesNotMatch(adminCenter, /export async function createViceInvitation/);
  assert.match(adminCenter, /export async function transferCenterOwnership/);
  assert.match(adminCenter, /successorInvitation\.status !== 'USED'/);
  assert.match(adminCenter, /successorInvitation\.consumedBy !== normalizedSuccessorUid/);
  assert.match(adminCenter, /role: 'ADMIN'/);
  assert.match(adminCenter, /if \(invitation\.role !== 'ADMIN'\)/);
  assert.match(adminCenter, /const role = 'ADMIN';/);
  assert.match(adminCenter, /const massPermission = true;/);
  assert.match(adminCenter, /status: 'REVOKED'[\s\S]*massPermission: false[\s\S]*dailyOperationsPermission: false/);
  assert.doesNotMatch(adminCenter, /batch\.delete\(currentMembershipRef\)/);
  assert.match(app, /CAPABILITIES\.TRANSFER_OWNERSHIP/);
  assert.match(app, /requiredText: t\('dialog\.transferOwnership\.requiredText'\)/);
  assert.match(index, /data-admin-invitation-status/);
});

test('il registro essenziale viene caricato solo su richiesta e accompagna le scritture amministrative', () => {
  assert.match(index, /data-admin-audit-section/);
  assert.match(index, /data-admin-audit-load/);
  assert.match(app, /function handleAuditLoad/);
  assert.match(app, /handleAuditDialogOpen[\s\S]*listAuditEvents\(\{[\s\S]*maximum: 20/);
  assert.doesNotMatch(app, /Promise\.all\(\[[^\]]*listAuditEvents/s);
  assert.match(auditLog, /export function appendAuditEvent/);
  assert.match(auditLog, /export async function listAuditEvents/);
  assert.match(auditLog, /startAfter\(cursor\)/);
  assert.match(auditLog, /actorLabel[\s\S]*actorParticipantId/);
  assert.match(participantData, /AUDIT_ACTIONS\.UPSERT_PARTICIPANT/);
  assert.match(participantData, /AUDIT_ACTIONS\.DELETE_PARTICIPANT/);
  assert.match(adminCenter, /AUDIT_ACTIONS\.TRANSFER_OWNERSHIP/);
});

test('la riattivazione conserva i campi storici del profilo amministratore', () => {
  assert.match(
    adminCenter,
    /batch\.set\(profileRef,[\s\S]*?dailyOperationsPermission:\s*true,[\s\S]*?\},\s*\{\s*merge:\s*true\s*\}\);/
  );
});
