import {
  doc,
  getDoc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser } from './firebase-client.js?v=20261014b';
import { measureStartupStep } from './core/startup-timing.mjs?v=20261014b';
import { getActiveCenterId, getCenterScopedStorageKey } from './center-context.js?v=20261014b';
import { normalizeReservationCutoffs } from './schedule-utils.mjs?v=20261014b';
import { normalizeKitchenDietLegend } from './diet-legend.mjs?v=20261014b';

export const CENTER_AVATAR_STORAGE_KEY = 'tavolaComune.centerAvatar';
export const DEFAULT_VIEW_CACHE_KEY = 'tavolaComune.defaultViewCache';
export const CENTER_PRESENTATION_CACHE_KEY = 'tavolaComune.centerPresentation';
export const DEFAULT_APP_DISPLAY_NAME = 'Oggi a tavola';
export const DEFAULT_APP_DISPLAY_SUBTITLE = 'Per prenotarsi sempre in tempo!';
export const DEFAULT_OPENING_VIEW = 'week';
const ALLOWED_VIEW_VALUES = new Set(['month', 'week']);
const ALLOWED_SUMMARY_LAYOUT_VALUES = new Set(['classic', 'international', 'future']);
const ALLOWED_KITCHEN_LAYOUT_VALUES = new Set(['classic', 'international']);
const ALLOWED_MONTH_CONTROLS_SIDE_VALUES = new Set(['right', 'left']);
const ALLOWED_RESIDENT_LABEL_VALUES = new Set(['name', 'signature', 'initials']);
const CENTER_SETTINGS_CACHE_MS = 60 * 1000;
const CENTER_AVATAR_MAX_LENGTH = 300000;
const ALLOWED_THEME_PALETTES = new Set([
  'smeraldo',
  'terracotta',
  'confetto',
  'salvia',
  'oliva',
  'inchiostro',
  'neutro'
]);
const ALLOWED_INTERFACE_STYLES = new Set(['original', 'cool', 'urban-plus', 'future']);
let centerContactSettingsCache = null;
let centerContactSettingsLoad = null;
let centerContactSettingsLoadCenterId = '';
let centerContactSettingsRevision = 0;
let calendarSettingsLoad = null;
let calendarSettingsCache = null;

// Date e orari limite richiedono soltanto il documento centro. Presentazione, dati del partecipante e icona si caricano dopo i pasti.
export async function loadCenterCalendarSettings({ forceRefresh = false } = {}) {
  const centerId = getActiveCenterId();
  const revision = centerContactSettingsRevision;
  if (!forceRefresh && calendarSettingsCache?.centerId === centerId
      && Date.now() - calendarSettingsCache.cachedAt < CENTER_SETTINGS_CACHE_MS) {
    return calendarSettingsCache.value;
  }
  if (calendarSettingsLoad?.centerId === centerId && calendarSettingsLoad.revision === revision) {
    return calendarSettingsLoad.promise;
  }
  const pending = { centerId, revision };
  pending.promise = measureStartupStep('calendar-settings', async () => {
    const snapshot = await getDocFromServer(doc(db, 'centers', centerId));
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
      const error = new Error('Impostazioni in attesa di conferma');
      error.code = 'unavailable';
      throw error;
    }
    const data = snapshot.exists() ? snapshot.data() : {};
    const value = {
      timezone: typeof data.timezone === 'string' ? data.timezone : 'Europe/Rome',
      reservationCutoffs: normalizeReservationCutoffs(data.reservationCutoffs),
      adminPasswordVersion: Number(data.adminPasswordVersion || 0)
    };
    if (centerId === getActiveCenterId() && revision !== centerContactSettingsRevision) {
      if (calendarSettingsLoad === pending) calendarSettingsLoad = null;
      return loadCenterCalendarSettings({ forceRefresh: true });
    }
    if (getActiveCenterId() === centerId && revision === centerContactSettingsRevision) {
      calendarSettingsCache = { centerId, value, snapshot, cachedAt: Date.now() };
    }
    return value;
  }).finally(() => {
    if (calendarSettingsLoad === pending) calendarSettingsLoad = null;
  });
  calendarSettingsLoad = pending;
  return pending.promise;
}

export function loadCachedCenterContactSettings() {
  try {
    const raw = window.localStorage.getItem(getCenterScopedStorageKey(CENTER_PRESENTATION_CACHE_KEY));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || typeof cached !== 'object') return null;
    return {
      name: normalizeCenterName(cached.name),
      appDisplayName: normalizeAppDisplayName(cached.appDisplayName),
      appDisplaySubtitle: normalizeAppDisplaySubtitle(cached.appDisplaySubtitle),
      startupPresentationEnabled: cached.startupPresentationEnabled === true,
      timezone: typeof cached.timezone === 'string' ? cached.timezone : 'Europe/Rome',
      reservationCutoffs: normalizeReservationCutoffs(cached.reservationCutoffs),
      participantContactSharingEnabled: cached.participantContactSharingEnabled !== false,
      kitchenDietLegend: normalizeKitchenDietLegend(cached.kitchenDietLegend),
      themePalette: normalizeThemePalette(cached.themePalette),
      interfaceStyle: normalizeInterfaceStyle(cached.interfaceStyle),
      defaultView: ALLOWED_VIEW_VALUES.has(cached.defaultView) ? cached.defaultView : DEFAULT_OPENING_VIEW,
      summaryLayout: normalizeLayout(cached.summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
      kitchenLayout: normalizeLayout(cached.kitchenLayout, 'classic', ALLOWED_KITCHEN_LAYOUT_VALUES),
      monthControlsSide: normalizeLayout(cached.monthControlsSide, 'right', ALLOWED_MONTH_CONTROLS_SIDE_VALUES),
      summaryResidentLabel: normalizeResidentLabel(cached.summaryResidentLabel, 'name'),
      language: normalizeCenterLanguage(cached.language),
      administratorName: typeof cached.administratorName === 'string' ? cached.administratorName.trim() : '',
      administratorSignature: typeof cached.administratorSignature === 'string' ? cached.administratorSignature.trim() : '',
      administratorParticipantId: typeof cached.administratorParticipantId === 'string' ? cached.administratorParticipantId.trim() : '',
      adminEmail: typeof cached.adminEmail === 'string' ? cached.adminEmail.trim() : '',
      administratorProfileRequired: cached.administratorProfileRequired === true,
      administratorProfileComplete: cached.administratorProfileComplete !== false,
      administratorPasswordRequired: cached.administratorPasswordRequired === true,
      commonPasswordSet: cached.commonPasswordSet === true,
      adminSharedPasswordSet: cached.adminSharedPasswordSet === true,
      adminPasswordVersion: Number(cached.adminPasswordVersion || 0),
      adminTechnicalEmail: typeof cached.adminTechnicalEmail === 'string' ? cached.adminTechnicalEmail : '',
      adminTechnicalUid: typeof cached.adminTechnicalUid === 'string' ? cached.adminTechnicalUid : '',
      adminPasswordRotationRequired: cached.adminPasswordRotationRequired === true,
      participantDataVersion: typeof cached.participantDataVersion === 'string' ? cached.participantDataVersion : '0',
      avatarVersion: typeof cached.avatarVersion === 'string' ? cached.avatarVersion : '',
      avatarDataUrl: loadCachedCenterAvatar()
    };
  } catch {
    return null;
  }
}

function storeCachedCenterContactSettings(value) {
  try {
    const cached = { ...value };
    delete cached.avatarDataUrl;
    window.localStorage.setItem(
      getCenterScopedStorageKey(CENTER_PRESENTATION_CACHE_KEY),
      JSON.stringify(cached)
    );
  } catch {
    // La cache accelera soltanto il primo disegno e non condiziona i dati autorevoli.
  }
}

export function loadCachedCenterAvatar() {
  return readCenterAvatarCache()?.dataUrl || '';
}

export function loadCachedDefaultView() {
  try {
    const raw = window.localStorage.getItem(getCenterScopedStorageKey(DEFAULT_VIEW_CACHE_KEY));
    return ALLOWED_VIEW_VALUES.has(raw) ? raw : DEFAULT_OPENING_VIEW;
  } catch {
    return DEFAULT_OPENING_VIEW;
  }
}

export function cacheDefaultView(value) {
  const normalized = ALLOWED_VIEW_VALUES.has(value) ? value : DEFAULT_OPENING_VIEW;
  try {
    window.localStorage.setItem(getCenterScopedStorageKey(DEFAULT_VIEW_CACHE_KEY), normalized);
  } catch {
    // La cache locale evita solo lo sfarfallio al primo render; non è indispensabile.
  }
}

export function invalidateCenterContactSettingsCache() {
  centerContactSettingsRevision += 1;
  centerContactSettingsCache = null;
  // Il salvataggio invalida la promessa di lettura condivisa; la revisione controlla anche il completamento delle richieste pendenti.
  centerContactSettingsLoad = null;
  calendarSettingsLoad = null;
  calendarSettingsCache = null;
}

export async function synchronizeCenterOwnerEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      || normalizedEmail.length > 254) {
    throw new Error('Indirizzo email del responsabile non valido');
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'centers', getActiveCenterId()), {
    adminEmail: normalizedEmail,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await commitWithRetry(() => batch.commit());

  const cached = loadCachedCenterContactSettings();
  if (cached) {
    storeCachedCenterContactSettings({ ...cached, adminEmail: normalizedEmail });
  }
  if (centerContactSettingsCache) {
    centerContactSettingsCache = {
      ...centerContactSettingsCache,
      value: { ...centerContactSettingsCache.value, adminEmail: normalizedEmail },
      cachedAt: Date.now()
    };
  }
  return normalizedEmail;
}

export async function loadCenterContactSettings({ forceRefresh = false } = {}) {
  if (!forceRefresh && centerContactSettingsCache?.centerId === getActiveCenterId()) {
    if (Date.now() - centerContactSettingsCache.cachedAt >= CENTER_SETTINGS_CACHE_MS) {
      refreshCenterContactSettings().catch(() => undefined);
    }
    return centerContactSettingsCache.value;
  }
  return measureStartupStep('center-settings', refreshCenterContactSettings);
}

export async function updateKitchenLayout(layout) {
  if (!ALLOWED_KITCHEN_LAYOUT_VALUES.has(layout)) throw new Error('Layout cucina non valido');
  const centerId = getActiveCenterId();
  const ref = doc(db, 'centers', centerId, 'presentationSettings', 'current');
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      transaction.update(ref, { kitchenLayout: layout, updatedAt: serverTimestamp() });
    } else {
      const center = await transaction.get(doc(db, 'centers', centerId));
      const data = center.exists() ? center.data() : {};
      transaction.set(ref, {
        centerId, kitchenLayout: layout,
        participantContactSharingEnabled: data.participantContactSharingEnabled !== false,
        themePalette: normalizeThemePalette(data.themePalette),
        interfaceStyle: normalizeInterfaceStyle(data.interfaceStyle),
        defaultView: ALLOWED_VIEW_VALUES.has(data.defaultView) ? data.defaultView : DEFAULT_OPENING_VIEW,
        summaryLayout: normalizeLayout(data.summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
        monthControlsSide: normalizeLayout(data.monthControlsSide, 'right', ALLOWED_MONTH_CONTROLS_SIDE_VALUES),
        summaryResidentLabel: normalizeResidentLabel(data.summaryResidentLabel, 'name'),
        language: normalizeCenterLanguage(data.language), updatedAt: serverTimestamp()
      });
    }
  });
  if (centerId === getActiveCenterId()) {
    storeCachedCenterContactSettings({ ...(loadCachedCenterContactSettings() || {}), kitchenLayout: layout });
  }
  invalidateCenterContactSettingsCache();
  return layout;
}

export async function updateCenterSettings({
  name,
  appDisplayName,
  appDisplaySubtitle,
  startupPresentationEnabled,
  timezone,
  reservationCutoffs,
  participantContactSharingEnabled,
  themePalette,
  interfaceStyle,
  defaultView,
  summaryLayout,
  kitchenLayout,
  monthControlsSide,
  summaryResidentLabel,
  language,
  commonPassword,
  administratorSharedPassword,
  currentAdministratorSharedPassword,
  administratorName,
  administratorSignature,
  adminEmail,
  administratorSave,
  preserveAdministratorProfile = false,
  adaptationsOnly = false,
  onProgress
}) {
  const normalizedName = String(name || '').trim();
  const allowedTimezones = ['Europe/Rome', 'Europe/Madrid', 'Europe/Paris', 'Europe/London'];
  if (!normalizedName || normalizedName.length > 120) {
    throw new Error('Inserisci un nome centro valido');
  }
  if (!allowedTimezones.includes(timezone)) {
    throw new Error('Fuso orario non valido');
  }
  const normalizedAdministratorName = String(administratorName || '').trim();
  const normalizedAdministratorSignature = String(administratorSignature || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
  const normalizedAdministratorEmail = String(adminEmail || '').trim().toLowerCase();
  if (!preserveAdministratorProfile && (!normalizedAdministratorName || normalizedAdministratorName.length > 120)) {
    throw new Error('Inserisci il nome del responsabile');
  }
  if (!preserveAdministratorProfile && !/^[A-Z0-9]{2,12}$/.test(normalizedAdministratorSignature)) {
    throw new Error('La sigla deve contenere da 2 a 12 lettere o numeri');
  }
  if (!preserveAdministratorProfile && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedAdministratorEmail)
      || normalizedAdministratorEmail.length > 254)) {
    throw new Error('Inserisci un indirizzo email valido');
  }
  // Password comune: campo vuoto = mantieni esistente; non vuoto = sostituisci.
  const trimmedPassword = typeof commonPassword === 'string' ? commonPassword.trim() : '';
  if (trimmedPassword !== '' && (trimmedPassword.length < 4 || trimmedPassword.length > 32)) {
    throw new Error('La password comune deve avere tra 4 e 32 caratteri');
  }
  const trimmedAdministratorSharedPassword = typeof administratorSharedPassword === 'string'
    ? administratorSharedPassword.trim()
    : '';
  if (trimmedAdministratorSharedPassword !== ''
      && (trimmedAdministratorSharedPassword.length < 6
        || trimmedAdministratorSharedPassword.length > 64)) {
    throw new Error('La password amministratori deve avere tra 6 e 64 caratteri');
  }
  const normalizedCutoffs = normalizeReservationCutoffs(reservationCutoffs);
  const { saveCenterConfiguration } = await import('./calendar-configuration.js?v=20261014b');
  const settings = await saveCenterConfiguration({
    name: normalizedName,
    ...(appDisplayName === undefined
      ? {}
      : { appDisplayName: normalizeAppDisplayName(appDisplayName) }),
    ...(appDisplaySubtitle === undefined
      ? {}
      : { appDisplaySubtitle: normalizeAppDisplaySubtitle(appDisplaySubtitle) }),
    ...(startupPresentationEnabled === undefined
      ? {}
      : { startupPresentationEnabled: startupPresentationEnabled === true }),
    timezone,
    reservationCutoffs: normalizedCutoffs,
    participantContactSharingEnabled: Boolean(participantContactSharingEnabled),
    themePalette: themePalette === undefined ? undefined : normalizeThemePalette(themePalette),
    interfaceStyle: interfaceStyle === undefined ? undefined : normalizeInterfaceStyle(interfaceStyle),
    defaultView: defaultView === undefined ? undefined : (ALLOWED_VIEW_VALUES.has(defaultView) ? defaultView : DEFAULT_OPENING_VIEW),
    summaryLayout: summaryLayout === undefined ? undefined : normalizeLayout(summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
    kitchenLayout: kitchenLayout === undefined ? undefined : normalizeLayout(kitchenLayout, 'classic', ALLOWED_KITCHEN_LAYOUT_VALUES),
    monthControlsSide: monthControlsSide === undefined ? undefined : normalizeLayout(monthControlsSide, 'right', ALLOWED_MONTH_CONTROLS_SIDE_VALUES),
    summaryResidentLabel: summaryResidentLabel === undefined ? undefined : normalizeResidentLabel(summaryResidentLabel, 'name'),
    language: typeof language === 'string' && language.trim() ? language : undefined,
    commonPassword: trimmedPassword || null,
    administratorSharedPassword: trimmedAdministratorSharedPassword,
    currentAdministratorSharedPassword: typeof currentAdministratorSharedPassword === 'string'
      ? currentAdministratorSharedPassword
      : '',
    administratorName: normalizedAdministratorName,
    administratorSignature: normalizedAdministratorSignature,
    adminEmail: normalizedAdministratorEmail,
    administratorSave,
    preserveAdministratorProfile,
    adaptationsOnly: adaptationsOnly === true,
    onProgress
  });
  invalidateCenterContactSettingsCache();
  cacheDefaultView(settings.defaultView);
  storeCachedCenterContactSettings({
    ...(loadCachedCenterContactSettings() || {}),
    ...settings
  });
  return settings;
}

export async function restoreCenterConfiguration(backup) {
  const user = getCurrentUser();
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso del responsabile richiesto');
  }
  const centerId = getActiveCenterId();
  const membershipSnapshot = await getDoc(doc(db, 'centers', centerId, 'admins', user.uid));
  const membership = membershipSnapshot.exists() ? membershipSnapshot.data() : {};
  if (membership.status !== 'ACTIVE' || membership.role !== 'OWNER') {
    throw new Error('Solo il responsabile può ripristinare la configurazione');
  }

  const { buildCenterConfigurationRestore } = await import('./domain/center-restore.mjs?v=20261014b');
  const restore = buildCenterConfigurationRestore(backup, { expectedCenterId: centerId });
  const current = await loadCenterContactSettings({ forceRefresh: true });
  await updateCenterSettings({
    ...current,
    ...restore.settings,
    preserveAdministratorProfile: true,
    commonPassword: '',
    administratorSharedPassword: '',
    currentAdministratorSharedPassword: '',
    administratorName: current.administratorName,
    administratorSignature: current.administratorSignature,
    adminEmail: current.adminEmail
  });

  if (restore.kitchenDietLegend !== null) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'centers', centerId), {
      kitchenDietLegend: normalizeKitchenDietLegend(restore.kitchenDietLegend),
      updatedAt: serverTimestamp()
    }, { merge: true });
    await batch.commit();
  }
  if (restore.avatarDataUrl) {
    await saveCenterAvatar(restore.avatarDataUrl);
  }

  invalidateCenterContactSettingsCache();
  return {
    inspection: restore.inspection,
    settings: await loadCenterContactSettings({ forceRefresh: true })
  };
}

export async function saveCenterAvatar(dataUrl) {
  if (!isValidCenterAvatarDataUrl(dataUrl)) {
    throw new Error('L\'immagine scelta non è valida o è troppo grande');
  }
  const centerId = getActiveCenterId();
  const version = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  const batch = writeBatch(db);
  batch.set(doc(db, 'centers', centerId, 'assets', 'avatar'), {
    centerId,
    dataUrl,
    version,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, 'centers', centerId), {
    avatarVersion: version,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await commitWithRetry(() => batch.commit());
  storeCenterAvatarCache(version, dataUrl);
  invalidateCenterContactSettingsCache();
  return { avatarVersion: version, avatarDataUrl: dataUrl };
}

export async function removeCenterAvatar() {
  const centerId = getActiveCenterId();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'centers', centerId, 'assets', 'avatar'));
  batch.set(doc(db, 'centers', centerId), {
    avatarVersion: '',
    updatedAt: serverTimestamp()
  }, { merge: true });
  await commitWithRetry(() => batch.commit());
  storeCenterAvatarCache('', '');
  invalidateCenterContactSettingsCache();
  return { avatarVersion: '', avatarDataUrl: '' };
}

const SUPPORTED_CENTER_LOCALES = new Set(['it', 'en', 'fr', 'es', 'de', 'ca']);

function normalizeCenterLanguage(value) {
  return typeof value === 'string' && SUPPORTED_CENTER_LOCALES.has(value) ? value : 'it';
}

function refreshCenterContactSettings() {
  const centerId = getActiveCenterId();
  if (centerContactSettingsLoad && centerContactSettingsLoadCenterId === centerId) {
    return centerContactSettingsLoad;
  }
  const requestRevision = centerContactSettingsRevision;
  let request;
  request = Promise.all([
    calendarSettingsCache?.centerId === centerId
      && Date.now() - calendarSettingsCache.cachedAt < CENTER_SETTINGS_CACHE_MS
      ? Promise.resolve(calendarSettingsCache.snapshot)
      : getDoc(doc(db, 'centers', centerId)),
    getDoc(doc(db, 'centers', centerId, 'presentationSettings', 'current')).catch(() => null),
    getDoc(doc(db, 'centers', centerId, 'participantMetadata', 'current')).catch(() => null)
  ])
    .then(async ([snapshot, presentationSnapshot, participantMetadataSnapshot]) => {
      // Se un salvataggio invalida la richiesta, le impostazioni vengono rilette dalla fonte autorevole prima di aggiornare memoria e localStorage.
      if (requestRevision !== centerContactSettingsRevision || centerId !== getActiveCenterId()) {
        if (centerContactSettingsLoad === request) centerContactSettingsLoad = null;
        return refreshCenterContactSettings();
      }
      const centerData = snapshot.exists() ? snapshot.data() : {};
      const presentationData = presentationSnapshot?.exists() ? presentationSnapshot.data() : {};
      const participantMetadata = participantMetadataSnapshot?.exists()
        ? participantMetadataSnapshot.data()
        : {};
      const data = { ...centerData, ...presentationData };
      const avatarVersion = typeof data.avatarVersion === 'string' ? data.avatarVersion : '';
      const avatarDataUrl = await resolveCenterAvatar(avatarVersion)
        .catch(() => loadCachedCenterAvatar());
      if (requestRevision !== centerContactSettingsRevision || centerId !== getActiveCenterId()) {
        if (centerContactSettingsLoad === request) centerContactSettingsLoad = null;
        return refreshCenterContactSettings();
      }
      const value = {
        name: normalizeCenterName(data.name),
        appDisplayName: normalizeAppDisplayName(data.appDisplayName),
        appDisplaySubtitle: normalizeAppDisplaySubtitle(data.appDisplaySubtitle),
        startupPresentationEnabled: data.startupPresentationEnabled === true,
        timezone: typeof data.timezone === 'string' ? data.timezone : 'Europe/Rome',
        reservationCutoffs: normalizeReservationCutoffs(data.reservationCutoffs),
        participantContactSharingEnabled: data.participantContactSharingEnabled !== false,
        kitchenDietLegend: normalizeKitchenDietLegend(data.kitchenDietLegend),
        themePalette: normalizeThemePalette(data.themePalette),
        interfaceStyle: normalizeInterfaceStyle(data.interfaceStyle),
        defaultView: ALLOWED_VIEW_VALUES.has(data.defaultView) ? data.defaultView : DEFAULT_OPENING_VIEW,
        summaryLayout: normalizeLayout(data.summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
        kitchenLayout: normalizeLayout(data.kitchenLayout, 'classic', ALLOWED_KITCHEN_LAYOUT_VALUES),
        monthControlsSide: normalizeLayout(data.monthControlsSide, 'right', ALLOWED_MONTH_CONTROLS_SIDE_VALUES),
        summaryResidentLabel: normalizeResidentLabel(data.summaryResidentLabel, 'name'),
        language: normalizeCenterLanguage(data.language),
        administratorName: typeof data.administratorName === 'string' ? data.administratorName.trim() : '',
        administratorSignature: typeof data.administratorSignature === 'string' ? data.administratorSignature.trim() : '',
        administratorParticipantId: typeof data.administratorParticipantId === 'string' ? data.administratorParticipantId.trim() : '',
        adminEmail: typeof data.adminEmail === 'string' ? data.adminEmail.trim() : '',
        administratorProfileRequired: data.administratorProfileRequired === true,
        administratorProfileComplete: data.administratorProfileRequired !== true
          || data.administratorProfileComplete === true,
        administratorPasswordRequired: data.administratorPasswordRequired === true,
        commonPasswordSet: data.commonPasswordSet === true
          || typeof data.commonPassword === 'string' && data.commonPassword.length >= 4,
        adminSharedPasswordSet: data.adminSharedPasswordSet === true,
        adminPasswordVersion: Number(data.adminPasswordVersion || 0),
        adminTechnicalEmail: typeof data.adminTechnicalEmail === 'string' ? data.adminTechnicalEmail : '',
        adminTechnicalUid: typeof data.adminTechnicalUid === 'string' ? data.adminTechnicalUid : '',
        adminPasswordRotationRequired: data.adminPasswordRotationRequired === true,
        participantDataVersion: timestampVersion(
          participantMetadata.updatedAt || centerData.participantDataUpdatedAt
        ),
        avatarVersion,
        avatarDataUrl
      };
      cacheDefaultView(value.defaultView);
      storeCachedCenterContactSettings(value);
      centerContactSettingsCache = { centerId, value, cachedAt: Date.now() };
      return value;
    })
    .finally(() => {
      if (centerContactSettingsLoad === request) centerContactSettingsLoad = null;
    });
  centerContactSettingsLoad = request;
  centerContactSettingsLoadCenterId = centerId;
  return request;
}

function normalizeCenterName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name === 'Tavola Comune Demo' ? 'Prenotazione pasti' : name;
}

function normalizeThemePalette(value) {
  return ALLOWED_THEME_PALETTES.has(value) ? value : 'inchiostro';
}

function normalizeAppDisplayName(value) {
  const normalized = typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';
  return normalized && normalized.length <= 60
    ? normalized
    : DEFAULT_APP_DISPLAY_NAME;
}

function normalizeAppDisplaySubtitle(value) {
  const normalized = typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';
  return normalized && normalized.length <= 100
    ? normalized
    : DEFAULT_APP_DISPLAY_SUBTITLE;
}

function normalizeInterfaceStyle(value) {
  const migratedValue = value === 'urban' ? 'urban-plus' : value;
  return ALLOWED_INTERFACE_STYLES.has(migratedValue) ? migratedValue : 'cool';
}

function normalizeLayout(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function normalizeResidentLabel(value, fallback = 'name') {
  return ALLOWED_RESIDENT_LABEL_VALUES.has(value) ? value : fallback;
}

async function resolveCenterAvatar(avatarVersion) {
  if (!avatarVersion) {
    storeCenterAvatarCache('', '');
    return '';
  }
  const cached = readCenterAvatarCache();
  if (cached?.version === avatarVersion) {
    return cached.dataUrl;
  }
  const snapshot = await getDoc(doc(db, 'centers', getActiveCenterId(), 'assets', 'avatar'));
  const dataUrl = snapshot.exists() && isValidCenterAvatarDataUrl(snapshot.data().dataUrl)
    ? snapshot.data().dataUrl
    : '';
  storeCenterAvatarCache(dataUrl ? avatarVersion : '', dataUrl);
  return dataUrl;
}

function readCenterAvatarCache() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(getCenterScopedStorageKey(CENTER_AVATAR_STORAGE_KEY));
    if (!raw) {
      return null;
    }
    const cached = JSON.parse(raw);
    return typeof cached?.version === 'string' && isValidCenterAvatarDataUrl(cached.dataUrl)
      ? cached
      : null;
  } catch {
    return null;
  }
}

function storeCenterAvatarCache(version, dataUrl) {
  if (typeof window === 'undefined') {
    return;
  }
  const key = getCenterScopedStorageKey(CENTER_AVATAR_STORAGE_KEY);
  try {
    if (!version || !dataUrl) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify({ version, dataUrl }));
  } catch {
    // La cache locale e facoltativa: l'immagine resta disponibile da Firestore.
  }
}

function isValidCenterAvatarDataUrl(dataUrl) {
  return typeof dataUrl === 'string'
    && /^data:image\/(?:png|jpeg|webp);base64,/i.test(dataUrl)
    && dataUrl.length <= CENTER_AVATAR_MAX_LENGTH;
}

async function commitWithRetry(operation) {
  const retryableCodes = new Set(['unavailable', 'deadline-exceeded', 'aborted']);
  let delay = 250;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!retryableCodes.has(error?.code) || attempt === 2) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay + Math.round(Math.random() * 100)));
      delay *= 2;
    }
  }
}

function timestampVersion(value) {
  if (value && typeof value.toMillis === 'function') {
    return String(value.toMillis());
  }
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? String(date.getTime()) : '0';
}
