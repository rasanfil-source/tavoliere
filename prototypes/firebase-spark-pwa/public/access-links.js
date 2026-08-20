import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser } from './firebase-client.js?v=20260820t';
import { getActiveCenterId } from './center-context.js?v=20260816h';
import { appendAuditEvent, AUDIT_ACTIONS } from './audit-log.js?v=20260816g';

const SETTINGS_DOCUMENT_ID = 'operationalLinks';
const LINK_LIFETIME_DAYS = 9000;
const SESSION_DELETE_BATCH_SIZE = 450;
const LEGACY_OPERATIONAL_TOKENS = new Set(['public_demo', 'kitchen_demo']);
const LINK_SCOPES = Object.freeze({
  PUBLIC: {
    field: 'publicTokenId',
    prefix: 'public_',
    targetType: 'CENTER',
    fallback: '',
    label: 'residenti e riepilogo'
  },
  KITCHEN: {
    field: 'kitchenTokenId',
    prefix: 'kitchen_',
    targetType: 'CENTER',
    fallback: '',
    label: 'cucina'
  }
});

let cachedLinks = null;

export async function loadOperationalLinks({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedLinks) {
    return cachedLinks;
  }
  const centerId = getActiveCenterId();
  const snapshot = await getDoc(settingsRef(centerId));
  cachedLinks = normalizeOperationalLinks(snapshot.exists() ? snapshot.data() : {});
  return cachedLinks;
}

export async function ensureOperationalLinks(user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }

  const centerId = getActiveCenterId();
  const configurationRef = settingsRef(centerId);
  const result = await runTransaction(db, async (transaction) => {
    const configurationSnapshot = await transaction.get(configurationRef);
    const storedLinks = configurationSnapshot.exists() ? configurationSnapshot.data() : {};
    const currentLinks = normalizeOperationalLinks(
      storedLinks
    );
    if (currentLinks.publicTokenId && currentLinks.kitchenTokenId) {
      return currentLinks;
    }

    const publicTokenId = currentLinks.publicTokenId || LINK_SCOPES.PUBLIC.prefix + createRandomToken();
    const kitchenTokenId = currentLinks.kitchenTokenId || LINK_SCOPES.KITCHEN.prefix + createRandomToken();
    const expiresAt = new Date(Date.now() + LINK_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
    const createdAt = new Date();
    const now = serverTimestamp();

    [storedLinks.publicTokenId, storedLinks.kitchenTokenId]
      .map((value) => String(value || '').trim())
      .filter((value) => LEGACY_OPERATIONAL_TOKENS.has(value))
      .forEach((legacyTokenId) => {
        transaction.set(doc(db, 'centers', centerId, 'linkTokens', legacyTokenId), {
          status: 'REVOKED',
          revokedAt: now,
          updatedAt: now
        }, { merge: true });
      });

    if (!currentLinks.publicTokenId) {
      transaction.set(doc(db, 'centers', centerId, 'linkTokens', publicTokenId), {
        status: 'ACTIVE',
        scope: 'PUBLIC',
        targetType: LINK_SCOPES.PUBLIC.targetType,
        expiresAt,
        createdAt: now,
        updatedAt: now
      });
    }
    if (!currentLinks.kitchenTokenId) {
      transaction.set(doc(db, 'centers', centerId, 'linkTokens', kitchenTokenId), {
        status: 'ACTIVE',
        scope: 'KITCHEN',
        targetType: LINK_SCOPES.KITCHEN.targetType,
        expiresAt,
        createdAt: now,
        updatedAt: now
      });
    }

    transaction.set(configurationRef, {
      centerId,
      publicTokenId,
      kitchenTokenId,
      publicCreatedAt: currentLinks.publicCreatedAt || now,
      kitchenCreatedAt: currentLinks.kitchenCreatedAt || now,
      updatedAt: now
    });
    appendAuditEvent(transaction, {
      action: AUDIT_ACTIONS.ROTATE_OPERATIONAL_LINK,
      targetType: 'OPERATIONAL_LINK',
      targetId: 'INITIAL',
      summary: 'Collegamenti operativi attivati'
    }, user);

    return {
      publicTokenId,
      kitchenTokenId,
      publicStatus: 'ACTIVE',
      kitchenStatus: 'ACTIVE',
      publicCreatedAt: currentLinks.publicCreatedAt || createdAt,
      kitchenCreatedAt: currentLinks.kitchenCreatedAt || createdAt
    };
  });

  cachedLinks = result;
  return result;
}

export async function rotateOperationalLink(scope, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const normalizedScope = String(scope || '').trim().toUpperCase();
  const configuration = LINK_SCOPES[normalizedScope];
  if (!configuration) {
    throw new Error('Tipo di collegamento non valido');
  }

  const centerId = getActiveCenterId();
  const configurationRef = settingsRef(centerId);
  const nextTokenId = configuration.prefix + createRandomToken();
  const expiresAt = new Date(Date.now() + LINK_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
  let previousTokenId = '';

  const result = await runTransaction(db, async (transaction) => {
    const configurationSnapshot = await transaction.get(configurationRef);
    const currentLinks = normalizeOperationalLinks(
      configurationSnapshot.exists() ? configurationSnapshot.data() : {}
    );
    previousTokenId = currentLinks[configuration.field];
    const nextLinks = {
      ...currentLinks,
      [configuration.field]: nextTokenId,
      [normalizedScope === 'PUBLIC' ? 'publicStatus' : 'kitchenStatus']: 'ACTIVE',
      [normalizedScope === 'PUBLIC' ? 'publicCreatedAt' : 'kitchenCreatedAt']: new Date()
    };
    const previousTokenRef = doc(db, 'centers', centerId, 'linkTokens', previousTokenId);
    const nextTokenRef = doc(db, 'centers', centerId, 'linkTokens', nextTokenId);
    const now = serverTimestamp();

    transaction.set(nextTokenRef, {
      status: 'ACTIVE',
      scope: normalizedScope,
      targetType: configuration.targetType,
      expiresAt,
      createdAt: now,
      updatedAt: now
    });
    if (previousTokenId) {
      transaction.update(previousTokenRef, {
        status: 'REVOKED',
        revokedAt: now,
        updatedAt: now
      });
    }
    transaction.set(configurationRef, {
      centerId,
      publicTokenId: nextLinks.publicTokenId,
      kitchenTokenId: nextLinks.kitchenTokenId,
      publicCreatedAt: nextLinks.publicCreatedAt || now,
      kitchenCreatedAt: nextLinks.kitchenCreatedAt || now,
      updatedAt: now
    });
    appendAuditEvent(transaction, {
      action: AUDIT_ACTIONS.ROTATE_OPERATIONAL_LINK,
      targetType: 'OPERATIONAL_LINK',
      targetId: normalizedScope,
      summary: `Collegamento ${configuration.label} rigenerato`
    }, user);

    return nextLinks;
  });

  await deleteSessionsForToken(centerId, previousTokenId);

  cachedLinks = result;
  return result;
}

export function invalidateOperationalLinksCache() {
  cachedLinks = null;
}

function settingsRef(centerId) {
  return doc(db, 'centers', centerId, 'privateSettings', SETTINGS_DOCUMENT_ID);
}

async function deleteSessionsForToken(centerId, tokenId) {
  if (!tokenId) return;
  const sessionSnapshot = await getDocs(query(
    collection(db, 'centers', centerId, 'accessSessions'),
    where('tokenId', '==', tokenId)
  ));
  for (let index = 0; index < sessionSnapshot.docs.length; index += SESSION_DELETE_BATCH_SIZE) {
    const batch = writeBatch(db);
    sessionSnapshot.docs.slice(index, index + SESSION_DELETE_BATCH_SIZE)
      .forEach((snapshot) => batch.delete(snapshot.ref));
    await batch.commit();
  }
}

function normalizeOperationalLinks(data) {
  const publicTokenId = normalizeTokenId(data.publicTokenId, LINK_SCOPES.PUBLIC.fallback);
  const kitchenTokenId = normalizeTokenId(data.kitchenTokenId, LINK_SCOPES.KITCHEN.fallback);
  return {
    publicTokenId,
    kitchenTokenId,
    publicStatus: publicTokenId ? 'ACTIVE' : 'INACTIVE',
    kitchenStatus: kitchenTokenId ? 'ACTIVE' : 'INACTIVE',
    publicCreatedAt: normalizeDate(data.publicCreatedAt || data.updatedAt),
    kitchenCreatedAt: normalizeDate(data.kitchenCreatedAt || data.updatedAt)
  };
}

function normalizeDate(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function normalizeTokenId(value, fallback) {
  const normalized = String(value || '').trim();
  return /^[A-Za-z0-9_]{8,160}$/.test(normalized)
    && !LEGACY_OPERATIONAL_TOKENS.has(normalized)
    ? normalized
    : fallback;
}

function createRandomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}
