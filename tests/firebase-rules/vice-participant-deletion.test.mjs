import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as firestore from 'firebase/firestore';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as revision from '../../prototypes/firebase-spark-pwa/public/core/revision.mjs';

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
    batch.set(firestore.doc(db, path('participantMetadata/administratorProtection')), { ready: true });
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

async function loadDeletionModule(overrides = {}) {
  const db = env.authenticatedContext(viceUid, {
    firebase: { sign_in_provider: 'anonymous' }
  }).firestore();
  const getCurrentUser = () => ({ uid: viceUid, isAnonymous: true });
  const audit = await loadBrowserModule('audit-log.js', {
    ...firestore, db, getCurrentUser,
    getActiveCenterId: () => centerId, getCenterScopedStorageKey: key => key
  }, ['appendAuditEvent', 'AUDIT_ACTIONS']);
  return loadBrowserModule('admin-participant-data.js', {
    ...firestore, ...audit, ...revision, db, getCurrentUser, getActiveCenterId: () => centerId,
    commitWithRetry: operation => operation(),
    invalidateParticipantDataCaches: () => {}, invalidateCenterContactSettingsCache: () => {},
    ...overrides
  }, ['deleteAdminParticipant']);
}

test('vice deletion revokes a legacy manager membership and its index without touching administrators', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await firestore.setDoc(firestore.doc(db, path('admins/legacy')), {
      participantId, role: 'MANAGER', status: 'ACTIVE', massPermission: true
    });
    await firestore.setDoc(firestore.doc(db, path('administratorDeletionProtection/legacy')), {
      participantId, role: 'MANAGER', status: 'ACTIVE'
    });
  });
  const module = await loadDeletionModule();
  await module.deleteAdminParticipant(participantId);
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const account = (await firestore.getDoc(firestore.doc(db, path('admins/legacy')))).data();
    assert.equal(account.status, 'REVOKED');
    assert.equal(account.massPermission, false);
    assert.equal((await firestore.getDoc(firestore.doc(db, path('administratorDeletionProtection/legacy')))).data().status, 'REVOKED');
    assert.equal((await firestore.getDoc(firestore.doc(db, path('participants/' + participantId)))).exists(), false);
  });
});

test('vice cannot delete a person linked to an active administrator and no data is suspended', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await firestore.setDoc(firestore.doc(db, path('admins/account')), {
      participantId, role: 'ADMIN', status: 'ACTIVE', email: 'private@example.test'
    });
    await firestore.setDoc(firestore.doc(db, path('administratorDeletionProtection/account')), {
      participantId, role: 'ADMIN', status: 'ACTIVE'
    });
  });
  const module = await loadDeletionModule();
  await assert.rejects(module.deleteAdminParticipant(participantId), error => error.deletionProtection === 'admin');
  await env.withSecurityRulesDisabled(async context => {
    assert.equal((await firestore.getDoc(firestore.doc(context.firestore(), path('participants/' + participantId)))).data().status, 'ACTIVE');
    assert.equal((await firestore.getDoc(firestore.doc(context.firestore(), path('reservationRules/rule_' + participantId)))).data().status, 'ACTIVE');
  });
  const db = env.authenticatedContext(viceUid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const protection = await firestore.getDoc(firestore.doc(db, path('administratorDeletionProtection/account')));
  assert.equal(protection.data().email, undefined);
  await assert.rejects(firestore.getDoc(firestore.doc(db, path('admins/account'))), error => error.code === 'permission-denied');
  await assert.rejects(firestore.setDoc(protection.ref, { participantId: '', role: 'ADMIN', status: 'REVOKED', updatedAt: firestore.serverTimestamp() }), error => error.code === 'permission-denied');
});

test('owner person is blocked before suspension even before index initialization', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await firestore.updateDoc(firestore.doc(context.firestore(), path()), { administratorParticipantId: participantId });
    await firestore.deleteDoc(firestore.doc(context.firestore(), path('participantMetadata/administratorProtection')));
  });
  const module = await loadDeletionModule();
  await assert.rejects(module.deleteAdminParticipant(participantId), error => error.deletionProtection === 'owner');
});

test('revoked administrator no longer prevents ordinary person deletion', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await firestore.setDoc(firestore.doc(context.firestore(), path('administratorDeletionProtection/account')), {
      participantId, role: 'ADMIN', status: 'REVOKED'
    });
  });
  await (await loadDeletionModule()).deleteAdminParticipant(participantId);
  await env.withSecurityRulesDisabled(async context => {
    assert.equal((await firestore.getDoc(firestore.doc(context.firestore(), path('participants/' + participantId)))).exists(), false);
  });
});

test('the actual vice deletion cleans over 400 documents and preserves unrelated people', async () => {
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
    assert.equal(audit.size, 2);
    assert.deepEqual(audit.docs.map(item => item.data().action).sort(), ['DELETE_PARTICIPANT', 'UPSERT_PARTICIPANT']);
    assert.ok(audit.docs.every(item => item.data().targetId === participantId));
    assert.equal((await firestore.getDoc(firestore.doc(db, path('participantMetadata/current')))).exists(), true);
  });
});

test('a failed final transaction preserves reservations and allows deletion to be retried', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await firestore.setDoc(firestore.doc(context.firestore(), path('reservationOverrides/keep')), {
      centerId, participantId, source: 'PERSONAL'
    });
  });
  let calls = 0;
  const module = await loadDeletionModule({
    runTransaction: (db, callback) => firestore.runTransaction(db, async transaction => {
      const result = await callback(transaction);
      if (++calls === 2) throw new Error('synthetic commit failure');
      return result;
    })
  });
  await assert.rejects(module.deleteAdminParticipant(participantId), /synthetic commit failure/);
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    assert.equal((await firestore.getDoc(firestore.doc(db, path('reservationOverrides/keep')))).exists(), true);
    assert.equal((await firestore.getDoc(firestore.doc(db, path('participants/' + participantId)))).data().status, 'DISABLED');
    assert.equal((await firestore.getDoc(firestore.doc(db, path('accessSessions/session_' + participantId)))).exists(), true);
  });
  const retry = await loadDeletionModule();
  await retry.deleteAdminParticipant(participantId);
});

test('a stale revision cannot disable or delete a participant', async () => {
  const module = await loadDeletionModule();
  await assert.rejects(module.deleteAdminParticipant(participantId, 9), error => error.code === 'aborted');
  await env.withSecurityRulesDisabled(async context => {
    const snapshot = await firestore.getDoc(firestore.doc(context.firestore(), path('participants/' + participantId)));
    assert.equal(snapshot.data().status, 'ACTIVE');
  });
});

test('oversized deletion cleans related documents in guarded chunks', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const batch = firestore.writeBatch(db);
    for (let index = 0; index < 491; index++) {
      batch.set(firestore.doc(db, path('reservationOverrides/large_' + index)), { centerId, participantId });
    }
    await batch.commit();
  });
  const module = await loadDeletionModule();
  await module.deleteAdminParticipant(participantId);
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    assert.equal((await firestore.getDocs(firestore.collection(db, path('reservationOverrides')))).size, 0);
    const person = await firestore.getDoc(firestore.doc(db, path('participants/' + participantId)));
    assert.equal(person.exists(), false);
    assert.equal((await firestore.getDoc(firestore.doc(db, path('participantMetadata/current')))).exists(), true);
    const audit = await firestore.getDocs(firestore.collection(db, path('viceAuditEvents')));
    assert.ok(audit.docs.some(item => item.data().targetId === participantId
      && item.data().action === 'UPSERT_PARTICIPANT'));
  });
});

test('interrupted chunk cleanup keeps token references discoverable and retry removes every credential', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (let start = 0; start < 520; start += 200) {
      const batch = firestore.writeBatch(db);
      for (let i = start; i < Math.min(start + 200, 520); i++) {
        batch.set(firestore.doc(db, path('accessSessions/large_session_' + i)), {
          centerId, participantId, scope: 'PERSONAL', tokenId: 'large_token_' + i,
          status: 'ACTIVE', expiresAt: new Date('2099-01-01')
        });
        batch.set(firestore.doc(db, path('linkTokens/large_token_' + i)), {
          participantId, scope: 'PERSONAL', status: 'ACTIVE', expiresAt: new Date('2099-01-01')
        });
      }
      await batch.commit();
    }
  });
  let calls = 0;
  const module = await loadDeletionModule({
    runTransaction: (db, callback) => firestore.runTransaction(db, async transaction => {
      await callback(transaction);
      if (++calls === 4) throw new Error('interrupted after two chunks');
    })
  });
  await assert.rejects(module.deleteAdminParticipant(participantId), /interrupted/);
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const tokens = await firestore.getDocs(firestore.collection(db, path('linkTokens')));
    const sessions = await firestore.getDocs(firestore.collection(db, path('accessSessions')));
    const referenced = new Set(sessions.docs.map(doc => doc.data().tokenId));
    for (const token of tokens.docs.filter(doc => doc.data().participantId === participantId)) {
      assert.ok(referenced.has(token.id), 'no orphan token after interruption');
    }
  });
  await (await loadDeletionModule()).deleteAdminParticipant(participantId);
  await env.withSecurityRulesDisabled(async context => {
    const tokens = await firestore.getDocs(firestore.collection(context.firestore(), path('linkTokens')));
    assert.equal(tokens.docs.filter(doc => doc.data().participantId === participantId).length, 0);
  });
});

test('the actual vice deletion cannot disable or delete a vice or administrator', async () => {
  const module = await loadDeletionModule();
  for (const id of ['vice_person', 'administrator']) {
    await assert.rejects(module.deleteAdminParticipant(id), error => id === 'administrator'
      ? error.deletionProtection === 'owner' : error.code === 'permission-denied');
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
