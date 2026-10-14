export const DEFAULT_CENTER_ID = 'center_default';
const CENTER_STORAGE_KEY = 'tavolaComune.centerId';
const CENTER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/i;

export function getActiveCenterId() {
  const requested = new URLSearchParams(window.location.search).get('c') || '';
  if (CENTER_ID_PATTERN.test(requested)) {
    storeCenterId(requested);
    return requested;
  }

  const stored = loadStoredCenterId();
  if (CENTER_ID_PATTERN.test(stored)) storeCenterId(stored);
  return CENTER_ID_PATTERN.test(stored) ? stored : DEFAULT_CENTER_ID;
}

export function setActiveCenterId(centerId, { updateUrl = true } = {}) {
  if (!CENTER_ID_PATTERN.test(centerId)) {
    throw new Error('Identificativo centro non valido');
  }

  storeCenterId(centerId);
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('c', centerId);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
  window.dispatchEvent?.(new Event('centerchange'));
  return centerId;
}

export function createOwnedCenterId(userUid, suffix = '') {
  const normalizedUid = String(userUid || '').trim();
  const normalizedSuffix = String(suffix || createCenterIdSuffix()).trim().toLowerCase();
  const centerId = `center_${normalizedUid}_${normalizedSuffix}`;
  if (!CENTER_ID_PATTERN.test(centerId)) {
    throw new Error('Impossibile generare l\'identificativo del centro');
  }
  return centerId;
}

function createCenterIdSuffix() {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 16);
}

export function getCenterScopedStorageKey(baseKey) {
  return `${baseKey}.${getActiveCenterId()}`;
}

function loadStoredCenterId() {
  try {
    const stored = window.localStorage.getItem(CENTER_STORAGE_KEY) || '';
    if (CENTER_ID_PATTERN.test(stored)) return stored;
  } catch {}
  // iOS copies cookies when installing a Home Screen app, but not localStorage.
  try {
    return document.cookie.split(';').map((item) => item.trim())
      .find((item) => item.startsWith(CENTER_STORAGE_KEY + '='))?.slice(CENTER_STORAGE_KEY.length + 1) || '';
  } catch { return ''; }
}

function storeCenterId(centerId) {
  try {
    document.cookie = `${CENTER_STORAGE_KEY}=${centerId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  } catch {}
  try {
    window.localStorage.setItem(CENTER_STORAGE_KEY, centerId);
  } catch {
    // L'URL resta la fonte autorevole anche quando la persistenza locale non è disponibile.
  }
}
