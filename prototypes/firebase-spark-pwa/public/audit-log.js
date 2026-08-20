import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser } from './firebase-client.js?v=20260820t';
import { getActiveCenterId } from './center-context.js?v=20260816h';

export const AUDIT_ACTIONS = Object.freeze({
  DELETE_PARTICIPANT: 'DELETE_PARTICIPANT',
  REJECT_ADMIN_INVITATION: 'REJECT_ADMIN_INVITATION',
  REVOKE_ADMIN: 'REVOKE_ADMIN',
  REVOKE_ADMIN_INVITATION: 'REVOKE_ADMIN_INVITATION',
  ROTATE_OPERATIONAL_LINK: 'ROTATE_OPERATIONAL_LINK',
  TRANSFER_OWNERSHIP: 'TRANSFER_OWNERSHIP',
  UPDATE_ADMIN_PERMISSIONS: 'UPDATE_ADMIN_PERMISSIONS',
  UPDATE_CENTER_SETTINGS: 'UPDATE_CENTER_SETTINGS',
  UPSERT_PARTICIPANT: 'UPSERT_PARTICIPANT'
});

export function appendAuditEvent(batch, event, user = getCurrentUser()) {
  if (!batch || !user) return;
  const centerId = getActiveCenterId();
  const collectionName = user.isAnonymous ? 'viceAuditEvents' : 'auditEvents';
  batch.set(doc(collection(db, 'centers', centerId, collectionName)), {
    centerId,
    actorUid: user.uid,
    action: String(event.action || '').slice(0, 80),
    targetType: String(event.targetType || '').slice(0, 40),
    targetId: String(event.targetId || '').slice(0, 160),
    summary: String(event.summary || '').slice(0, 240),
    createdAt: serverTimestamp()
  });
}

export async function listAuditEvents(maximum = 20) {
  const requested = Number(maximum);
  const pageSize = Number.isFinite(requested) ? Math.min(50, Math.max(1, Math.round(requested))) : 20;
  const centerId = getActiveCenterId();
  const buildQuery = (collectionName) => query(
    collection(db, 'centers', centerId, collectionName),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  const [administratorSnapshot, viceSnapshot] = await Promise.all([
    getDocs(buildQuery('auditEvents')),
    getDocs(buildQuery('viceAuditEvents'))
  ]);
  return [...administratorSnapshot.docs, ...viceSnapshot.docs]
    .map((item) => ({ eventId: item.id, ...item.data() }))
    .sort((left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt))
    .slice(0, pageSize);
}

function timestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}
