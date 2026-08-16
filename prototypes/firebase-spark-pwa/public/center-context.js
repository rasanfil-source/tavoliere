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
    return window.localStorage.getItem(CENTER_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function storeCenterId(centerId) {
  try {
    window.localStorage.setItem(CENTER_STORAGE_KEY, centerId);
  } catch {
    // L'URL resta la fonte autorevole anche quando la persistenza locale non è disponibile.
  }
}
