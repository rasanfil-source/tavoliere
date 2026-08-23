import test from 'node:test';
import assert from 'node:assert/strict';

import {
  shouldBlockResidentEntryRestore,
  shouldPreserveResidentViewAfterRefreshError,
  shouldProcessAdminAuthEvent
} from '../../prototypes/firebase-spark-pwa/public/core/auth-session-policy.mjs';

test('gli eventi Firebase amministrativi non interferiscono con le viste residenti', () => {
  for (const mode of ['participant', 'week', 'summary', 'kitchen']) {
    assert.equal(shouldProcessAdminAuthEvent({ mode, strongAuthUser: true }), false);
    assert.equal(shouldProcessAdminAuthEvent({ mode, residentRestorePending: true }), false);
  }
  assert.equal(shouldProcessAdminAuthEvent({ mode: 'admin', strongAuthUser: true }), true);
  assert.equal(shouldProcessAdminAuthEvent({
    mode: 'admin',
    residentAuthTransition: 'signing-in',
    strongAuthUser: false
  }), false);
});

test('un errore di permesso non smonta una identità residente già riconosciuta', () => {
  assert.equal(shouldPreserveResidentViewAfterRefreshError({
    friendlyAccess: true,
    residentReady: true,
    hasParticipant: true,
    permissionDenied: true
  }), true);
  assert.equal(shouldPreserveResidentViewAfterRefreshError({
    friendlyAccess: true,
    residentReady: false,
    hasParticipant: true,
    permissionDenied: true
  }), false);
  assert.equal(shouldPreserveResidentViewAfterRefreshError({
    friendlyAccess: true,
    residentReady: true,
    hasParticipant: true,
    permissionDenied: false
  }), false);
});

test('la porta residente chiusa non espelle una sessione amministratore forte', () => {
  assert.equal(shouldBlockResidentEntryRestore({
    entryGateClosed: true,
    strongAuthUser: false
  }), true);
  assert.equal(shouldBlockResidentEntryRestore({
    entryGateClosed: true,
    strongAuthUser: true
  }), false);
  assert.equal(shouldBlockResidentEntryRestore({
    entryGateClosed: false,
    strongAuthUser: false
  }), false);
});
