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
const index = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url),
  'utf8'
);
const styles = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/styles.css', import.meta.url),
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

test('admin can create and fully edit participant profiles', () => {
  assert.match(index, /data-admin-new-participant/);
  assert.match(index, /data-admin-participant-name/);
  assert.match(index, /data-admin-participant-signature/);
  assert.match(index, /data-admin-participant-group/);
  assert.match(index, /data-admin-participant-diets/);
  assert.match(app, /populateDietSelect\(elements\.adminParticipantDiets, 'Nessuna dieta'\)/);
  assert.match(app, /populateDietSelect\(elements\.weekDietType, 'Nessuna dieta occasionale'\)/);
  assert.match(app, /adminParticipantDiets\.value = 'STANDARD'/);
  assert.match(app, /\.join\(', '\) \|\| 'STANDARD'/);
  assert.match(index, /data-admin-participant-diet-number/);
  assert.match(dietUtils, /value: 'CUSTOM', label: 'Altro numero\.\.\.'/);
  assert.match(dietUtils, /Inserisci un numero di dieta compreso tra 5 e 999/);
  assert.match(index, /data-admin-participant-vice/);
  assert.match(index, /data-admin-people-list/);
  assert.match(index, /data-admin-guest-preset[\s\S]*Ospite 1[\s\S]*Altro numero/);
  assert.match(app, /function renderAdminPeopleList/);
  assert.match(app, /signature: participant\.signature/);
  assert.match(app, /admin-person-signature[\s\S]*?signatureTitle/);
  assert.match(app, /data-admin-person-open/);
  assert.match(app, /function handleAdminAddGuest/);
  assert.match(app, /const signature = `OSP\$\{guestNumber\}`/);
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
  assert.match(index, /Prima della scadenza[\s\S]*aggiungere un altro anno/);
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
  assert.match(participantData, /createPersonalTokenForParticipant\(participant\.participantId\)/);
  assert.match(participantData, /createPersonalAnonymousSession\(participant\.participantId, token\)/);
  assert.match(participantData, /await signInAnonymousUser\(\)/);
  assert.match(participantData, /await ensurePersonalSession\(participantId, token\)/);
  assert.match(participantData, /ensureStoredResidentSession/);
  assert.doesNotMatch(participantData, /selectPublicParticipant/);
  assert.doesNotMatch(participantData, /localStorage\.setItem\([^,]+,\s*commonPassword/);
});

test('technical resident auth uses local Firebase persistence', () => {
  assert.match(firebaseClient, /browserLocalPersistence/);
  assert.match(firebaseClient, /signInWithEmailAndPassword/);
  assert.match(firebaseClient, /signInResidentTechnicalUser/);
});

test('friendly access is explicit and offers device exit', () => {
  assert.match(app, /get\('access'\) === 'friendly'/);
  assert.match(app, /\['participant', 'week'\]\.includes\(initialMode\)/);
  assert.match(app, /data-forget-device/);
  assert.match(app, /const showResidentExit = isOrdinaryView && !needsResidentLogin && hasResidentIdentity/);
  assert.match(app, /const showResidentLogin = needsResidentLogin[\s\S]*!isAdminView[\s\S]*!state\.platformOwner[\s\S]*!state\.adminRole[\s\S]*!authenticatedAdministrator/);
  assert.match(app, /elements\.residentLogin\.hidden = !showResidentLogin/);
  assert.match(app, /const showAdministratorAccess = isAdminView/);
  assert.match(app, /elements\.adminShell\.hidden = isKitchen \|\| !showAdministratorAccess/);
  assert.match(app, /elements\.ownerExitButton\.hidden = !state\.platformOwner/);
  assert.match(app, /elements\.accountFooter\.hidden = elements\.adminShell\.hidden[\s\S]*elements\.ownerExitButton\.hidden/);
  assert.match(styles, /\.account-footer \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /\.footer-exit-button \{[\s\S]*?width: 100%/);
  assert.match(index, /class="primary-action footer-exit-button" data-forget-device/);
  assert.match(styles, /\.auth-actions-signed-in \{[\s\S]*?order: 100/);
  assert.match(index, /data-resident-login-form/);
  assert.match(index, /data-resident-signature-input/);
  assert.match(index, /data-resident-password-input/);
  assert.match(index, /data-admin-entry-link[^>]+href="\/\?view=admin"/);
  assert.match(index, /data-agenda-admin-entry[^>]+href="\/\?view=admin"/);
});

test('l invito resta accessibile da disconnessi e gli amministratori non vedono l accesso residenti', () => {
  assert.match(app, /elements\.adminShell\.open = state\.mode === 'admin'/);
  assert.match(app, /const shouldShowLogin = showLogin[\s\S]*state\.mode !== 'admin'[\s\S]*!state\.adminRole[\s\S]*!authenticatedAdministrator/);
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
  assert.match(app, /requiredText: 'ELIMINA'/);
  assert.match(app, /function showActionDialog/);
  assert.match(app, /effect === 'ABSENT'[\s\S]*title: 'Svuota selezione'/);
  assert.doesNotMatch(app, /window\.(?:alert|confirm|prompt)/);
  const exportHandler = app.match(/async function handleAdminExport\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.doesNotMatch(exportHandler, /window\.confirm/);
});

test('meal pages show a fixed title and the authenticated name in the status row', () => {
  assert.match(app, /const mealTitle = 'Prenotazione Pasti'/);
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

test('gli aggiornamenti concorrenti vengono serializzati e accodati', () => {
  assert.match(app, /if \(state\.refreshInFlight\)/);
  assert.match(app, /state\.pendingRefreshSource/);
  assert.match(app, /await performRefresh\(source\)/);
});

test('un aggiornamento fallito conserva i dati partecipante già visibili', () => {
  const refresh = app.match(/async function refreshParticipant\(source\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(refresh, /const hadVisibleData/);
  assert.match(refresh, /if \(hadVisibleData\) \{[\s\S]*renderParticipantMeals\(\)/);
  assert.match(refresh, /formatPreviousDataMessage/);
});

test('la vista settimana usa una matrice con intestazioni pasto e comandi compatti', () => {
  const weekHandler = app.match(/async function handleWeekBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  const weekMealHandler = app.match(/async function handleWeekMealBulkButton\(button\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(app, /class="week-matrix\$\{showMassColumn \? ' week-matrix-with-mass' : ''\}"/);
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
  assert.match(styles, /\.month-day > \.month-day-number-today \{[\s\S]*?background: transparent/);
  assert.match(styles, /\.month-week-mobile-header \.month-day-number-today \{[\s\S]*?height: 27px;[\s\S]*?border-bottom: 0;[\s\S]*?background: var\(--today-surface\)/);
  assert.match(styles, /\.month-day-today \{[\s\S]*?border-top: 0;[\s\S]*?background: var\(--today-surface\)/);
  assert.match(app, /renderMonthDayNumber\(day, 'month-day-number-inline'\)/);
  assert.match(styles, /\.month-day-number-inline,[\s\S]*?display: none !important/);
  assert.match(styles, /\.month-week-action-row\.month-week-complete \{[\s\S]*?box-shadow: none/);
  assert.match(styles, /\.month-day-today \{[\s\S]*?box-shadow: none/);
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

test('una sessione residente non viene presentata come accesso amministratore', () => {
  assert.match(app, /user\.isAnonymous \|\| isResidentTechnicalEmail\(user\.email\)/);
  assert.match(app, /elements\.authStatus\.textContent = 'Accesso amministratore'/);
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
  assert.match(adminCenter, /await saveAdminProfile\(user, requestedCenterId, existingAccess\.role\)/);
  assert.match(adminCenter, /currentProfileSnapshot\.data\(\)\?\.centerId === centerId/);
  assert.match(adminCenter, /successorProfileSnapshot\.data\(\)\?\.centerId === centerId/);
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

test('sessioni e refresh ravvicinati evitano round trip duplicati senza anticipare le letture protette', () => {
  assert.match(participantData, /const SESSION_RECHECK_MS = 5 \* 60 \* 1000/);
  assert.match(participantData, /if \(canReuseCurrentSession\(user, 'PUBLIC'\)\)/);
  assert.match(app, /function scheduleBackgroundRefresh\(source\)/);
  assert.match(app, /window\.clearTimeout\(state\.backgroundRefreshTimerId\)/);
  assert.match(app, /sessionPromise = ensurePublicDemoSession\(\)/);
  assert.match(app, /const \[, centerSettings\] = await Promise\.all\(\[sessionPromise, settingsPromise\]\)/);
  assert.match(app, /const sessionPromise = ensureKitchenDemoSession\(\)/);
  assert.match(centerSettings, /refreshCenterContactSettings\(\)\.catch\(\(\) => undefined\);\s*}\s*return centerContactSettingsCache\.value/);
});

test('mese e settimana condividono la domenica come primo giorno', () => {
  assert.match(app, /result\.setDate\(result\.getDate\(\) - result\.getDay\(\)\)/);
  assert.match(app, /gridStart\.setDate\(firstDay\.getDate\(\) - firstDay\.getDay\(\)\)/);
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
  assert.match(index, /summary-date-tabs[\s\S]*Prenotazioni/);
  assert.match(styles, /\.summary-status-row > p \{[\s\S]*?justify-self: end;[\s\S]*?text-align: right;/);
  assert.match(styles, /\.kitchen-status-row > p \{[\s\S]*?justify-self: end;[\s\S]*?text-align: right;/);
  assert.match(app, /elements\.refreshButtons\.forEach/);
  assert.match(app, /loadCachedCenterAvatar\(\)/);
  assert.match(app, /renderCenterAvatar\(isParticipant \|\| isWeek \|\| isSummary \|\| isKitchen, centerName\)/);
  assert.match(app, /!state\.adminCenterDirty && !state\.pendingCenterAvatarDataUrl/);
  assert.match(app, /const \[, centerSettings\] = await Promise\.all\(\[sessionPromise, settingsPromise\]\)[\s\S]*?renderMode\(\);[\s\S]*?loadKitchenCounts/);
  assert.match(centerSettings, /CENTER_AVATAR_STORAGE_KEY/);
  assert.match(centerSettings, /cached\?\.version === avatarVersion/);
  assert.match(app, /admin\.avatar\.readyNeedsPassword/);
  assert.match(app, /state\.pendingCenterAvatarDataUrl && state\.centerContactSettings\.commonPasswordSet/);
  assert.match(app, /elements\.adminCenterAvatarSave\.disabled = !state\.pendingCenterAvatarDataUrl \|\| !commonPasswordSet/);
  assert.match(centerSettings, /export async function saveCenterAvatar/);
  assert.doesNotMatch(participantData.match(/export async function forgetResidentDevice\(\)[\s\S]*?\n\}/)?.[0] || '', /CENTER_AVATAR/);
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
  assert.match(styles, /@media \(min-width: 900px\)[\s\S]*?body\[data-mode="admin"\] \.admin-shell\s*\{[\s\S]*?width: min\(100%, 820px\);[\s\S]*?margin-inline: auto;/);
  assert.match(styles, /body\[data-mode="admin"\] \.admin-section-nav\s*\{[\s\S]*?flex-wrap: nowrap;[\s\S]*?justify-content: center;/);
  assert.match(styles, /\.admin-panel > \.admin-overview-content,[\s\S]*?\.admin-panel > \.admin-dashboard-grid\s*\{[\s\S]*?max-width: 720px;[\s\S]*?margin-inline: auto;/);
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

test('il responsabile salvato viene collegato alla Persona senza una nuova casella ruolo', () => {
  assert.match(app, /await linkCurrentAdministratorParticipant\(administratorParticipantId\)/);
  assert.match(adminCenter, /export async function linkCurrentAdministratorParticipant/);
  assert.match(adminCenter, /batch\.update\(doc\(db, 'centers', centerId, 'admins', user\.uid\)/);
  assert.doesNotMatch(index, /data-admin-participant-admin/);
});

test('il pannello amministratore distingue sospensione ed eliminazione definitiva', () => {
  assert.match(app, /data-admin-person-toggle-active/);
  assert.match(index, /data-admin-delete-participant[^>]*hidden>Elimina persona/);
  assert.match(app, /handleAdminDeleteParticipant/);
  assert.match(app, /title: 'Elimina definitivamente la persona'[\s\S]*requiredText: 'ELIMINA'/);
});

test('la condivisione contatti appartiene alla configurazione del centro', () => {
  const settingsStart = index.indexOf('id="admin-configuration-section"');
  const settingsEnd = index.indexOf('id="admin-access-section"', settingsStart);
  const personStart = index.indexOf('id="admin-person-editor"');
  const personEnd = index.indexOf('class="admin-people-overview', personStart);
  const settingsSection = index.slice(settingsStart, settingsEnd);
  const personSection = index.slice(personStart, personEnd);
  assert.match(settingsSection, /data-admin-contact-sharing-select/);
  assert.doesNotMatch(personSection, /data-admin-contact-sharing-select/);
  assert.match(app, /participantContactSharingEnabled: elements\.adminContactSharingSelect/);
  assert.match(app, /administratorName: state\.centerContactSettings\.administratorName/);
  assert.match(centerSettings, /participantContactSharingEnabled: Boolean\(participantContactSharingEnabled\)/);
  assert.match(calendarConfiguration, /participantContactSharingEnabled: target\.participantContactSharingEnabled/);
  assert.doesNotMatch(app, /saveRequests\.push\(updateCenterContactSettings/);
});

test('la scheda persona e il solo punto di modifica anagrafica', () => {
  assert.match(app, /data-admin-person-open/);
  assert.doesNotMatch(app, /data-admin-person-save/);
  assert.doesNotMatch(app, /data-admin-person-delete aria-label/);
  assert.match(index, /Scegli una persona per modificarne la scheda/);
});

test('la messa si programma nella vista settimana per i ruoli autorizzati', () => {
  assert.match(index, /data-admin-participant-liturgy/);
  assert.doesNotMatch(index, /data-admin-mass-week-grid/);
  assert.doesNotMatch(index, /data-admin-mass-week-prev/);
  assert.doesNotMatch(index, /data-admin-mass-week-next/);
  assert.match(app, /loadDailyOperations/);
  assert.match(app, /week-matrix-with-mass/);
  assert.match(app, /week-mass-heading/);
  assert.match(app, /week-mass-mobile-icon[^>]*aria-hidden="true">⛪<\/span>/);
  assert.match(app, /week-heading-label">Messa<\/span>/);
  assert.doesNotMatch(app, /week-heading-icon[^>]*aria-hidden="true">M<\/span>/);
  assert.match(app, /data-week-mass-bulk/);
  assert.match(app, /handleWeekMassBulkButton/);
  assert.match(app, /saveMassStatuses/);
  assert.match(app, /openDays\.map\(\(day\) => parseDateId\(day\.date\)\)/);
  assert.match(app, /data-week-mass-date/);
  assert.match(app, /getMealCutoffDate\([\s\S]*'dinner'/);
  assert.match(app, /week-mass-button-locked/);
  assert.doesNotMatch(styles, /\.week-mass-mobile-icon\s*\{[\s\S]*?display:\s*none/);
  assert.match(app, /state\.adminCanManageMass[\s\S]*hasCurrentCapability\(CAPABILITIES\.MANAGE_MASS/);
  assert.match(app, /state\.adminCanManageMass = isAdmin && hasCurrentCapability\(CAPABILITIES\.MANAGE_MASS\)/);
  assert.match(app, /restoreResidentIdentityForAuthorizedAdministrator/);
  assert.match(app, /state\.weekDailyOperations\.push\(\{ dateId, massScheduled \}\)/);
  assert.match(app, /state\.weekDailyOperations = state\.weekDailyOperations\.filter/);
  assert.doesNotMatch(app, /data-week-mass-(?:row|effect)/);
  assert.match(participantProfile, /liturgicalRole: profile\.liturgicalRole === true/);
  assert.match(adminCenter, /canManageMass: hasCapability\(role, CAPABILITIES\.MANAGE_MASS/);
  assert.match(adminCenter, /canManageDailyOperations: hasCapability\(role, CAPABILITIES\.MANAGE_DAILY_OPERATIONS\)/);
  assert.match(participantProfile, /viceAdminRole: profile\.viceAdminRole === true/);
  assert.match(participantData, /export async function listCenterAdministrators/);
  assert.match(app, /selectedParticipantIsCenterAdministrator\(\)/);
  assert.match(app, /listPublicParticipants\(\{/);
  assert.match(app, /viceAdminRole: options\.viceAdminRole === true/);
});

test('la gestione quotidiana resta nella vista settimana e alimenta riepilogo e cucina', () => {
  assert.match(index, /data-week-operations/);
  assert.match(index, /data-week-health-list/);
  assert.match(index, /data-week-health-save/);
  assert.match(index, /data-week-diet-participant/);
  assert.match(index, /data-week-diet-duration/);
  assert.match(index, /data-week-kitchen-note-input/);
  assert.doesNotMatch(index, /data-admin-health-day/);
  assert.doesNotMatch(index, /data-admin-kitchen-note-day/);
  assert.match(index, /data-kitchen-sick/);
  assert.match(app, /loadDailyHealth/);
  assert.match(app, /saveSickPeople/);
  assert.match(app, /saveDietAssignments/);
  assert.match(app, /function applyDailyDietsToSummary/);
  assert.match(app, /function applyDailyDietsToKitchenMeals/);
  assert.match(app, /function renderSickCard/);
  assert.match(app, /function renderKitchenSickPeople/);
  assert.match(app, /state\.mode === 'week' && canManageDailyOperations\(\) && !state\.adminRole/);
});

test('la spunta vice amministratore sblocca la gestione quotidiana senza percorsi separati', () => {
  assert.match(index, /data-admin-participant-vice/);
  assert.doesNotMatch(index, /data-admin-vice-flow/);
  assert.doesNotMatch(app, /createViceAdministratorInvitation/);
});

test('il responsabile invita amministratori e trasferisce la responsabilita con conferma forte', () => {
  assert.match(index, /data-admin-leadership/);
  assert.match(index, /data-admin-invitation-generate/);
  assert.match(index, /data-admin-successor-select/);
  assert.match(index, /data-admin-transfer-ownership/);
  assert.match(adminCenter, /export async function createAdministratorInvitation/);
  assert.match(adminCenter, /export async function transferCenterOwnership/);
  assert.match(adminCenter, /role: 'ADMIN'/);
  assert.match(app, /CAPABILITIES\.TRANSFER_OWNERSHIP/);
  assert.match(app, /requiredText: 'TRASFERISCI'/);
  assert.match(index, /data-admin-invitation-status/);
});

test('il registro essenziale viene caricato solo su richiesta e accompagna le scritture amministrative', () => {
  assert.match(index, /data-admin-audit-section/);
  assert.match(index, /data-admin-audit-load/);
  assert.match(app, /function handleAuditLoad/);
  assert.match(app, /listAuditEvents\(20\)/);
  assert.doesNotMatch(app, /Promise\.all\(\[[^\]]*listAuditEvents/s);
  assert.match(auditLog, /export function appendAuditEvent/);
  assert.match(auditLog, /export async function listAuditEvents/);
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
