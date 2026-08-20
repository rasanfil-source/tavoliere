import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTH_STATES,
  createInitialAuthState,
  reduceAuthState,
  selectAuthSurface
} from '../../prototypes/firebase-spark-pwa/public/core/auth-state-machine.mjs';

const event = (type, extra = {}) => ({ type, ...extra });

test('macchina: residente comune, refresh, navigazione e nuovo accesso', () => {
  let state = createInitialAuthState();
  state = reduceAuthState(state, event('RESIDENT_LOGIN_START'));
  assert.equal(state.state, AUTH_STATES.RESTORING_RESIDENT);
  state = reduceAuthState(state, event('RESIDENT_READY', { entry: 'common' }));
  assert.equal(selectAuthSurface(state).role, 'RESIDENT');
  assert.equal(selectAuthSurface(state).residentViewsVisible, true);
  state = reduceAuthState(state, event('NAVIGATE', { route: 'admin' }));
  assert.equal(selectAuthSurface(state).adminPanelVisible, false);
  state = reduceAuthState(state, event('SIGN_OUT_START'));
  state = reduceAuthState(state, event('SIGN_OUT_COMPLETE'));
  assert.equal(state.state, AUTH_STATES.SIGNED_OUT);
  assert.equal(selectAuthSurface(state).residentLoginVisible, true);
});

test('macchina: vice con password amministratori mantiene il perimetro vice', () => {
  let state = reduceAuthState(createInitialAuthState(), event('RESIDENT_READY', { entry: 'vice' }));
  assert.equal(state.adminRole, 'MANAGER');
  assert.equal(selectAuthSurface(state).role, 'MANAGER');
  assert.equal(selectAuthSurface(state).adminPanelVisible, false);
  state = reduceAuthState(state, event('NAVIGATE', { route: 'admin' }));
  assert.equal(selectAuthSurface(state).adminPanelVisible, true);
});

test('macchina: Gmail/email mostra il pannello solo dopo membership e ruolo', () => {
  let state = reduceAuthState(createInitialAuthState({ route: 'admin' }), event('ADMIN_AUTH_START'));
  assert.equal(selectAuthSurface(state).adminChecking, true);
  assert.equal(selectAuthSurface(state).adminPanelVisible, false);
  state = reduceAuthState(state, event('ADMIN_AUTH_SUCCESS', { firebaseUid: 'uid-1', role: 'OWNER' }));
  assert.equal(state.state, AUTH_STATES.ADMIN_READY);
  assert.equal(selectAuthSurface(state).adminPanelVisible, true);
  assert.equal(selectAuthSurface(state).role, 'OWNER');
});

test('macchina: Firebase precedente non promuove il residente corrente', () => {
  let state = createInitialAuthState({ route: 'participant', firebaseUid: 'old', firebaseStrong: true });
  state = reduceAuthState(state, event('RESIDENT_READY', { entry: 'common' }));
  state = reduceAuthState(state, event('FIREBASE_AUTH_CHANGED', { uid: 'old', strong: true }));
  assert.equal(selectAuthSurface(state).role, 'RESIDENT');
  assert.equal(state.adminAuthorized, false);
  state = reduceAuthState(state, event('FIREBASE_AUTH_CHANGED', { uid: '', strong: false }));
  assert.equal(state.adminRole, '');
});

test('macchina: risposta Firebase tardiva non riapre il pannello dopo logout', () => {
  let state = createInitialAuthState({ route: 'admin' });
  state = reduceAuthState(state, event('ADMIN_AUTH_START'));
  const staleRequestId = state.adminRequestId;
  state = reduceAuthState(state, event('SIGN_OUT_START'));
  state = reduceAuthState(state, event('SIGN_OUT_COMPLETE'));
  state = reduceAuthState(state, event('ADMIN_AUTH_SUCCESS', {
    firebaseUid: 'late',
    role: 'OWNER',
    requestId: staleRequestId
  }));
  assert.equal(state.state, AUTH_STATES.SIGNED_OUT);
  assert.equal(selectAuthSurface(state).adminPanelVisible, false);
});

test('macchina: errore di verifica non lascia Accesso in verifica bloccato', () => {
  let state = reduceAuthState(createInitialAuthState({ route: 'admin' }), event('ADMIN_AUTH_START'));
  state = reduceAuthState(state, event('ADMIN_AUTH_FAILURE'));
  assert.equal(selectAuthSurface(state).adminChecking, false);
  assert.equal(selectAuthSurface(state).adminPanelVisible, false);
});
