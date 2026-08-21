import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20260820u';
import { getActiveCenterId, getCenterScopedStorageKey } from './center-context.js?v=20260816h';
import { normalizeReservationCutoffs } from './schedule-utils.mjs?v=20260816g';

export const CENTER_AVATAR_STORAGE_KEY = 'tavolaComune.centerAvatar';
export const DEFAULT_VIEW_CACHE_KEY = 'tavolaComune.defaultViewCache';
export const CENTER_PRESENTATION_CACHE_KEY = 'tavolaComune.centerPresentation';
export const DEFAULT_APP_DISPLAY_NAME = 'Oggi a tavola';
const ALLOWED_VIEW_VALUES = new Set(['month', 'week']);
const ALLOWED_SUMMARY_LAYOUT_VALUES = new Set(['classic', 'international', 'future']);
const ALLOWED_KITCHEN_LAYOUT_VALUES = new Set(['classic', 'international']);
const ALLOWED_MONTH_LAYOUT_VALUES = new Set(['grid', 'future']);
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
let centerContactSettingsRevision = 0;

export function loadCachedCenterContactSettings() {
  try {
    const raw = window.localStorage.getItem(getCenterScopedStorageKey(CENTER_PRESENTATION_CACHE_KEY));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || typeof cached !== 'object') return null;
    return {
      name: normalizeCenterName(cached.name),
      appDisplayName: normalizeAppDisplayName(cached.appDisplayName),
      timezone: typeof cached.timezone === 'string' ? cached.timezone : 'Europe/Rome',
      reservationCutoffs: normalizeReservationCutoffs(cached.reservationCutoffs),
      participantContactSharingEnabled: cached.participantContactSharingEnabled !== false,
      themePalette: normalizeThemePalette(cached.themePalette),
      interfaceStyle: normalizeInterfaceStyle(cached.interfaceStyle),
      defaultView: ALLOWED_VIEW_VALUES.has(cached.defaultView) ? cached.defaultView : 'month',
      summaryLayout: normalizeLayout(cached.summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
      kitchenLayout: normalizeLayout(cached.kitchenLayout, 'classic', ALLOWED_KITCHEN_LAYOUT_VALUES),
      monthLayout: normalizeLayout(cached.monthLayout, 'grid', ALLOWED_MONTH_LAYOUT_VALUES),
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
      adminPasswordSet: cached.adminPasswordSet === true,
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
    return ALLOWED_VIEW_VALUES.has(raw) ? raw : 'month';
  } catch {
    return 'month';
  }
}

export function cacheDefaultView(value) {
  const normalized = ALLOWED_VIEW_VALUES.has(value) ? value : 'month';
  try {
    window.localStorage.setItem(getCenterScopedStorageKey(DEFAULT_VIEW_CACHE_KEY), normalized);
  } catch {
    // La cache locale evita solo lo sfarfallio al primo render; non è indispensabile.
  }
}

export function invalidateCenterContactSettingsCache() {
  centerContactSettingsRevision += 1;
  centerContactSettingsCache = null;
  // Do not let a read started before a save remain the shared promise for a
  // later caller. Its completion is guarded by the revision below.
  centerContactSettingsLoad = null;
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
      value: { ...centerContactSettingsCache.value, adminEmail: normalizedEmail },
      cachedAt: Date.now()
    };
  }
  return normalizedEmail;
}

export async function loadCenterContactSettings({ forceRefresh = false } = {}) {
  if (!forceRefresh && centerContactSettingsCache) {
    if (Date.now() - centerContactSettingsCache.cachedAt >= CENTER_SETTINGS_CACHE_MS) {
      refreshCenterContactSettings().catch(() => undefined);
    }
    return centerContactSettingsCache.value;
  }
  return refreshCenterContactSettings();
}

export async function updateCenterSettings({
  name,
  appDisplayName,
  timezone,
  reservationCutoffs,
  participantContactSharingEnabled,
  themePalette,
  interfaceStyle,
  defaultView,
  summaryLayout,
  kitchenLayout,
  monthLayout,
  monthControlsSide,
  summaryResidentLabel,
  language,
  commonPassword,
  administratorSharedPassword,
  currentAdministratorSharedPassword,
  administratorName,
  administratorSignature,
  adminEmail,
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
  if (!normalizedAdministratorName || normalizedAdministratorName.length > 120) {
    throw new Error('Inserisci il nome del responsabile');
  }
  if (!/^[A-Z0-9]{2,12}$/.test(normalizedAdministratorSignature)) {
    throw new Error('La sigla deve contenere da 2 a 12 lettere o numeri');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedAdministratorEmail)
      || normalizedAdministratorEmail.length > 254) {
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
  const { saveCenterConfiguration } = await import('./calendar-configuration.js?v=20260821e');
  const settings = await saveCenterConfiguration({
    name: normalizedName,
    ...(appDisplayName === undefined
      ? {}
      : { appDisplayName: normalizeAppDisplayName(appDisplayName) }),
    timezone,
    reservationCutoffs: normalizedCutoffs,
    participantContactSharingEnabled: Boolean(participantContactSharingEnabled),
    themePalette: normalizeThemePalette(themePalette),
    interfaceStyle: normalizeInterfaceStyle(interfaceStyle),
    defaultView: ALLOWED_VIEW_VALUES.has(defaultView) ? defaultView : 'month',
    summaryLayout: normalizeLayout(summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
    kitchenLayout: normalizeLayout(kitchenLayout, 'classic', ALLOWED_KITCHEN_LAYOUT_VALUES),
    monthLayout: normalizeLayout(monthLayout, 'grid', ALLOWED_MONTH_LAYOUT_VALUES),
    monthControlsSide: normalizeLayout(monthControlsSide, 'right', ALLOWED_MONTH_CONTROLS_SIDE_VALUES),
    summaryResidentLabel: normalizeResidentLabel(summaryResidentLabel, 'name'),
    language: typeof language === 'string' && language.trim() ? language : undefined,
    commonPassword: trimmedPassword || null,
    administratorSharedPassword: trimmedAdministratorSharedPassword,
    currentAdministratorSharedPassword: typeof currentAdministratorSharedPassword === 'string'
      ? currentAdministratorSharedPassword
      : '',
    administratorName: normalizedAdministratorName,
    administratorSignature: normalizedAdministratorSignature,
    adminEmail: normalizedAdministratorEmail,
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

export async function updateParticipantContactSharing(enabled) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'centers', getActiveCenterId()), {
    participantContactSharingEnabled: enabled === true,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await commitWithRetry(() => batch.commit());
  invalidateCenterContactSettingsCache();
  return enabled === true;
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

const SUPPORTED_CENTER_LOCALES = new Set(['it', 'en', 'fr', 'es', 'de']);

function normalizeCenterLanguage(value) {
  return typeof value === 'string' && SUPPORTED_CENTER_LOCALES.has(value) ? value : 'it';
}

function refreshCenterContactSettings() {
  if (centerContactSettingsLoad) {
    return centerContactSettingsLoad;
  }
  const requestRevision = centerContactSettingsRevision;
  let request;
  const centerId = getActiveCenterId();
  request = Promise.all([
    getDoc(doc(db, 'centers', centerId)),
    getDoc(doc(db, 'centers', centerId, 'presentationSettings', 'current')).catch(() => null),
    getDoc(doc(db, 'centers', centerId, 'participantMetadata', 'current')).catch(() => null)
  ])
    .then(async ([snapshot, presentationSnapshot, participantMetadataSnapshot]) => {
      // A save may have invalidated this request while Firestore was still
      // resolving. Re-read authoritative settings instead of publishing the
      // stale snapshot into memory or localStorage.
      if (requestRevision !== centerContactSettingsRevision) {
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
      const value = {
        name: normalizeCenterName(data.name),
        appDisplayName: normalizeAppDisplayName(data.appDisplayName),
        timezone: typeof data.timezone === 'string' ? data.timezone : 'Europe/Rome',
        reservationCutoffs: normalizeReservationCutoffs(data.reservationCutoffs),
        participantContactSharingEnabled: data.participantContactSharingEnabled !== false,
        themePalette: normalizeThemePalette(data.themePalette),
        interfaceStyle: normalizeInterfaceStyle(data.interfaceStyle),
        defaultView: ALLOWED_VIEW_VALUES.has(data.defaultView) ? data.defaultView : 'month',
        summaryLayout: normalizeLayout(data.summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
        kitchenLayout: normalizeLayout(data.kitchenLayout, 'classic', ALLOWED_KITCHEN_LAYOUT_VALUES),
        monthLayout: normalizeLayout(data.monthLayout, 'grid', ALLOWED_MONTH_LAYOUT_VALUES),
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
        adminPasswordSet: data.administratorPasswordRequired === true,
        commonPasswordSet: typeof data.commonPassword === 'string' && data.commonPassword.length >= 4,
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
      centerContactSettingsCache = { value, cachedAt: Date.now() };
      return value;
    })
    .finally(() => {
      if (centerContactSettingsLoad === request) centerContactSettingsLoad = null;
    });
  centerContactSettingsLoad = request;
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

function normalizeInterfaceStyle(value) {
  const migratedValue = value === 'urban' ? 'urban-plus' : value;
  return ALLOWED_INTERFACE_STYLES.has(migratedValue) ? migratedValue : 'urban-plus';
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
