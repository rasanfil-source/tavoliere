import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readPublic = (name) => readFile(
  new URL(`../../prototypes/firebase-spark-pwa/public/${name}`, import.meta.url),
  'utf8'
);

const [app, participantData, index, serviceWorker, firebaseConfig, buildScript, firebaseCli, predeployGate] = await Promise.all([
  readPublic('app.js'),
  readPublic('participant-data.js'),
  readPublic('index.html'),
  readPublic('sw.js'),
  readFile(new URL('../../prototypes/firebase-spark-pwa/firebase.json', import.meta.url), 'utf8'),
  readFile(new URL('../../tools/build-public.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../../tools/firebase-cli.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../../tools/predeploy-gate.mjs', import.meta.url), 'utf8')
]);

test('i moduli di dominio vengono caricati in base alla vista', () => {
  for (const moduleName of [
    'admin-center.js',
    'bootstrap-demo.js',
    'daily-operations.js',
    'kitchen-data.js',
    'kitchen-notes.js',
    'participant-data.js'
  ]) {
    assert.doesNotMatch(app, new RegExp(`from ['"]\\./${moduleName.replace('.', '\\.')}[^'"]*['"]`));
    assert.match(app, new RegExp(moduleName.replace('.', '\\.')));
  }
  assert.match(app, /import\(domainModulePaths\[name\]\)/);
  assert.match(app, /if \(initialMode === 'kitchen'\)/);
  assert.match(app, /const hasStoredResidentIdentity = Boolean\(loadStoredResidentSignature\(\)\)/);
  assert.match(app, /initialMode === 'summary'[\s\S]*hasStoredResidentIdentity/);
  assert.doesNotMatch(app, /if \(initialMode === 'admin'\) \{\s*loadDomainModule\('audit'\)/);
  assert.match(serviceWorker, /const LAZY_MODULES = \[/);
});

test('la schermata iniziale avvia Auth prima delle lingue e riconcilia le impostazioni senza bloccare', () => {
  const bootstrap = app.match(/async function bootstrapApp\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(bootstrap, /window\.setTimeout\(hideStartupSplash, 8000\)/);
  assert.doesNotMatch(bootstrap, /settingsDeadline|Promise\.race\(\[settingsPromise/);
  assert.match(bootstrap, /state\.mode === 'kitchen'[\s\S]*Promise\.resolve\(null\)[\s\S]*loadCenterContactSettings\(\)\.catch/);
  assert.match(bootstrap, /const i18nPromise = initI18n/);
  assert.match(bootstrap, /initializeAuthPanel\(\);[\s\S]*const i18nPromise = initI18n[\s\S]*await i18nPromise/);
  assert.match(bootstrap, /void settingsPromise\.then\(async \(centerSettings\)/);
  assert.match(bootstrap, /renderMode\(\);[\s\S]*isPlainResidentLogin[\s\S]*hideStartupSplash\(\)/);
  assert.match(bootstrap, /const isPlainResidentLogin =[\s\S]*!loadStoredResidentSignature\(\)/);
  assert.match(bootstrap, /if \(!isPlainResidentLogin\) \{\s*refreshNow\('avvio'\)/);
});

test('la shell PWA e i CSS pesanti restano legati alla vista che li usa', () => {
  const appShell = serviceWorker.match(/const APP_SHELL = \[[\s\S]*?\n\];/)?.[0] || '';
  const lazy = serviceWorker.match(/const LAZY_MODULES = \[[\s\S]*?\n\];/)?.[0] || '';
  assert.doesNotMatch(appShell, /summary-matrix-view|summary-matrix-refinements|happyduck|launcher-512/);
  assert.match(lazy, /summary-matrix-view/);
  assert.match(lazy, /summary-matrix-refinements/);
  assert.match(index, /view !== 'summary' && view !== 'kitchen'/);
  assert.match(app, /function ensureSummaryStyles\(\)/);
  assert.match(app, /if \(targetMode === 'summary'\) await ensureSummaryStyles\(\)/);
  assert.match(app, /if \(nextMode === 'summary'\) await ensureSummaryStyles\(\)/);
  assert.match(index, /happyduck[^>]*[\s\S]*loading="lazy" decoding="async"/);
});

test('pannello, riepilogo e cucina condividono le richieste concorrenti', async () => {
  const [adminCenter, kitchenData, i18n] = await Promise.all([
    readPublic('admin-center.js'),
    readPublic('kitchen-data.js'),
    readPublic('i18n/i18n.mjs')
  ]);
  assert.match(app, /adminHydrationLoad\?\.key === hydrationKey/);
  assert.match(app, /adminResourcesForSection\(section\)/);
  assert.match(app, /loadSharedAdminResource/);
  assert.match(app, /if \(operationalLinksError\) adminLoadedResources\.delete\('links'\)/);
  assert.match(adminCenter, /loadCurrentAdminMembershipStatus/);
  assert.match(kitchenData, /mealTypesLoad\?\.centerId === centerId/);
  assert.match(kitchenData, /rulesLoad\?\.key === loadKey/);
  assert.match(participantData, /function shareStaticQuery/);
  assert.match(i18n, /const catalogLoads = new Map/);
  assert.match(i18n, /const fallbackPromise =[\s\S]*loadCatalog\(DEFAULT_LOCALE\)/);
});

test('i moduli condivisi hanno una sola identita URL durante il caricamento', async () => {
  const runtimeModules = await Promise.all([
    'app.js',
    'access-links.js',
    'admin-center.js',
    'audit-log.js',
    'bootstrap-demo.js',
    'calendar-configuration.js',
    'center-settings.js',
    'daily-operations.js',
    'kitchen-data.js',
    'kitchen-notes.js',
    'participant-data.js',
    'summary-matrix-view.js',
    'core/user-error.mjs',
    'domain/admin-overview.mjs'
  ].map(readPublic));
  for (const sharedModule of [
    'firebase-client.js',
    'center-context.js',
    'center-settings.js',
    'i18n.mjs',
    'role-policy.mjs',
    'user-error.mjs'
  ]) {
    const escaped = sharedModule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const urls = runtimeModules.flatMap((source) => (
      [...source.matchAll(new RegExp(`[^'\"]*${escaped}\\?v=([^'\"]+)`, 'g'))]
        .map((match) => match[0])
    ));
    assert.ok(urls.length > 0, sharedModule);
    assert.equal(new Set(urls.map((url) => url.split('?')[1])).size, 1, `${sharedModule}: ${urls.join(', ')}`);
  }
});

test('la pagina prepara in anticipo le connessioni Firebase principali', () => {
  assert.match(index, /rel="preconnect" href="https:\/\/www\.gstatic\.com"/);
  assert.match(index, /rel="preconnect" href="https:\/\/firestore\.googleapis\.com"/);
  assert.match(index, /rel="preconnect" href="https:\/\/identitytoolkit\.googleapis\.com"/);
  assert.match(index, /rel="modulepreload" href="https:\/\/www\.gstatic\.com\/firebasejs\/12\.17\.0\/firebase-app\.js"/);
  assert.match(index, /rel="modulepreload" href="https:\/\/www\.gstatic\.com\/firebasejs\/12\.17\.0\/firebase-auth\.js"/);
  assert.match(index, /rel="modulepreload" href="https:\/\/www\.gstatic\.com\/firebasejs\/12\.17\.0\/firebase-firestore\.js"/);
});

test('le selezioni dei pasti aggiornano solo i controlli interessati', () => {
  assert.match(app, /async function saveMealOptimistically/);
  assert.match(app, /function syncWeekMealButton/);
  assert.match(app, /function syncMonthMealButton/);
  assert.match(app, /function syncWeekGridFromState/);
  assert.match(app, /function syncMonthGridFromState/);

  const weekHandler = app.match(/async function handleMealButton[\s\S]*?\n}/)?.[0] || '';
  const monthHandler = app.match(/async function handleMonthMealButton[\s\S]*?\n}/)?.[0] || '';
  assert.match(weekHandler, /saveMealOptimistically/);
  assert.match(monthHandler, /saveMealOptimistically/);
  assert.doesNotMatch(weekHandler, /renderParticipantMeals/);
  assert.doesNotMatch(monthHandler, /renderParticipantMeals/);
});

test('le selezioni multiple mostrano subito il risultato e proteggono i pasti coinvolti', () => {
  assert.match(participantData, /export async function saveParticipantMonthSelection/);
  assert.match(app, /const saveParticipantMonthSelection = callDomain\('participant', 'saveParticipantMonthSelection'\)/);
  assert.match(app, /function beginOptimisticBulkSelection/);
  assert.match(app, /state\.pendingMealKeys\.add/);
  assert.match(app, /rollback\(\)/);
  assert.match(app, /finish\(\)/);

  for (const handlerName of [
    'handleDayBulkButton',
    'handleWeekBulkButton',
    'handleWeekMealBulkButton',
    'handleMonthBulkButton'
  ]) {
    const handler = app.match(new RegExp(`async function ${handlerName}[\\s\\S]*?\\n}`))?.[0] || '';
    assert.match(handler, /beginOptimisticBulkSelection/);
  }
});

test('i refresh dello stesso periodo riusano le griglie gia presenti', () => {
  assert.match(app, /elements\.participantMeals\.dataset\.renderKey === weekRenderKey/);
  assert.match(app, /elements\.monthGrid\.dataset\.renderKey === monthRenderKey/);
  const monthRenderer = app.match(/function renderMonthGrid\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(monthRenderer, /interfaceStyle: document\.documentElement\.dataset\.interfaceStyle/);
  assert.match(monthRenderer, /days: monthCells\.map\(\(day\) => \[[\s\S]*day\.date[\s\S]*meal\.mealTypeId/);
  assert.match(app, /elements\.adminPeopleList\.dataset\.renderKey === renderKey/);
  assert.match(app, /const daysByDate = new Map\(state\.participantWeek/);
  assert.match(app, /const daysByDate = new Map\(state\.participantMonth/);
});

test('i rendering dinamici conservano il focus di tastiera', () => {
  assert.match(app, /function captureFocusWithin\(container\)/);
  assert.match(app, /function restoreFocusWithin\(container, snapshot\)/);

  const peopleRenderer = app.match(/function renderAdminPeopleList\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(peopleRenderer, /captureFocusWithin\(elements\.adminPeopleList\)/);
  assert.match(peopleRenderer, /restoreFocusWithin\(elements\.adminPeopleList, focusSnapshot\)/);

  const monthRenderer = app.match(/function renderMonthGrid\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(monthRenderer, /captureFocusWithin\(elements\.monthGrid\)/);
  assert.match(monthRenderer, /restoreFocusWithin\(elements\.monthGrid, focusSnapshot\)/);
});

test('gli aggiornamenti restano adattivi e non aprono listener Firestore permanenti', () => {
  assert.doesNotMatch(app, /\bonSnapshot\b/);
  assert.doesNotMatch(participantData, /\bonSnapshot\b/);
  assert.match(app, /scheduleBackgroundRefresh/);
});

test('i selettori di riepilogo e cucina usano delega degli eventi', () => {
  assert.match(app, /elements\.summaryPanel\.addEventListener\('click', handleSummaryPanelClick\)/);
  assert.match(app, /elements\.kitchenPanel\.addEventListener\('click', handleKitchenPanelClick\)/);
});

test('le risposte tardive non sostituiscono una vista o una data piu recenti', () => {
  assert.match(app, /participantRequestVersion: 0/);
  assert.match(app, /function beginParticipantRequest\(\)/);
  assert.match(app, /function isCurrentParticipantRequest\(request\)/);
  assert.match(app, /isCurrentRequest: \(\) => isCurrentParticipantRequest\(request\)/);
  assert.match(app, /if \(!isCurrentParticipantRequest\(request\)\) return;/);
  assert.match(app, /weekOperationsRequestVersion: 0/);
  assert.match(app, /kitchenRequestVersion: 0/);
  assert.match(app, /kitchenDayOffset !== state\.kitchenDayOffset/);
});

test('l esportazione legge le collezioni in parallelo e usa pagine ampie', () => {
  assert.match(participantData, /Promise\.all\(collections\.map/);
  assert.match(participantData, /limit\(1000\)/);
  assert.match(participantData, /snapshot\.size < 1000/);
});

test('il deploy genera asset minificati in una cartella distinta dalle sorgenti', () => {
  assert.equal(JSON.parse(firebaseConfig).hosting.public, 'dist');
  assert.match(buildScript, /minify: true/);
  assert.match(buildScript, /cp\(sourceRoot, outputRoot/);
  assert.match(firebaseCli, /cliArguments\.includes\('deploy'\)/);
  assert.match(firebaseCli, /tools\/build-public\.mjs/);
});

test('il gate di rilascio rigenera sempre la build verificata', () => {
  assert.match(predeployGate, /public\/\*\*\/\*\.js/);
  assert.match(predeployGate, /public\/\*\*\/\*\.mjs/);
  assert.match(predeployGate, /tools\/\*\*\/\*\.mjs/);
  assert.match(predeployGate, /\['node', \['tools\/build-public\.mjs'\]\]/);
});
