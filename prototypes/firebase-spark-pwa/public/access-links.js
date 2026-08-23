import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser } from './firebase-client.js?v=20260822a';
import { getActiveCenterId } from './center-context.js?v=20260816h';
import { appendAuditEvent, AUDIT_ACTIONS } from './audit-log.js?v=20260816g';
import { createOperationalAccessExpiry } from './schedule-utils.mjs?v=20260816g';

const SETTINGS_DOCUMENT_ID = 'operationalLinks';
const LEGACY_OPERATIONAL_TOKENS = new Set(['public_demo', 'kitchen_demo']);
const LINK_SCOPES = Object.freeze({
  PUBLIC: {
    field: 'publicTokenId',
    prefix: 'public_',
    targetType: 'CENTER',
    fallback: ''
  },
  KITCHEN: {
    field: 'kitchenTokenId',
    prefix: 'kitchen_',
    targetType: 'CENTER',
    fallback: ''
  }
});

const cachedLinksByCenter = new Map();

export async function loadOperationalLinks({ forceRefresh = false } = {}) {
  const centerId = getActiveCenterId();
  if (!forceRefresh && cachedLinksByCenter.has(centerId)) {
    return cachedLinksByCenter.get(centerId);
  }
  const snapshot = await getDoc(settingsRef(centerId));
  const links = await resolveOperationalLinkStatuses(
    centerId,
    normalizeOperationalLinks(snapshot.exists() ? snapshot.data() : {})
  );
  cachedLinksByCenter.set(centerId, links);
  return links;
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
    const currentLinks = normalizeOperationalLinks(storedLinks);
    const currentPublicRef = currentLinks.publicTokenId
      ? tokenRef(centerId, currentLinks.publicTokenId)
      : null;
    const currentKitchenRef = currentLinks.kitchenTokenId
      ? tokenRef(centerId, currentLinks.kitchenTokenId)
      : null;
    // Firestore transactions require every read before the first write.
    const currentPublicSnapshot = currentPublicRef
      ? await transaction.get(currentPublicRef)
      : null;
    const currentKitchenSnapshot = currentKitchenRef
      ? await transaction.get(currentKitchenRef)
      : null;
    const publicUsable = tokenIsUsable(currentPublicSnapshot, 'PUBLIC');
    const kitchenUsable = tokenIsUsable(currentKitchenSnapshot, 'KITCHEN');
    if (publicUsable && kitchenUsable) {
      return {
        ...currentLinks,
        publicStatus: 'ACTIVE',
        kitchenStatus: 'ACTIVE'
      };
    }

    const publicTokenId = publicUsable
      ? currentLinks.publicTokenId
      : LINK_SCOPES.PUBLIC.prefix + createRandomToken();
    const kitchenTokenId = kitchenUsable
      ? currentLinks.kitchenTokenId
      : LINK_SCOPES.KITCHEN.prefix + createRandomToken();
    const expiresAt = createOperationalAccessExpiry();
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

    if (!publicUsable) {
      if (currentPublicSnapshot?.exists()) {
        transaction.set(currentPublicRef, {
          status: 'REVOKED',
          revokedAt: now,
          updatedAt: now
        }, { merge: true });
      }
      transaction.set(tokenRef(centerId, publicTokenId), {
        status: 'ACTIVE',
        scope: 'PUBLIC',
        targetType: LINK_SCOPES.PUBLIC.targetType,
        expiresAt,
        createdAt: now,
        updatedAt: now
      });
    }
    if (!kitchenUsable) {
      if (currentKitchenSnapshot?.exists()) {
        transaction.set(currentKitchenRef, {
          status: 'REVOKED',
          revokedAt: now,
          updatedAt: now
        }, { merge: true });
      }
      transaction.set(tokenRef(centerId, kitchenTokenId), {
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
      publicCreatedAt: publicUsable && currentLinks.publicCreatedAt
        ? currentLinks.publicCreatedAt
        : now,
      kitchenCreatedAt: kitchenUsable && currentLinks.kitchenCreatedAt
        ? currentLinks.kitchenCreatedAt
        : now,
      updatedAt: now
    });
    appendAuditEvent(transaction, {
      action: AUDIT_ACTIONS.ROTATE_OPERATIONAL_LINK,
      targetType: 'OPERATIONAL_LINK',
      targetId: publicUsable || kitchenUsable ? 'REPAIR' : 'INITIAL',
      summary: publicUsable || kitchenUsable
        ? 'Collegamenti operativi riparati'
        : 'Collegamenti operativi attivati'
    }, user);

    return {
      publicTokenId,
      kitchenTokenId,
      publicStatus: 'ACTIVE',
      kitchenStatus: 'ACTIVE',
      publicCreatedAt: publicUsable && currentLinks.publicCreatedAt
        ? currentLinks.publicCreatedAt
        : createdAt,
      kitchenCreatedAt: kitchenUsable && currentLinks.kitchenCreatedAt
        ? currentLinks.kitchenCreatedAt
        : createdAt
    };
  });

  cachedLinksByCenter.set(centerId, result);
  return result;
}

export function invalidateOperationalLinksCache() {
  cachedLinksByCenter.clear();
}

async function resolveOperationalLinkStatuses(centerId, links) {
  const [publicSnapshot, kitchenSnapshot] = await Promise.all([
    links.publicTokenId ? getDoc(tokenRef(centerId, links.publicTokenId)) : Promise.resolve(null),
    links.kitchenTokenId ? getDoc(tokenRef(centerId, links.kitchenTokenId)) : Promise.resolve(null)
  ]);
  return {
    ...links,
    publicStatus: tokenIsUsable(publicSnapshot, 'PUBLIC') ? 'ACTIVE' : 'INACTIVE',
    kitchenStatus: tokenIsUsable(kitchenSnapshot, 'KITCHEN') ? 'ACTIVE' : 'INACTIVE'
  };
}

function tokenIsUsable(snapshot, expectedScope, now = new Date()) {
  if (!snapshot?.exists()) return false;
  const data = snapshot.data();
  const expiresAt = normalizeDate(data.expiresAt);
  return data.status === 'ACTIVE'
    && data.scope === expectedScope
    && data.targetType === 'CENTER'
    && expiresAt instanceof Date
    && expiresAt > now;
}

function tokenRef(centerId, tokenId) {
  return doc(db, 'centers', centerId, 'linkTokens', tokenId);
}

function settingsRef(centerId) {
  return doc(db, 'centers', centerId, 'privateSettings', SETTINGS_DOCUMENT_ID);
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
