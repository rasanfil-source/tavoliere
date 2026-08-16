import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20260816d';
import { getActiveCenterId, getCenterScopedStorageKey } from './center-context.js?v=20260816d';
import { normalizeReservationCutoffs } from './schedule-utils.mjs?v=20260816d';

export const CENTER_AVATAR_STORAGE_KEY = 'tavolaComune.centerAvatar';
export const DEFAULT_VIEW_CACHE_KEY = 'tavolaComune.defaultViewCache';
export const CENTER_PRESENTATION_CACHE_KEY = 'tavolaComune.centerPresentation';
const ALLOWED_VIEW_VALUES = new Set(['month', 'week']);
const ALLOWED_LAYOUT_VALUES = new Set(['classic', 'international']);
const CENTER_SETTINGS_CACHE_MS = 60 * 1000;
const CENTER_AVATAR_MAX_LENGTH = 300000;
const ALLOWED_THEME_PALETTES = new Set([
  'smeraldo',
  'giallino',
  'beige',
  'rosso-pallido',
  'confetto'
]);
let centerContactSettingsCache = null;
let centerContactSettingsLoad = null;

export function loadCachedCenterContactSettings() {
  try {
    const raw = window.localStorage.getItem(getCenterScopedStorageKey(CENTER_PRESENTATION_CACHE_KEY));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || typeof cached !== 'object') return null;
    return {
      name: normalizeCenterName(cached.name),
      timezone: typeof cached.timezone === 'string' ? cached.timezone : 'Europe/Rome',
      reservationCutoffs: normalizeReservationCutoffs(cached.reservationCutoffs),
      participantContactSharingEnabled: cached.participantContactSharingEnabled !== false,
      themePalette: normalizeThemePalette(cached.themePalette),
      defaultView: ALLOWED_VIEW_VALUES.has(cached.defaultView) ? cached.defaultView : 'month',
      summaryLayout: normalizeLayout(cached.summaryLayout, 'international'),
      kitchenLayout: normalizeLayout(cached.kitchenLayout, 'classic'),
      language: normalizeCenterLanguage(cached.language),
      administratorName: typeof cached.administratorName === 'string' ? cached.administratorName.trim() : '',
      administratorSignature: typeof cached.administratorSignature === 'string' ? cached.administratorSignature.trim() : '',
      adminEmail: typeof cached.adminEmail === 'string' ? cached.adminEmail.trim() : '',
      administratorProfileRequired: cached.administratorProfileRequired === true,
      administratorProfileComplete: cached.administratorProfileComplete !== false,
      administratorPasswordRequired: cached.administratorPasswordRequired === true,
      adminPasswordSet: cached.adminPasswordSet === true,
      commonPasswordSet: cached.commonPasswordSet === true,
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
  centerContactSettingsCache = null;
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
  timezone,
  reservationCutoffs,
  participantContactSharingEnabled,
  themePalette,
  defaultView,
  summaryLayout,
  kitchenLayout,
  language,
  commonPassword,
  administratorName,
  administratorSignature,
  adminEmail,
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
  const normalizedCutoffs = normalizeReservationCutoffs(reservationCutoffs);
  const { saveCenterConfiguration } = await import('./calendar-configuration.js?v=20260816d');
  const settings = await saveCenterConfiguration({
    name: normalizedName,
    timezone,
    reservationCutoffs: normalizedCutoffs,
    participantContactSharingEnabled: Boolean(participantContactSharingEnabled),
    themePalette: normalizeThemePalette(themePalette),
    defaultView: ALLOWED_VIEW_VALUES.has(defaultView) ? defaultView : 'month',
    summaryLayout: normalizeLayout(summaryLayout, 'international'),
    kitchenLayout: normalizeLayout(kitchenLayout, 'classic'),
    language: language || 'it',
    commonPassword: trimmedPassword || null,
    administratorName: normalizedAdministratorName,
    administratorSignature: normalizedAdministratorSignature,
    adminEmail: normalizedAdministratorEmail,
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

export async function saveCenterAvatar(dataUrl) {
  if (!isValidCenterAvatarDataUrl(dataUrl)) {
    throw new Error('L\'immagine scelta non e valida o e troppo grande');
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
  centerContactSettingsLoad = getDoc(doc(db, 'centers', getActiveCenterId()))
    .then(async (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      const avatarVersion = typeof data.avatarVersion === 'string' ? data.avatarVersion : '';
      const avatarDataUrl = await resolveCenterAvatar(avatarVersion)
        .catch(() => loadCachedCenterAvatar());
      const value = {
        name: normalizeCenterName(data.name),
        timezone: typeof data.timezone === 'string' ? data.timezone : 'Europe/Rome',
        reservationCutoffs: normalizeReservationCutoffs(data.reservationCutoffs),
        participantContactSharingEnabled: data.participantContactSharingEnabled !== false,
        themePalette: normalizeThemePalette(data.themePalette),
        defaultView: ALLOWED_VIEW_VALUES.has(data.defaultView) ? data.defaultView : 'month',
        summaryLayout: normalizeLayout(data.summaryLayout, 'international'),
        kitchenLayout: normalizeLayout(data.kitchenLayout, 'classic'),
        language: normalizeCenterLanguage(data.language),
        administratorName: typeof data.administratorName === 'string' ? data.administratorName.trim() : '',
        administratorSignature: typeof data.administratorSignature === 'string' ? data.administratorSignature.trim() : '',
        adminEmail: typeof data.adminEmail === 'string' ? data.adminEmail.trim() : '',
        administratorProfileRequired: data.administratorProfileRequired === true,
        administratorProfileComplete: data.administratorProfileRequired !== true
          || data.administratorProfileComplete === true,
        administratorPasswordRequired: data.administratorPasswordRequired === true,
        adminPasswordSet: data.administratorPasswordRequired === true,
        commonPasswordSet: typeof data.commonPassword === 'string' && data.commonPassword.length >= 4,
        participantDataVersion: timestampVersion(data.participantDataUpdatedAt),
        avatarVersion,
        avatarDataUrl
      };
      cacheDefaultView(value.defaultView);
      storeCachedCenterContactSettings(value);
      centerContactSettingsCache = { value, cachedAt: Date.now() };
      return value;
    })
    .finally(() => {
      centerContactSettingsLoad = null;
    });
  return centerContactSettingsLoad;
}

function normalizeCenterName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name === 'Tavola Comune Demo' ? 'Prenotazione pasti' : name;
}

function normalizeThemePalette(value) {
  return ALLOWED_THEME_PALETTES.has(value) ? value : 'smeraldo';
}

function normalizeLayout(value, fallback) {
  return ALLOWED_LAYOUT_VALUES.has(value) ? value : fallback;
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
