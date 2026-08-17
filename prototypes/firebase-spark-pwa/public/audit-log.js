import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser } from './firebase-client.js?v=20260817q';
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
  if (!batch || !user || user.isAnonymous) return;
  const centerId = getActiveCenterId();
  batch.set(doc(collection(db, 'centers', centerId, 'auditEvents')), {
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
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'auditEvents'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  ));
  return snapshot.docs.map((item) => ({ eventId: item.id, ...item.data() }));
}
