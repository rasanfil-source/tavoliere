import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as firestore from 'firebase/firestore';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

const centerId = 'center_vice_deletion';
const viceUid = 'vice_operator';
const participantId = 'ordinary_person';
const path = suffix => `centers/${centerId}${suffix ? '/' + suffix : ''}`;
let env;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tat-vice-deletion-20261016',
    firestore: {
      rules: await readFile(new URL('../../prototypes/firebase-spark-pwa/firestore.rules', import.meta.url), 'utf8')
    }
  });
});
test.after(async () => env?.cleanup());
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const batch = firestore.writeBatch(db);
    const expiresAt = new Date(Date.now() + 86400000);
    batch.set(firestore.doc(db, path()), {
      status: 'ACTIVE', administratorSignature: 'ADMIN', adminPasswordVersion: 1
    });
    for (const id of [participantId, 'vice_person', 'administrator', 'other_person']) {
      const data = {
        status: 'ACTIVE', displayName: id,
        signature: id === 'administrator' ? 'ADMIN' : id,
        viceAdminRole: id === 'vice_person'
      };
      batch.set(firestore.doc(db, path('participants/' + id)), data);
      batch.set(firestore.doc(db, path('publicParticipants/' + id)), data);
      batch.set(firestore.doc(db, path('reservationRules/rule_' + id)), {
        participantId: id, status: 'ACTIVE', startsOn: '2026-01-01', endsOn: null,
        mealTypeIds: ['breakfast', 'lunch', 'dinner']
      });
    }
    batch.set(firestore.doc(db, path('accessSessions/' + viceUid)), {
      centerId, status: 'ACTIVE', scope: 'PERSONAL', participantId: 'vice_person',
      tokenId: 'personal_vice', expiresAt
    });
    batch.set(firestore.doc(db, path('viceSessions/' + viceUid)), {
      centerId, authUid: viceUid, participantId: 'vice_person', status: 'ACTIVE',
      passwordVersion: 1, expiresAt
    });
    for (const id of [participantId, 'other_person']) {
      batch.set(firestore.doc(db, path('accessSessions/session_' + id)), {
        centerId, participantId: id, scope: 'PERSONAL', status: 'ACTIVE',
        tokenId: 'personal_' + id, expiresAt
      });
      batch.set(firestore.doc(db, path('viceSessions/session_' + id)), {
        centerId, participantId: id, status: 'ACTIVE'
      });
      batch.set(firestore.doc(db, path('linkTokens/personal_' + id)), {
        participantId: id, scope: 'PERSONAL', status: 'ACTIVE', expiresAt
      });
    }
    await batch.commit();
  });
});

async function loadDeletionModule() {
  const db = env.authenticatedContext(viceUid, {
    firebase: { sign_in_provider: 'anonymous' }
  }).firestore();
  const getCurrentUser = () => ({ uid: viceUid, isAnonymous: true });
  const audit = await loadBrowserModule('audit-log.js', {
    ...firestore, db, getCurrentUser,
    getActiveCenterId: () => centerId, getCenterScopedStorageKey: key => key
  }, ['appendAuditEvent', 'AUDIT_ACTIONS']);
  return loadBrowserModule('admin-participant-data.js', {
    ...firestore, ...audit, db, getCurrentUser, getActiveCenterId: () => centerId,
    commitWithRetry: operation => operation(),
    invalidateParticipantDataCaches: () => {}, invalidateCenterContactSettingsCache: () => {}
  }, ['deleteAdminParticipant']);
}

test('the actual vice deletion cleans more than one batch and preserves unrelated people and credentials', async () => {
  // Exceed the application's 400-write cleanup chunk to cover both commits.
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const batch = firestore.writeBatch(db);
    for (let index = 0; index < 402; index++) {
      batch.set(firestore.doc(db, path('reservationOverrides/override_' + index)), {
        centerId, participantId, source: 'PERSONAL'
      });
    }
    batch.set(firestore.doc(db, path('reservationOverrides/unrelated')), {
      centerId, participantId: 'other_person', source: 'PERSONAL'
    });
    await batch.commit();
  });
  const module = await loadDeletionModule();
  assert.equal(await module.deleteAdminParticipant(participantId), 406);
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const suffix of [
      'participants/' + participantId, 'publicParticipants/' + participantId,
      'reservationRules/rule_' + participantId, 'accessSessions/session_' + participantId,
      'viceSessions/session_' + participantId, 'linkTokens/personal_' + participantId
    ]) {
      assert.equal((await firestore.getDoc(firestore.doc(db, path(suffix)))).exists(), false, suffix);
    }
    assert.equal((await firestore.getDocs(firestore.query(
      firestore.collection(db, path('reservationOverrides')),
      firestore.where('participantId', '==', participantId)
    ))).size, 0);
    for (const suffix of [
      'participants/other_person', 'publicParticipants/other_person',
      'accessSessions/session_other_person', 'viceSessions/session_other_person',
      'linkTokens/personal_other_person', 'reservationOverrides/unrelated',
      'accessSessions/' + viceUid, 'viceSessions/' + viceUid
    ]) {
      assert.equal((await firestore.getDoc(firestore.doc(db, path(suffix)))).data().status || 'ACTIVE', 'ACTIVE', suffix);
    }
    const audit = await firestore.getDocs(firestore.collection(db, path('viceAuditEvents')));
    assert.equal(audit.size, 1);
    assert.equal(audit.docs[0].data().action, 'DELETE_PARTICIPANT');
    assert.equal(audit.docs[0].data().targetId, participantId);
    assert.equal((await firestore.getDoc(firestore.doc(db, path('participantMetadata/current')))).exists(), true);
  });
});

test('the actual vice deletion cannot disable or delete a vice or administrator', async () => {
  const module = await loadDeletionModule();
  for (const id of ['vice_person', 'administrator']) {
    await assert.rejects(module.deleteAdminParticipant(id), error => error.code === 'permission-denied');
  }
  await env.withSecurityRulesDisabled(async context => {
    for (const id of ['vice_person', 'administrator']) {
      for (const collection of ['participants', 'publicParticipants', 'reservationRules']) {
        const docId = collection === 'reservationRules' ? 'rule_' + id : id;
        const snapshot = await firestore.getDoc(firestore.doc(context.firestore(), path(collection + '/' + docId)));
        assert.equal(snapshot.data().status, 'ACTIVE');
      }
    }
  });
});

test('a password rotation revokes the vice deletion capability', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await firestore.updateDoc(firestore.doc(context.firestore(), path()), { adminPasswordVersion: 2 });
  });
  const module = await loadDeletionModule();
  await assert.rejects(module.deleteAdminParticipant(participantId), error => error.code === 'permission-denied');
  await env.withSecurityRulesDisabled(async context => {
    assert.equal((await firestore.getDoc(firestore.doc(context.firestore(), path('participants/' + participantId)))).data().status, 'ACTIVE');
  });
});
