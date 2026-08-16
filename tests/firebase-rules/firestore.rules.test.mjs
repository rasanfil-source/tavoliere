import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const PROJECT_ID = 'demo-tavola-comune-rules';
const CENTER_ID = 'center_demo';
const PUBLIC_UID = 'anon_public';
const PERSONAL_UID = 'anon_mario';
const KITCHEN_UID = 'anon_kitchen';
const ADMIN_UID = 'admin_owner';
const CENTER_ADMIN_UID = 'admin_secondary';
const VICE_ADMIN_UID = 'admin_vice';
const BOOTSTRAP_OWNER_UID = 'kWYvLr1fkKVuhZ8I8HrVivN2ra03';
const INVITATION_ID = 'a'.repeat(64);
const MARIO_ID = 'participant_mario';
const LUCA_ID = 'participant_luca';
const OPEN_WINDOW_ID = '2026-08-05_lunch';
const CLOSED_WINDOW_ID = '2026-08-04_lunch';
const RULES_PATH = new URL('../../prototypes/firebase-spark-pwa/firestore.rules', import.meta.url);

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile(RULES_PATH, 'utf8')
    }
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedBaseData();
});

test('anonymous users cannot read center data', async () => {
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(db.doc(centerPath()).get());
});

test('registered admin can update center and manage admin docs', async () => {
  const db = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();

  await assertSucceeds(db.doc(adminPath(ADMIN_UID)).get());
  await assertSucceeds(db.doc(centerPath()).set({
    name: 'Tavola Comune Demo',
    timezone: 'Europe/Rome',
    locale: 'it-IT',
    status: 'ACTIVE',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertSucceeds(db.doc(adminPath('second_admin')).set({
    status: 'ACTIVE',
    email: 'second@example.test',
    role: 'MANAGER',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('il responsabile revoca un amministratore e le regole lo bloccano subito', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const revokedDb = testEnv.authenticatedContext(CENTER_ADMIN_UID, adminToken()).firestore();
  const batch = ownerDb.batch();
  batch.set(ownerDb.doc(adminPath(CENTER_ADMIN_UID)), {
    status: 'REVOKED',
    revokedBy: ADMIN_UID,
    revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(ownerDb.doc(`${centerPath()}/auditEvents/event_admin_revoked`), {
    centerId: CENTER_ID,
    actorUid: ADMIN_UID,
    action: 'REVOKE_ADMIN',
    targetType: 'ADMIN',
    targetId: CENTER_ADMIN_UID,
    summary: 'Accesso amministratore revocato',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await assertSucceeds(batch.commit());
  await assertFails(revokedDb.doc(centerPath()).get());
});

test('un amministratore non puo leggere o modificare un altro centro', async () => {
  const otherCenterId = 'center_altro';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`centers/${otherCenterId}`).set({
      ownerUid: 'other_admin',
      name: 'Altro centro',
      timezone: 'Europe/Rome',
      status: 'ACTIVE'
    });
    await db.doc(`centers/${otherCenterId}/admins/other_admin`).set({
      status: 'ACTIVE',
      role: 'OWNER'
    });
  });

  const db = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertFails(db.doc(`centers/${otherCenterId}`).get());
  await assertFails(db.doc(`centers/${otherCenterId}/participants/participant_intruso`).set({
    displayName: 'Intruso',
    status: 'ACTIVE'
  }));
});

test('bootstrap owner can create a new center and its first owner document', async () => {
  const db = testEnv.authenticatedContext(BOOTSTRAP_OWNER_UID).firestore();
  const centerId = 'center_new';
  await assertSucceeds(db.doc(`centers/${centerId}`).set({
    ownerUid: BOOTSTRAP_OWNER_UID,
    name: 'Nuovo centro',
    timezone: 'Europe/Rome',
    ...initialAdministratorProfile({ passwordRequired: false, email: 'owner@example.test' }),
    status: 'ACTIVE',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(db.doc(`centers/${centerId}/admins/${BOOTSTRAP_OWNER_UID}`).set({
    status: 'ACTIVE',
    role: 'OWNER'
  }));
});

test('il proprietario della piattaforma genera un invito per un nuovo centro', async () => {
  const db = testEnv.authenticatedContext(BOOTSTRAP_OWNER_UID, adminToken()).firestore();
  await assertSucceeds(db.doc(`centerInvitations/${INVITATION_ID}`).set({
    status: 'ACTIVE',
    createdBy: BOOTSTRAP_OWNER_UID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('un nuovo amministratore con email e invito inizializza il proprio centro in un solo batch', async () => {
  const uid = 'fresh_admin';
  const centerId = `center_${uid}`;
  await seedInvitation(INVITATION_ID);
  const db = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  const batch = db.batch();
  batch.set(db.doc(`centerInvitations/${INVITATION_ID}`), {
    status: 'USED',
    consumedBy: uid,
    centerId,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.doc(`centers/${centerId}`), {
    ownerUid: uid,
    invitationId: INVITATION_ID,
    name: 'Centro nuovo',
    timezone: 'Europe/Rome',
    ...initialAdministratorProfile(),
    status: 'ACTIVE',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.doc(`centers/${centerId}/admins/${uid}`), {
    centerId,
    status: 'ACTIVE',
    role: 'OWNER'
  });
  batch.set(db.doc(`adminProfiles/${uid}`), {
    centerId,
    status: 'ACTIVE',
    role: 'OWNER'
  });

  await assertSucceeds(batch.commit());
  await assertSucceeds(db.doc(`adminProfiles/${uid}`).get());
});

test('un nuovo centro con accesso email non salva la password amministratore in Firestore', async () => {
  const uid = 'fresh_email_admin';
  const centerId = `center_${uid}`;
  await seedInvitation(INVITATION_ID);
  const db = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  const batch = db.batch();
  batch.set(db.doc(`centerInvitations/${INVITATION_ID}`), {
    status: 'USED',
    consumedBy: uid,
    centerId,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.doc(`centers/${centerId}`), {
    ownerUid: uid,
    invitationId: INVITATION_ID,
    name: 'Centro con accesso email',
    timezone: 'Europe/Rome',
    ...initialAdministratorProfile(),
    status: 'ACTIVE',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await assertSucceeds(batch.commit());
});

test('un profilo amministratore con centro precedente eliminato puo inizializzare un nuovo centro', async () => {
  const uid = 'legacy_admin';
  const centerId = `center_${uid}`;
  await seedInvitation(INVITATION_ID);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`adminProfiles/${uid}`).set({
      centerId: 'center_obsoleto_eliminato',
      participantId: 'persona_storica',
      invitationId: 'invito_storico',
      status: 'ACTIVE',
      email: 'legacy@example.test',
      role: 'OWNER',
      massPermission: true,
      dailyOperationsPermission: true
    });
  });
  const db = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  const batch = db.batch();
  batch.set(db.doc(`centerInvitations/${INVITATION_ID}`), {
    status: 'USED',
    consumedBy: uid,
    centerId,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.doc(`centers/${centerId}`), {
    ownerUid: uid,
    invitationId: INVITATION_ID,
    name: 'Centro legacy recuperato',
    timezone: 'Europe/Rome',
    locale: 'it-IT',
    reservationCutoffs: {
      lunch: '09:30',
      dinner: '15:00',
      nextDayBreakfast: '15:00'
    },
    participantContactSharingEnabled: false,
    participantDataUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...initialAdministratorProfile({ email: 'legacy@example.test' }),
    status: 'ACTIVE',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.doc(`centers/${centerId}/admins/${uid}`), {
    centerId,
    status: 'ACTIVE',
    email: 'legacy@example.test',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.doc(`adminProfiles/${uid}`), {
    centerId,
    status: 'ACTIVE',
    email: 'legacy@example.test',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await assertSucceeds(batch.commit());
});

test('un profilo amministratore disabilitato puo essere assegnato a un nuovo centro di cui diventa responsabile', async () => {
  const uid = 'inactive_admin';
  const invitationId = 'c'.repeat(64);
  const centerId = `center_${uid}_${invitationId.slice(0, 16)}`;
  await seedInvitation(invitationId);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`adminProfiles/${uid}`).set({
      centerId: 'center_archiviato',
      status: 'DISABLED',
      email: 'inactive@example.test',
      role: 'OWNER',
      massPermission: true,
      dailyOperationsPermission: true
    });
  });
  const db = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  const batch = db.batch();
  batch.set(db.doc(`centerInvitations/${invitationId}`), {
    status: 'USED',
    consumedBy: uid,
    centerId,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.doc(`centers/${centerId}`), {
    ownerUid: uid,
    invitationId,
    name: 'Centro riattivato',
    timezone: 'Europe/Rome',
    locale: 'it-IT',
    reservationCutoffs: {
      lunch: '09:30',
      dinner: '15:00',
      nextDayBreakfast: '15:00'
    },
    participantContactSharingEnabled: false,
    participantDataUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...initialAdministratorProfile({ email: 'inactive@example.test' }),
    status: 'ACTIVE',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.doc(`centers/${centerId}/admins/${uid}`), {
    centerId,
    status: 'ACTIVE',
    email: 'inactive@example.test',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.doc(`adminProfiles/${uid}`), {
    centerId,
    status: 'ACTIVE',
    email: 'inactive@example.test',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await assertSucceeds(batch.commit());
});

test('un indirizzo email non verificato non puo consumare l invito del centro', async () => {
  const uid = 'director_unverified';
  const centerId = `center_${uid}`;
  await seedInvitation(INVITATION_ID);
  const db = testEnv.authenticatedContext(uid, unverifiedEmailAdminToken()).firestore();
  const batch = db.batch();
  batch.set(db.doc(`centerInvitations/${INVITATION_ID}`), {
    status: 'USED',
    consumedBy: uid,
    centerId,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.doc(`centers/${centerId}`), {
    ownerUid: uid,
    invitationId: INVITATION_ID,
    name: 'Centro non verificato',
    timezone: 'Europe/Rome',
    status: 'ACTIVE'
  });
  await assertFails(batch.commit());
});

test('un residente invitato e autenticato diventa vice soltanto nel proprio centro', async () => {
  const invitationId = 'b'.repeat(64);
  const uid = 'new_vice';
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await ownerDb.doc(publicParticipantPath(MARIO_ID)).set({ viceAdminRole: true }, { merge: true });
  await assertSucceeds(ownerDb.doc(`adminInvitations/${invitationId}`).set({
    centerId: CENTER_ID,
    participantId: MARIO_ID,
    role: 'MANAGER',
    status: 'ACTIVE',
    createdBy: ADMIN_UID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));

  const viceDb = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  const createViceClaimAttempt = (extraAdminData = {}) => {
    const attempt = viceDb.batch();
    attempt.set(viceDb.doc(`adminInvitations/${invitationId}`), {
      status: 'USED',
      consumedBy: uid,
      consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    attempt.set(viceDb.doc(adminPath(uid)), {
      centerId: CENTER_ID,
      participantId: MARIO_ID,
      invitationId,
      status: 'ACTIVE',
      email: 'vice.nuovo@example.test',
      role: 'MANAGER',
      massPermission: false,
      dailyOperationsPermission: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...extraAdminData
    });
    return attempt;
  };
  await assertFails(createViceClaimAttempt({ massPermission: true }).commit());
  await assertFails(createViceClaimAttempt({ dailyOperationsPermission: false }).commit());
  await assertFails(createViceClaimAttempt({ platformOwner: true }).commit());

  const batch = viceDb.batch();
  batch.set(viceDb.doc(`adminInvitations/${invitationId}`), {
    status: 'USED',
    consumedBy: uid,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(viceDb.doc(adminPath(uid)), {
    centerId: CENTER_ID,
    participantId: MARIO_ID,
    invitationId,
    status: 'ACTIVE',
    email: 'vice.nuovo@example.test',
    role: 'MANAGER',
    massPermission: false,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(viceDb.doc(`adminProfiles/${uid}`), {
    centerId: CENTER_ID,
    participantId: MARIO_ID,
    status: 'ACTIVE',
    email: 'vice.nuovo@example.test',
    role: 'MANAGER',
    massPermission: false,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await assertSucceeds(batch.commit());
  await assertFails(viceDb.doc(adminPath('another_vice')).set({
    status: 'ACTIVE',
    role: 'MANAGER'
  }));
});

test('il responsabile invita un amministratore associandolo alla Persona scelta', async () => {
  const invitationId = 'c'.repeat(64);
  const uid = 'new_center_admin';
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertSucceeds(ownerDb.doc(`adminInvitations/${invitationId}`).set({
    centerId: CENTER_ID,
    participantId: MARIO_ID,
    role: 'ADMIN',
    status: 'ACTIVE',
    createdBy: ADMIN_UID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));

  const invitedDb = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  const batch = invitedDb.batch();
  batch.set(invitedDb.doc(`adminInvitations/${invitationId}`), {
    status: 'USED',
    consumedBy: uid,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(invitedDb.doc(adminPath(uid)), {
    centerId: CENTER_ID,
    participantId: MARIO_ID,
    invitationId,
    status: 'ACTIVE',
    email: 'nuovo.admin@example.test',
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    administratorPasswordRequired: true,
    passwordSetupRequired: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(invitedDb.doc(`adminProfiles/${uid}`), {
    centerId: CENTER_ID,
    participantId: MARIO_ID,
    status: 'ACTIVE',
    email: 'nuovo.admin@example.test',
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await assertSucceeds(batch.commit());

  await assertSucceeds(invitedDb.doc(adminPath(uid)).update({
    passwordSetupRequired: false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('il candidato può rifiutare l invito senza diventare amministratore', async () => {
  const invitationId = '9'.repeat(64);
  const uid = 'declining_center_admin';
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertSucceeds(ownerDb.doc(`adminInvitations/${invitationId}`).set({
    centerId: CENTER_ID,
    participantId: MARIO_ID,
    role: 'ADMIN',
    status: 'ACTIVE',
    createdBy: ADMIN_UID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));

  const invitedDb = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  await assertSucceeds(invitedDb.doc(`adminInvitations/${invitationId}`).set({
    status: 'REJECTED',
    rejectedBy: uid,
    rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertFails(invitedDb.doc(adminPath(uid)).get());
});

test('un profilo di un centro precedente accetta un nuovo invito amministratore', async () => {
  const invitationId = 'd'.repeat(64);
  const uid = 'returning_center_admin';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`adminProfiles/${uid}`).set({
      centerId: 'center_eliminato',
      participantId: 'participant_storico',
      status: 'ACTIVE',
      email: 'amministratore.ritorno@example.test',
      role: 'OWNER',
      massPermission: true,
      dailyOperationsPermission: true
    });
  });

  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertSucceeds(ownerDb.doc(`adminInvitations/${invitationId}`).set({
    centerId: CENTER_ID,
    participantId: '',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdBy: ADMIN_UID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));

  const invitedDb = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  const batch = invitedDb.batch();
  batch.set(invitedDb.doc(`adminInvitations/${invitationId}`), {
    status: 'USED',
    consumedBy: uid,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(invitedDb.doc(adminPath(uid)), {
    centerId: CENTER_ID,
    participantId: '',
    invitationId,
    status: 'ACTIVE',
    email: 'amministratore.ritorno@example.test',
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    administratorPasswordRequired: true,
    passwordSetupRequired: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(invitedDb.doc(`adminProfiles/${uid}`), {
    centerId: CENTER_ID,
    participantId: '',
    status: 'ACTIVE',
    email: 'amministratore.ritorno@example.test',
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await assertSucceeds(batch.commit());
});

test('un amministratore può accettare un nuovo centro senza perdere quello già attivo', async () => {
  const invitationId = 'e'.repeat(64);
  const uid = 'active_center_admin';
  const previousCenterId = 'center_ancora_attivo';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`centers/${previousCenterId}`).set({
      name: 'Centro ancora attivo',
      status: 'ACTIVE'
    });
    await db.doc(`adminProfiles/${uid}`).set({
      centerId: previousCenterId,
      participantId: '',
      status: 'ACTIVE',
      email: 'amministratore.attivo@example.test',
      role: 'ADMIN',
      massPermission: true,
      dailyOperationsPermission: true
    });
    await db.doc(`centers/${previousCenterId}/admins/${uid}`).set({
      centerId: previousCenterId,
      status: 'ACTIVE',
      email: 'amministratore.attivo@example.test',
      role: 'ADMIN',
      massPermission: true,
      dailyOperationsPermission: true
    });
  });

  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertSucceeds(ownerDb.doc(`adminInvitations/${invitationId}`).set({
    centerId: CENTER_ID,
    participantId: '',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdBy: ADMIN_UID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));

  const invitedDb = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  const batch = invitedDb.batch();
  batch.set(invitedDb.doc(`adminInvitations/${invitationId}`), {
    status: 'USED',
    consumedBy: uid,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(invitedDb.doc(adminPath(uid)), {
    centerId: CENTER_ID,
    participantId: '',
    invitationId,
    status: 'ACTIVE',
    email: 'amministratore.attivo@example.test',
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    administratorPasswordRequired: true,
    passwordSetupRequired: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(invitedDb.doc(`adminProfiles/${uid}`), {
    centerId: CENTER_ID,
    participantId: '',
    status: 'ACTIVE',
    email: 'amministratore.attivo@example.test',
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await assertSucceeds(batch.commit());

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const previousMembership = (await db.doc(`centers/${previousCenterId}/admins/${uid}`).get()).data();
    const profile = (await db.doc(`adminProfiles/${uid}`).get()).data();
    if (previousMembership.status !== 'ACTIVE' || profile.centerId !== CENTER_ID) {
      throw new Error('Il nuovo invito non ha conservato la membership precedente');
    }
  });
});

test('la responsabilita passa atomicamente a un amministratore attivo', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(adminPath(CENTER_ADMIN_UID)).set({ participantId: LUCA_ID }, { merge: true });
    await db.doc(`adminProfiles/${CENTER_ADMIN_UID}`).set({
      centerId: CENTER_ID,
      status: 'ACTIVE',
      role: 'ADMIN'
    });
  });
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertFails(ownerDb.doc(centerPath()).set({
    ownerUid: CENTER_ADMIN_UID,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));

  const batch = ownerDb.batch();
  batch.set(ownerDb.doc(centerPath()), {
    ownerUid: CENTER_ADMIN_UID,
    administratorName: 'Luca',
    administratorSignature: 'LU',
    adminEmail: 'admin@example.test',
    administratorPasswordRequired: false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(ownerDb.doc(adminPath(ADMIN_UID)), {
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(ownerDb.doc(adminPath(CENTER_ADMIN_UID)), {
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(ownerDb.doc(`adminProfiles/${CENTER_ADMIN_UID}`), {
    status: 'ACTIVE',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  await assertSucceeds(batch.commit());

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const center = (await db.doc(centerPath()).get()).data();
    const previousOwner = (await db.doc(adminPath(ADMIN_UID)).get()).data();
    const nextOwner = (await db.doc(adminPath(CENTER_ADMIN_UID)).get()).data();
    if (center.ownerUid !== CENTER_ADMIN_UID
        || center.administratorName !== 'Luca'
        || center.administratorSignature !== 'LU'
        || center.adminEmail !== 'admin@example.test'
        || center.administratorPasswordRequired !== false
        || previousOwner.role !== 'ADMIN'
        || nextOwner.role !== 'OWNER') {
      throw new Error('Il trasferimento non ha mantenuto coerenti centro e ruoli');
    }
  });
});

test('il precedente responsabile può revocarsi nella stessa transazione di successione', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`adminProfiles/${ADMIN_UID}`).set({
      centerId: CENTER_ID,
      status: 'ACTIVE',
      role: 'OWNER'
    });
    await db.doc(`adminProfiles/${CENTER_ADMIN_UID}`).set({
      centerId: CENTER_ID,
      status: 'ACTIVE',
      role: 'ADMIN'
    });
  });
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const batch = ownerDb.batch();
  batch.set(ownerDb.doc(centerPath()), {
    ownerUid: CENTER_ADMIN_UID,
    administratorName: 'Luca',
    administratorSignature: 'LU',
    adminEmail: 'admin@example.test',
    administratorPasswordRequired: false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(ownerDb.doc(adminPath(ADMIN_UID)), {
    status: 'REVOKED',
    role: 'ADMIN',
    massPermission: false,
    dailyOperationsPermission: false,
    revokedBy: ADMIN_UID,
    revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(ownerDb.doc(adminPath(CENTER_ADMIN_UID)), {
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(ownerDb.doc(`adminProfiles/${CENTER_ADMIN_UID}`), {
    status: 'ACTIVE',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  await assertSucceeds(batch.commit());

  const previousOwnerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const nextOwnerDb = testEnv.authenticatedContext(CENTER_ADMIN_UID, adminToken()).firestore();
  await assertFails(previousOwnerDb.doc(centerPath()).get());
  await assertFails(previousOwnerDb.doc(centerPath()).set({
    name: 'Modifica non autorizzata',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertSucceeds(nextOwnerDb.doc(centerPath()).set({
    name: 'Modifica del nuovo responsabile',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const oldMembership = (await db.doc(adminPath(ADMIN_UID)).get()).data();
    const nextMembership = (await db.doc(adminPath(CENTER_ADMIN_UID)).get()).data();
    const center = (await db.doc(centerPath()).get()).data();
    if (oldMembership.status !== 'REVOKED'
        || oldMembership.massPermission !== false
        || oldMembership.dailyOperationsPermission !== false
        || nextMembership.role !== 'OWNER'
        || center.ownerUid !== CENTER_ADMIN_UID) {
      throw new Error('Il precedente responsabile conserva ancora accesso al centro');
    }
  });
});

test('il registro attivita e consultabile dai responsabili e resta immutabile', async () => {
  const eventPath = `${centerPath()}/auditEvents/event_profile_update`;
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const viceDb = testEnv.authenticatedContext(VICE_ADMIN_UID, adminToken()).firestore();
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();

  await assertSucceeds(viceDb.doc(eventPath).set({
    centerId: CENTER_ID,
    actorUid: VICE_ADMIN_UID,
    action: 'UPSERT_PARTICIPANT',
    targetType: 'PARTICIPANT',
    targetId: MARIO_ID,
    summary: 'Anagrafica aggiornata: Mario',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }));

  await assertSucceeds(ownerDb.doc(eventPath).get());
  await assertFails(viceDb.doc(eventPath).get());
  await assertFails(publicDb.doc(eventPath).get());
  await assertFails(ownerDb.doc(eventPath).update({ summary: 'Testo modificato' }));
  await assertFails(ownerDb.doc(eventPath).delete());
});

test('il registro rifiuta eventi con autore o struttura non coerenti', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertFails(ownerDb.doc(`${centerPath()}/auditEvents/event_wrong_actor`).set({
    centerId: CENTER_ID,
    actorUid: CENTER_ADMIN_UID,
    action: 'UPSERT_PARTICIPANT',
    targetType: 'PARTICIPANT',
    targetId: MARIO_ID,
    summary: 'Anagrafica aggiornata',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertFails(ownerDb.doc(`${centerPath()}/auditEvents/event_extra_field`).set({
    centerId: CENTER_ID,
    actorUid: ADMIN_UID,
    action: 'UPSERT_PARTICIPANT',
    targetType: 'PARTICIPANT',
    targetId: MARIO_ID,
    summary: 'Anagrafica aggiornata',
    details: 'Campo non previsto',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('i collegamenti operativi sono privati e si rigenerano in modo coordinato', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const adminDb = testEnv.authenticatedContext(CENTER_ADMIN_UID, adminToken()).firestore();
  const viceDb = testEnv.authenticatedContext(VICE_ADMIN_UID, adminToken()).firestore();
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();
  const settingsPath = `${centerPath()}/privateSettings/operationalLinks`;
  const previousTokenPath = linkTokenPath('public_token');
  const nextTokenPath = linkTokenPath('public_new_token');

  await assertSucceeds(ownerDb.doc(settingsPath).set({
    centerId: CENTER_ID,
    publicTokenId: 'public_token',
    kitchenTokenId: 'kitchen_token',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(adminDb.doc(settingsPath).get());
  await assertFails(viceDb.doc(settingsPath).get());
  await assertFails(publicDb.doc(settingsPath).get());
  await assertFails(ownerDb.doc(previousTokenPath).get());

  const batch = adminDb.batch();
  batch.set(adminDb.doc(nextTokenPath), {
    status: 'ACTIVE',
    scope: 'PUBLIC',
    targetType: 'CENTER',
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2050-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.update(adminDb.doc(previousTokenPath), {
    status: 'REVOKED',
    revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(adminDb.doc(settingsPath), {
    centerId: CENTER_ID,
    publicTokenId: 'public_new_token',
    kitchenTokenId: 'kitchen_token',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(adminDb.doc(`${centerPath()}/auditEvents/event_link_rotation`), {
    centerId: CENTER_ID,
    actorUid: CENTER_ADMIN_UID,
    action: 'ROTATE_OPERATIONAL_LINK',
    targetType: 'OPERATIONAL_LINK',
    targetId: 'PUBLIC',
    summary: 'Collegamento residenti e riepilogo rigenerato',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await assertSucceeds(batch.commit());

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const settings = (await db.doc(settingsPath).get()).data();
    const previousToken = (await db.doc(previousTokenPath).get()).data();
    if (settings.publicTokenId !== 'public_new_token' || previousToken.status !== 'REVOKED') {
      throw new Error('La rotazione non ha sostituito il collegamento in modo coerente');
    }
  });
});

test('gli inviti amministrativi mostrano il ciclo di vita e rispettano la gerarchia', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const adminDb = testEnv.authenticatedContext(CENTER_ADMIN_UID, adminToken()).firestore();
  const viceDb = testEnv.authenticatedContext(VICE_ADMIN_UID, adminToken()).firestore();
  const adminInvitationId = 'c'.repeat(64);
  const viceInvitationId = 'd'.repeat(64);
  const expiresAt = firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z'));

  await assertSucceeds(ownerDb.doc(publicParticipantPath(MARIO_ID)).set({
    viceAdminRole: true
  }, { merge: true }));
  await assertSucceeds(ownerDb.doc(`adminInvitations/${adminInvitationId}`).set({
    centerId: CENTER_ID,
    participantId: '',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdBy: ADMIN_UID,
    expiresAt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(adminDb.doc(`adminInvitations/${viceInvitationId}`).set({
    centerId: CENTER_ID,
    participantId: MARIO_ID,
    role: 'MANAGER',
    status: 'ACTIVE',
    createdBy: CENTER_ADMIN_UID,
    expiresAt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(adminDb.collection('adminInvitations').where('centerId', '==', CENTER_ID).get());
  await assertFails(viceDb.collection('adminInvitations').where('centerId', '==', CENTER_ID).get());
  await assertFails(adminDb.doc(`adminInvitations/${adminInvitationId}`).set({
    status: 'REVOKED',
    revokedBy: CENTER_ADMIN_UID,
    revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertSucceeds(adminDb.doc(`adminInvitations/${viceInvitationId}`).set({
    status: 'REVOKED',
    revokedBy: CENTER_ADMIN_UID,
    revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertSucceeds(ownerDb.doc(`adminInvitations/${adminInvitationId}`).set({
    status: 'REVOKED',
    revokedBy: ADMIN_UID,
    revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
});

test('la riconfigurazione del calendario e privata riprendibile e conserva lo stato dei pasti', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const viceDb = testEnv.authenticatedContext(VICE_ADMIN_UID, adminToken()).firestore();
  const jobPath = `${centerPath()}/privateSettings/calendarReconfiguration`;
  const activeJob = {
    centerId: CENTER_ID,
    operationId: 'calendar_job_20260810',
    status: 'ACTIVE',
    targetName: 'Centro Demo',
    targetTimezone: 'Europe/Rome',
    targetCutoffs: {
      lunch: '09:15',
      dinner: '14:45',
      nextDayBreakfast: '14:45'
    },
    startDate: '2026-08-04',
    through: '2026-08-03',
    targetThrough: '2026-08-05',
    completedAt: null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await assertFails(viceDb.doc(jobPath).set(activeJob));
  await assertSucceeds(ownerDb.doc(jobPath).set(activeJob));
  await assertFails(viceDb.doc(jobPath).get());

  const newDeadline = firebase.firestore.Timestamp.fromDate(new Date('2026-08-04T07:15:00Z'));
  const progressBatch = ownerDb.batch();
  progressBatch.update(ownerDb.doc(mealWindowPath(CLOSED_WINDOW_ID)), {
    closesAt: newDeadline,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  progressBatch.set(ownerDb.doc(jobPath), {
    ...activeJob,
    through: '2026-08-04',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await assertSucceeds(progressBatch.commit());
  const closedWindow = await ownerDb.doc(mealWindowPath(CLOSED_WINDOW_ID)).get();
  if (closedWindow.data().status !== 'CLOSED') {
    throw new Error('La riconfigurazione ha modificato lo stato operativo del pasto');
  }

  await assertSucceeds(ownerDb.doc(jobPath).set({
    ...activeJob,
    status: 'COMPLETED',
    through: '2026-08-05',
    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('i vice gestiscono sempre ammalati diete e note cucina', async () => {
  const dateId = '2026-08-10';
  const path = `${centerPath()}/dailyHealth/${dateId}`;
  const viceDb = testEnv.authenticatedContext(VICE_ADMIN_UID, adminToken()).firestore();
  const dailyHealth = {
    centerId: CENTER_ID,
    dateId,
    sickPeople: [{ participantId: MARIO_ID, displayName: 'Mario', groupId: 'group_residenti' }],
    dietAssignments: [{ participantId: MARIO_ID, dietTag: 'BIANCO' }],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await assertSucceeds(viceDb.doc(path).set(dailyHealth));
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();
  await assertSucceeds(publicDb.doc(path).get());
  await assertFails(publicDb.doc(path).set({
    centerId: CENTER_ID,
    dateId,
    sickPeople: [],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('il vice autenticato come residente gestisce Agenda ma non le Messe', async () => {
  const dateId = '2026-08-10';
  const personalDb = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(publicParticipantPath(MARIO_ID)).set({ viceAdminRole: true }, { merge: true });
  });

  await assertSucceeds(personalDb.collection(`${centerPath()}/publicParticipants`).get());
  await assertSucceeds(personalDb.doc(`${centerPath()}/dailyHealth/${dateId}`).set({
    centerId: CENTER_ID,
    dateId,
    sickPeople: [{ participantId: LUCA_ID, displayName: 'Luca', groupId: 'group_residenti' }],
    dietAssignments: [],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(personalDb.doc(kitchenNotePath(dateId)).set({
    centerId: CENTER_ID,
    mealDate: dateId,
    text: 'Nota del vice dalla vista settimana',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertFails(personalDb.doc(dailyOperationPath(dateId)).set({
    centerId: CENTER_ID,
    dateId,
    massScheduled: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('il responsabile autenticato come residente gestisce Agenda e Messe', async () => {
  const dateId = '2026-08-10';
  const personalDb = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(centerPath()).set({ administratorSignature: 'MR' }, { merge: true });
    await db.doc(publicParticipantPath(MARIO_ID)).set({ signature: 'MR' }, { merge: true });
  });

  await assertSucceeds(personalDb.collection(`${centerPath()}/publicParticipants`).get());
  await assertSucceeds(personalDb.doc(`${centerPath()}/dailyHealth/${dateId}`).set({
    centerId: CENTER_ID,
    dateId,
    sickPeople: [],
    dietAssignments: [],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(personalDb.doc(kitchenNotePath(dateId)).set({
    centerId: CENTER_ID,
    mealDate: dateId,
    text: 'Nota del responsabile dalla vista settimana',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(personalDb.doc(dailyOperationPath(dateId)).set({
    centerId: CENTER_ID,
    dateId,
    massScheduled: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('il residente ordinario non puo aprire o modificare Agenda', async () => {
  const personalDb = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();
  await assertFails(personalDb.collection(`${centerPath()}/publicParticipants`).get());
  await assertFails(personalDb.doc(`${centerPath()}/dailyHealth/2026-08-10`).set({
    centerId: CENTER_ID,
    dateId: '2026-08-10',
    sickPeople: [],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('il vice gestisce le persone ma non configurazione ruoli o eliminazioni definitive', async () => {
  const viceDb = testEnv.authenticatedContext(VICE_ADMIN_UID, adminToken()).firestore();

  await assertSucceeds(viceDb.doc(privateParticipantPath(MARIO_ID)).set({
    dietTags: ['2']
  }, { merge: true }));
  await assertSucceeds(viceDb.doc(publicParticipantPath(MARIO_ID)).set({
    dietTags: ['2']
  }, { merge: true }));
  await assertFails(viceDb.doc(centerPath()).set({
    name: 'Nome non autorizzato'
  }, { merge: true }));
  await assertFails(viceDb.doc(publicParticipantPath(MARIO_ID)).set({
    liturgicalRole: true
  }, { merge: true }));
  await assertFails(viceDb.doc(privateParticipantPath(MARIO_ID)).delete());
  await assertFails(viceDb.doc(publicParticipantPath(MARIO_ID)).delete());
});

test('l amministratore eredita assegnazione liturgica e sospensione persone', async () => {
  const adminDb = testEnv.authenticatedContext(CENTER_ADMIN_UID, adminToken()).firestore();
  await assertSucceeds(adminDb.doc(privateParticipantPath(MARIO_ID)).set({
    liturgicalRole: true
  }, { merge: true }));
  await assertSucceeds(adminDb.doc(publicParticipantPath(MARIO_ID)).set({
    liturgicalRole: true
  }, { merge: true }));
  await adminDb.doc(privateParticipantPath(MARIO_ID)).set({ liturgicalRole: false }, { merge: true });
  await adminDb.doc(publicParticipantPath(MARIO_ID)).set({ liturgicalRole: false }, { merge: true });

  const participantId = 'participant_admin_suspend';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(privateParticipantPath(participantId)).set({
      displayName: 'Persona da sospendere',
      status: 'ACTIVE',
      revision: 1
    });
    await db.doc(publicParticipantPath(participantId)).set({
      displayName: 'Persona da sospendere',
      status: 'ACTIVE'
    });
    await db.doc(rulePath(participantId)).set({
      participantId,
      status: 'ACTIVE',
      mealTypeIds: ['breakfast', 'lunch', 'dinner'],
      startsOn: '2026-01-01',
      endsOn: null
    });
  });

  const batch = adminDb.batch();
  batch.set(adminDb.doc(centerPath()), {
    participantDataUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(adminDb.doc(privateParticipantPath(participantId)), {
    status: 'DISABLED',
    revision: 2,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(adminDb.doc(publicParticipantPath(participantId)), {
    status: 'DISABLED',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(adminDb.doc(rulePath(participantId)), {
    status: 'DISABLED',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(adminDb.doc(`${centerPath()}/auditEvents/event_admin_suspend`), {
    centerId: CENTER_ID,
    actorUid: CENTER_ADMIN_UID,
    action: 'UPSERT_PARTICIPANT',
    targetType: 'PARTICIPANT',
    targetId: participantId,
    summary: 'Persona sospesa',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await assertSucceeds(batch.commit());
});

test('il responsabile collega il proprio account alla Persona attiva', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertSucceeds(ownerDb.doc(adminPath(ADMIN_UID)).set({
    participantId: MARIO_ID,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
});

test('solo il responsabile gestisce gli amministratori e nessuno rimuove direttamente l owner', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const adminDb = testEnv.authenticatedContext(CENTER_ADMIN_UID, adminToken()).firestore();

  await assertSucceeds(ownerDb.doc(adminPath('new_admin')).set({
    centerId: CENTER_ID,
    status: 'ACTIVE',
    email: 'new.admin@example.test',
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertFails(adminDb.doc(adminPath('another_admin')).set({
    centerId: CENTER_ID,
    status: 'ACTIVE',
    email: 'another.admin@example.test',
    role: 'ADMIN',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertFails(adminDb.doc(adminPath(ADMIN_UID)).set({
    status: 'DISABLED',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertFails(ownerDb.doc(adminPath(ADMIN_UID)).delete());
  await assertSucceeds(adminDb.doc(centerPath()).set({
    name: 'Centro aggiornato',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertFails(adminDb.doc(centerPath()).set({
    ownerUid: CENTER_ADMIN_UID,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
});

test('un account senza invito non puo creare un nuovo centro', async () => {
  const uid = 'fresh_without_invite';
  const centerId = `center_${uid}`;
  const db = testEnv.authenticatedContext(uid, emailAdminToken()).firestore();
  await assertFails(db.doc(`centers/${centerId}`).set({
    ownerUid: uid,
    name: 'Centro senza invito',
    timezone: 'Europe/Rome',
    status: 'ACTIVE'
  }));
});

test('un invito gia consumato non puo essere riutilizzato', async () => {
  const firstUid = 'first_director';
  const secondUid = 'second_director';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`centerInvitations/${INVITATION_ID}`).set({
      status: 'USED',
      createdBy: BOOTSTRAP_OWNER_UID,
      consumedBy: firstUid,
      centerId: `center_${firstUid}`,
      expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
      createdAt: firebase.firestore.Timestamp.fromDate(new Date('2026-08-09T00:00:00Z')),
      consumedAt: firebase.firestore.Timestamp.fromDate(new Date('2026-08-09T01:00:00Z')),
      updatedAt: firebase.firestore.Timestamp.fromDate(new Date('2026-08-09T01:00:00Z'))
    });
  });
  const db = testEnv.authenticatedContext(secondUid, emailAdminToken()).firestore();
  const centerId = `center_${secondUid}`;
  const batch = db.batch();
  batch.set(db.doc(`centerInvitations/${INVITATION_ID}`), {
    status: 'USED',
    consumedBy: secondUid,
    centerId,
    consumedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.doc(`centers/${centerId}`), {
    ownerUid: secondUid,
    invitationId: INVITATION_ID,
    name: 'Secondo centro',
    timezone: 'Europe/Rome',
    status: 'ACTIVE'
  });
  await assertFails(batch.commit());
});

test('un amministratore non puo inizializzare un centro con identificativo altrui', async () => {
  const uid = 'fresh_admin';
  const db = testEnv.authenticatedContext(uid, adminToken()).firestore();

  await assertFails(db.doc('centers/center_altro').set({
    ownerUid: uid,
    name: 'Centro non valido',
    timezone: 'Europe/Rome',
    status: 'ACTIVE'
  }));
});

test('non-admin users cannot claim admin docs', async () => {
  const db = testEnv.authenticatedContext('other_user', adminToken()).firestore();

  await assertFails(db.doc(adminPath('other_user')).set({
    status: 'ACTIVE',
    email: 'other@example.test',
    role: 'OWNER',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('public session can read public participants but not private participant records', async () => {
  const db = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();

  await assertSucceeds(db.doc(publicParticipantPath(MARIO_ID)).get());
  await assertFails(db.doc(privateParticipantPath(MARIO_ID)).get());
});

test('una sessione gia aperta perde accesso quando il token viene revocato', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();
  await assertSucceeds(publicDb.doc(publicParticipantPath(MARIO_ID)).get());
  await assertSucceeds(ownerDb.doc(linkTokenPath('public_token')).set({
    status: 'REVOKED',
    revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertFails(publicDb.doc(publicParticipantPath(MARIO_ID)).get());
});

test('il riepilogo legge i contatti consentiti senza esporli alla cucina', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(centerPath()).set({
      participantContactSharingEnabled: true
    }, { merge: true });
  });
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();
  const kitchenDb = testEnv.authenticatedContext(KITCHEN_UID, anonymousToken()).firestore();

  await assertSucceeds(publicDb.doc(privateParticipantPath(MARIO_ID)).get());
  await assertSucceeds(publicDb.collection(`centers/${CENTER_ID}/participants`).get());
  await assertFails(kitchenDb.doc(privateParticipantPath(MARIO_ID)).get());
});

test('public session can read nominative meal summary sources', async () => {
  const db = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();

  await assertSucceeds(db.doc(rulePath(MARIO_ID)).get());
  await assertSucceeds(db.doc(overridePath(MARIO_ID, OPEN_WINDOW_ID)).get());
});

test('kitchen session can read overrides without participant names', async () => {
  const db = testEnv.authenticatedContext(KITCHEN_UID, anonymousToken()).firestore();

  await assertSucceeds(db.doc(overridePath(MARIO_ID, OPEN_WINDOW_ID)).get());
  await assertSucceeds(db.doc(rulePath(MARIO_ID)).get());
  await assertFails(db.doc(publicParticipantPath(MARIO_ID)).get());
  await assertFails(db.doc(privateParticipantPath(MARIO_ID)).get());
});

test('admin writes kitchen notes, kitchen reads them, and public sessions cannot', async () => {
  const adminDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const kitchenDb = testEnv.authenticatedContext(KITCHEN_UID, anonymousToken()).firestore();
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();
  const notePath = kitchenNotePath('2026-08-05');

  await assertSucceeds(adminDb.doc(notePath).set({
    centerId: CENTER_ID,
    mealDate: '2026-08-05',
    text: 'Pranzo alle 12:30',
    messages: [{ id: 'note-1', text: 'Pranzo alle 12:30', createdAt: '2026-08-05T09:00:00.000Z' }],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(kitchenDb.doc(notePath).get());
  await assertFails(publicDb.doc(notePath).get());
  await assertFails(kitchenDb.doc(notePath).set({
    centerId: CENTER_ID,
    mealDate: '2026-08-05',
    text: 'Modifica non autorizzata',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('admin sets the daily mass status and summary and kitchen sessions can read it', async () => {
  const adminDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const kitchenDb = testEnv.authenticatedContext(KITCHEN_UID, anonymousToken()).firestore();
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();
  const operationPath = dailyOperationPath('2026-08-06');

  await assertSucceeds(adminDb.doc(operationPath).set({
    centerId: CENTER_ID,
    dateId: '2026-08-06',
    massScheduled: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(kitchenDb.doc(operationPath).get());
  await assertSucceeds(publicDb.doc(operationPath).get());
  await assertFails(publicDb.doc(operationPath).set({
    centerId: CENTER_ID,
    dateId: '2026-08-06',
    massScheduled: false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('la Messa non puo essere modificata dopo la scadenza della cena', async () => {
  const adminDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const operationPath = dailyOperationPath('2026-08-04');

  await assertFails(adminDb.doc(operationPath).set({
    centerId: CENTER_ID,
    dateId: '2026-08-04',
    massScheduled: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('l amministratore salva atomicamente le Messe di una settimana aperta', async () => {
  const adminDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const batch = adminDb.batch();
  const dateIds = ['2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12'];

  dateIds.forEach((dateId) => {
    batch.set(adminDb.doc(dailyOperationPath(dateId)), {
      centerId: CENTER_ID,
      dateId,
      massScheduled: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  await assertSucceeds(batch.commit());
});

test('il vice amministratore gestisce la messa soltanto con autorizzazione esplicita', async () => {
  const ownerDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const viceDb = testEnv.authenticatedContext(VICE_ADMIN_UID, adminToken()).firestore();
  const operationPath = dailyOperationPath('2026-08-08');

  await assertFails(viceDb.doc(operationPath).set({
    centerId: CENTER_ID,
    dateId: '2026-08-08',
    massScheduled: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertFails(viceDb.doc(adminPath(VICE_ADMIN_UID)).set({
    massPermission: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));

  await assertSucceeds(ownerDb.doc(adminPath(VICE_ADMIN_UID)).set({
    massPermission: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertSucceeds(viceDb.doc(operationPath).set({
    centerId: CENTER_ID,
    dateId: '2026-08-08',
    massScheduled: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('il ruolo celebrazioni liturgiche modifica solo la messa del proprio centro', async () => {
  const personalDb = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();
  const operationPath = dailyOperationPath('2026-08-07');

  await assertSucceeds(personalDb.doc(operationPath).get());
  await assertFails(personalDb.doc(operationPath).set({
    centerId: CENTER_ID,
    dateId: '2026-08-07',
    massScheduled: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(publicParticipantPath(MARIO_ID)).set({
      liturgicalRole: true
    }, { merge: true });
  });

  await assertSucceeds(personalDb.doc(operationPath).set({
    centerId: CENTER_ID,
    dateId: '2026-08-07',
    massScheduled: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertFails(personalDb.doc(kitchenNotePath('2026-08-07')).set({
    centerId: CENTER_ID,
    mealDate: '2026-08-07',
    text: 'Modifica non consentita al ruolo liturgico',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('l amministratore gestisce l avatar e le sessioni del centro possono leggerlo', async () => {
  const adminDb = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();
  const kitchenDb = testEnv.authenticatedContext(KITCHEN_UID, anonymousToken()).firestore();
  const avatarPath = `centers/${CENTER_ID}/assets/avatar`;

  await assertSucceeds(adminDb.doc(avatarPath).set({
    centerId: CENTER_ID,
    dataUrl: 'data:image/webp;base64,AAAA',
    version: 'avatar_1',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(publicDb.doc(avatarPath).get());
  await assertSucceeds(kitchenDb.doc(avatarPath).get());
  await assertFails(publicDb.doc(avatarPath).set({
    centerId: CENTER_ID,
    dataUrl: 'data:image/webp;base64,BBBB',
    version: 'avatar_2',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('kitchen notes reject an invalid date identity and oversized text', async () => {
  const db = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();

  await assertFails(db.doc(kitchenNotePath('2026-08-05')).set({
    centerId: CENTER_ID,
    mealDate: '2026-08-06',
    text: 'Data non coerente',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertFails(db.doc(kitchenNotePath('2026-08-05')).set({
    centerId: CENTER_ID,
    mealDate: '2026-08-05',
    text: 'x'.repeat(1001),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('public summary sessions cannot write participant reservations', async () => {
  const db = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();

  await assertFails(writeOverride(db, MARIO_ID, OPEN_WINDOW_ID, 'PRESENT', 'PUBLIC'));
});

test('public sessions cannot bind themselves to a participant', async () => {
  await assertFails(selectParticipant(PUBLIC_UID, LUCA_ID));
});

test('the technical resident account can mint a bounded personal token', async () => {
  const db = testEnv.authenticatedContext('resident_technical', residentTechnicalToken()).firestore();
  const tokenRef = db.doc(linkTokenPath('personal_device_token_1234567890'));
  await assertSucceeds(tokenRef.set({
    status: 'ACTIVE',
    scope: 'PERSONAL',
    targetType: 'PARTICIPANT',
    participantId: MARIO_ID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2040-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertFails(tokenRef.get());
});

test('users without the common password cannot mint personal tokens', async () => {
  const db = testEnv.authenticatedContext('other_user', adminToken()).firestore();
  await assertFails(db.doc(linkTokenPath('personal_forbidden_1234567890')).set({
    status: 'ACTIVE',
    scope: 'PERSONAL',
    targetType: 'PARTICIPANT',
    participantId: MARIO_ID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2040-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('personal tokens cannot exceed the configured long-term horizon', async () => {
  const db = testEnv.authenticatedContext('resident_technical', residentTechnicalToken()).firestore();
  await assertFails(db.doc(linkTokenPath('personal_too_long_1234567890')).set({
    status: 'ACTIVE',
    scope: 'PERSONAL',
    targetType: 'PARTICIPANT',
    participantId: MARIO_ID,
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2052-01-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
});

test('a personal token creates a session bound to its participant', async () => {
  const uid = 'anon_personal_new';
  const db = testEnv.authenticatedContext(uid, anonymousToken()).firestore();
  const base = {
    centerId: CENTER_ID,
    scope: 'PERSONAL',
    targetType: 'PARTICIPANT',
    tokenId: 'personal_mario_token',
    status: 'ACTIVE',
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2026-09-01T00:00:00Z')),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await assertSucceeds(db.doc(sessionPath(uid)).set({
    ...base,
    participantId: MARIO_ID
  }));

  const wrongUid = 'anon_personal_wrong';
  const wrongDb = testEnv.authenticatedContext(wrongUid, anonymousToken()).firestore();
  await assertFails(wrongDb.doc(sessionPath(wrongUid)).set({
    ...base,
    participantId: LUCA_ID
  }));
});

test('a participant deactivated after session creation cannot write anymore', async () => {
  const db = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(privateParticipantPath(MARIO_ID)).set({ status: 'DISABLED' }, { merge: true });
  });

  await assertFails(writeOverride(db, MARIO_ID, OPEN_WINDOW_ID, 'PRESENT', 'PERSONAL'));
});

test('personal session can write only its own participant override', async () => {
  const db = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();

  await assertSucceeds(writeOverride(db, MARIO_ID, OPEN_WINDOW_ID, 'ABSENT', 'PERSONAL'));
  await assertFails(writeOverride(db, LUCA_ID, OPEN_WINDOW_ID, 'PRESENT', 'PERSONAL'));
});

test('un batch personale di sei pasti resta entro il limite di accessi delle regole', async () => {
  const mealWindowIds = [10, 11, 12, 13, 14, 15].map((day) => `2026-08-${day}_lunch`);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const future = firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z'));
    await Promise.all(mealWindowIds.map((mealWindowId) => db.doc(mealWindowPath(mealWindowId)).set({
      centerId: CENTER_ID,
      mealDate: parseMealWindowId(mealWindowId)[0],
      mealTypeId: 'lunch',
      status: 'OPEN',
      closesAt: future
    })));
  });

  const db = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();
  const batch = db.batch();
  mealWindowIds.forEach((mealWindowId) => {
    batch.set(
      db.doc(overridePath(MARIO_ID, mealWindowId)),
      buildOverrideData(MARIO_ID, mealWindowId, 'PRESENT', 'PERSONAL')
    );
  });
  await assertSucceeds(batch.commit());
});

test('un override personale richiede una regola applicabile al pasto', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(rulePath(MARIO_ID)).set({ mealTypeIds: ['breakfast'] }, { merge: true });
  });
  const db = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();
  await assertFails(writeOverride(db, MARIO_ID, OPEN_WINDOW_ID, 'PRESENT', 'PERSONAL'));
});

test('un amministratore non puo restringere una regola lasciando override invisibili', async () => {
  const db = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  await assertFails(db.doc(rulePath(MARIO_ID)).set({ mealTypeIds: ['breakfast'] }, { merge: true }));
});

test('personal session can revoke its token and session on device exit', async () => {
  const db = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();
  const batch = db.batch();
  batch.delete(db.doc(linkTokenPath('personal_mario_token')));
  batch.delete(db.doc(sessionPath(PERSONAL_UID)));
  await assertSucceeds(batch.commit());
});

test('closed meal windows reject participant writes', async () => {
  const db = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();

  await assertFails(writeOverride(db, MARIO_ID, CLOSED_WINDOW_ID, 'PRESENT', 'PERSONAL'));
});

test('public and personal sessions cannot impersonate admin source', async () => {
  const publicDb = testEnv.authenticatedContext(PUBLIC_UID, anonymousToken()).firestore();
  const personalDb = testEnv.authenticatedContext(PERSONAL_UID, anonymousToken()).firestore();

  await assertFails(writeOverride(publicDb, MARIO_ID, OPEN_WINDOW_ID, 'PRESENT', 'ADMIN'));
  await assertFails(writeOverride(personalDb, MARIO_ID, OPEN_WINDOW_ID, 'PRESENT', 'ADMIN'));
});

test('admin can manage participant records and write admin-sourced overrides', async () => {
  const db = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();

  await assertSucceeds(db.doc(privateParticipantPath(LUCA_ID)).set({
    centerId: CENTER_ID,
    groupId: 'group_residenti',
    displayName: 'Luca',
    status: 'ACTIVE',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }));
  await assertSucceeds(db.doc(rulePath(LUCA_ID)).set({
    centerId: CENTER_ID,
    participantId: LUCA_ID,
    groupId: 'group_residenti',
    dietTags: ['STANDARD'],
    mealTypeIds: ['breakfast', 'lunch', 'dinner'],
    startsOn: '2026-08-01',
    endsOn: null,
    status: 'ACTIVE',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await assertSucceeds(writeOverride(db, LUCA_ID, OPEN_WINDOW_ID, 'PRESENT', 'ADMIN'));
});

test('l amministratore elimina persona profilo pubblico e regola nello stesso batch', async () => {
  const db = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const batch = db.batch();
  batch.delete(db.doc(rulePath(MARIO_ID)));
  batch.delete(db.doc(privateParticipantPath(MARIO_ID)));
  batch.delete(db.doc(publicParticipantPath(MARIO_ID)));

  await assertSucceeds(batch.commit());
});

test('admin can atomically create a participant and the matching reservation rule', async () => {
  const db = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const participantId = 'participant_new';
  const batch = db.batch();
  batch.set(db.doc(centerPath()), {
    participantDataUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.doc(privateParticipantPath(participantId)), {
    centerId: CENTER_ID,
    groupId: 'group_residenti',
    displayName: 'Nuova persona',
    signature: 'NUO',
    dietTags: ['STANDARD'],
    sortOrder: 10,
    status: 'ACTIVE',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.doc(publicParticipantPath(participantId)), {
    centerId: CENTER_ID,
    groupId: 'group_residenti',
    displayName: 'Nuova persona',
    signature: 'NUO',
    dietTags: ['STANDARD'],
    sortOrder: 10,
    status: 'ACTIVE',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.doc(rulePath(participantId)), {
    centerId: CENTER_ID,
    participantId,
    groupId: 'group_residenti',
    dietTags: ['STANDARD'],
    mealTypeIds: ['breakfast', 'lunch', 'dinner'],
    startsOn: '2026-08-08',
    endsOn: null,
    status: 'ACTIVE',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await assertSucceeds(batch.commit());
});

test('il salvataggio revisionato della persona resta entro i limiti delle regole', async () => {
  const db = testEnv.authenticatedContext(ADMIN_UID, adminToken()).firestore();
  const participantId = 'participant_transactional';
  await assertSucceeds(db.runTransaction(async (transaction) => {
    const participantRef = db.doc(privateParticipantPath(participantId));
    const ruleRef = db.doc(rulePath(participantId));
    await transaction.get(participantRef);
    await transaction.get(ruleRef);
    transaction.set(db.doc(centerPath()), {
      participantDataUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(participantRef, {
      centerId: CENTER_ID,
      groupId: 'group_residenti',
      displayName: 'Persona revisionata',
      signature: 'REV',
      dietTags: ['STANDARD'],
      revision: 1,
      sortOrder: 11,
      status: 'ACTIVE',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    transaction.set(db.doc(publicParticipantPath(participantId)), {
      centerId: CENTER_ID,
      groupId: 'group_residenti',
      displayName: 'Persona revisionata',
      signature: 'REV',
      dietTags: ['STANDARD'],
      sortOrder: 11,
      status: 'ACTIVE',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    transaction.set(ruleRef, {
      centerId: CENTER_ID,
      participantId,
      groupId: 'group_residenti',
      dietTags: ['STANDARD'],
      mealTypeIds: ['breakfast', 'lunch', 'dinner'],
      startsOn: '2026-08-08',
      endsOn: null,
      status: 'ACTIVE',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    transaction.set(db.doc(`${centerPath()}/auditEvents/event_transactional`), {
      centerId: CENTER_ID,
      actorUid: ADMIN_UID,
      action: 'UPSERT_PARTICIPANT',
      targetType: 'PARTICIPANT',
      targetId: participantId,
      summary: 'Persona aggiunta: Persona revisionata',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }));
});

async function seedBaseData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const future = firebase.firestore.Timestamp.fromDate(new Date('2026-12-31T22:59:59Z'));
    const past = firebase.firestore.Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));

    await db.doc(centerPath()).set({
      name: 'Centro Demo',
      timezone: 'Europe/Rome',
      status: 'ACTIVE'
    });
    await db.doc(adminPath(ADMIN_UID)).set({
      status: 'ACTIVE',
      email: 'owner@example.test',
      role: 'OWNER'
    });
    await db.doc(adminPath(CENTER_ADMIN_UID)).set({
      status: 'ACTIVE',
      participantId: LUCA_ID,
      email: 'admin@example.test',
      role: 'ADMIN',
      massPermission: true,
      dailyOperationsPermission: true
    });
    await db.doc(adminPath(VICE_ADMIN_UID)).set({
      status: 'ACTIVE',
      email: 'vice@example.test',
      role: 'MANAGER',
      massPermission: false,
      dailyOperationsPermission: false
    });
    await db.doc(groupPath('group_residenti')).set({
      centerId: CENTER_ID,
      name: 'Residenti',
      status: 'ACTIVE'
    });
    await db.doc(publicParticipantPath(MARIO_ID)).set({
      centerId: CENTER_ID,
      groupId: 'group_residenti',
      displayName: 'Mario',
      status: 'ACTIVE'
    });
    await db.doc(publicParticipantPath(LUCA_ID)).set({
      centerId: CENTER_ID,
      groupId: 'group_residenti',
      displayName: 'Luca',
      signature: 'LU',
      status: 'ACTIVE'
    });
    await db.doc(privateParticipantPath(MARIO_ID)).set({
      centerId: CENTER_ID,
      groupId: 'group_residenti',
      displayName: 'Mario Rossi',
      status: 'ACTIVE'
    });
    await db.doc(rulePath(MARIO_ID)).set({
      centerId: CENTER_ID,
      participantId: MARIO_ID,
      groupId: 'group_residenti',
      dietTags: ['STANDARD'],
      mealTypeIds: ['lunch'],
      startsOn: '2026-08-01',
      endsOn: null,
      status: 'ACTIVE'
    });
    await db.doc(linkTokenPath('public_token')).set({
      status: 'ACTIVE',
      scope: 'PUBLIC',
      targetType: 'CENTER',
      expiresAt: future
    });
    await db.doc(linkTokenPath('personal_mario_token')).set({
      status: 'ACTIVE',
      scope: 'PERSONAL',
      targetType: 'PARTICIPANT',
      participantId: MARIO_ID,
      expiresAt: future
    });
    await db.doc(linkTokenPath('kitchen_token')).set({
      status: 'ACTIVE',
      scope: 'KITCHEN',
      targetType: 'CENTER',
      expiresAt: future
    });
    await db.doc(mealWindowPath(OPEN_WINDOW_ID)).set({
      centerId: CENTER_ID,
      mealDate: '2026-08-05',
      mealTypeId: 'lunch',
      status: 'OPEN',
      closesAt: future
    });
    await db.doc(mealWindowPath(CLOSED_WINDOW_ID)).set({
      centerId: CENTER_ID,
      mealDate: '2026-08-04',
      mealTypeId: 'lunch',
      status: 'CLOSED',
      closesAt: past
    });
    for (const dateId of ['2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12']) {
      await db.doc(mealWindowPath(`${dateId}_dinner`)).set({
        centerId: CENTER_ID,
        mealDate: dateId,
        mealTypeId: 'dinner',
        status: 'OPEN',
        closesAt: future
      });
    }
    await db.doc(mealWindowPath('2026-08-04_dinner')).set({
      centerId: CENTER_ID,
      mealDate: '2026-08-04',
      mealTypeId: 'dinner',
      status: 'CLOSED',
      closesAt: past
    });
    await createSession(db, PUBLIC_UID, {
      scope: 'PUBLIC',
      targetType: 'CENTER',
      tokenId: 'public_token',
      participantId: MARIO_ID
    });
    await createSession(db, PERSONAL_UID, {
      scope: 'PERSONAL',
      targetType: 'PARTICIPANT',
      tokenId: 'personal_mario_token',
      participantId: MARIO_ID
    });
    await createSession(db, KITCHEN_UID, {
      scope: 'KITCHEN',
      targetType: 'CENTER',
      tokenId: 'kitchen_token'
    });
  });
}

async function seedInvitation(invitationId) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`centerInvitations/${invitationId}`).set({
      status: 'ACTIVE',
      createdBy: BOOTSTRAP_OWNER_UID,
      expiresAt: firebase.firestore.Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
      createdAt: firebase.firestore.Timestamp.fromDate(new Date('2026-08-09T00:00:00Z')),
      updatedAt: firebase.firestore.Timestamp.fromDate(new Date('2026-08-09T00:00:00Z'))
    });
  });
}

async function createSession(db, uid, data) {
  const future = firebase.firestore.Timestamp.fromDate(new Date('2026-12-31T22:59:59Z'));
  await db.doc(sessionPath(uid)).set({
    centerId: CENTER_ID,
    status: 'ACTIVE',
    expiresAt: future,
    createdAt: firebase.firestore.Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
    updatedAt: firebase.firestore.Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
    ...data
  });
}

async function selectParticipant(uid, participantId) {
  const db = testEnv.authenticatedContext(uid, anonymousToken()).firestore();
  await db.doc(sessionPath(uid)).set({
    participantId,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function writeOverride(db, participantId, mealWindowId, effect, source) {
  return db.doc(overridePath(participantId, mealWindowId)).set(
    buildOverrideData(participantId, mealWindowId, effect, source)
  );
}

function buildOverrideData(participantId, mealWindowId, effect, source) {
  const [mealDate, mealTypeId] = parseMealWindowId(mealWindowId);
  return {
    centerId: CENTER_ID,
    participantId,
    groupId: 'group_residenti',
    mealDate,
    mealTypeId,
    mealWindowId,
    effect,
    requestId: 'req_' + participantId + '_' + mealWindowId + '_' + effect + '_' + source,
    source,
    dietTags: ['STANDARD'],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

function parseMealWindowId(mealWindowId) {
  const [date, mealTypeId] = mealWindowId.split('_');
  return [date, mealTypeId];
}

function anonymousToken() {
  return {
    provider_id: 'anonymous',
    firebase: {
      sign_in_provider: 'anonymous'
    }
  };
}

function residentTechnicalToken() {
  return {
    email: `residenti+${CENTER_ID}@tavola-comune.local`,
    email_verified: false,
    firebase: {
      sign_in_provider: 'password'
    }
  };
}

function adminToken() {
  return {
    email: 'owner@example.test',
    email_verified: true,
    firebase: {
      sign_in_provider: 'google.com'
    }
  };
}

function emailAdminToken() {
  return {
    email: 'director@example.test',
    email_verified: true,
    firebase: {
      sign_in_provider: 'password'
    }
  };
}

function initialAdministratorProfile({
  passwordRequired = true,
  email = 'director@example.test'
} = {}) {
  return {
    administratorName: '',
    administratorSignature: '',
    administratorProfileRequired: true,
    administratorProfileComplete: false,
    administratorPasswordRequired: passwordRequired,
    adminEmail: email
  };
}

function unverifiedEmailAdminToken() {
  return {
    email: 'director@example.test',
    email_verified: false,
    firebase: {
      sign_in_provider: 'password'
    }
  };
}

function centerPath() {
  return `centers/${CENTER_ID}`;
}

function adminPath(uid) {
  return `${centerPath()}/admins/${uid}`;
}

function groupPath(groupId) {
  return `${centerPath()}/groups/${groupId}`;
}

function privateParticipantPath(participantId) {
  return `${centerPath()}/participants/${participantId}`;
}

function publicParticipantPath(participantId) {
  return `${centerPath()}/publicParticipants/${participantId}`;
}

function linkTokenPath(tokenId) {
  return `${centerPath()}/linkTokens/${tokenId}`;
}

function sessionPath(uid) {
  return `${centerPath()}/accessSessions/${uid}`;
}

function mealWindowPath(mealWindowId) {
  return `${centerPath()}/mealWindows/${mealWindowId}`;
}

function kitchenNotePath(mealDate) {
  return `${centerPath()}/kitchenNotes/${mealDate}`;
}

function dailyOperationPath(dateId) {
  return `${centerPath()}/dailyOperations/${dateId}`;
}

function overridePath(participantId, mealWindowId) {
  return `${centerPath()}/reservationOverrides/${participantId}_${mealWindowId}`;
}

function rulePath(participantId) {
  return `${centerPath()}/reservationRules/rule_${participantId}`;
}
