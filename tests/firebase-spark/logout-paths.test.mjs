import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';

for (const privileged of [false, true]) {
  test(`device exit preserves the ${privileged ? 'privileged logout and redirect' : 'resident session and entry gate'}`, async () => {
    const calls = [];
    const state = { mode: privileged ? 'admin' : 'week', adminRole: privileged ? 'MANAGER' : '' };
    const elements = { residentSignatureInput: { focus() {} }, residentPasswordInput: {}, residentLoginStatus: {} };
    const h = functions(['handleForgetDevice'], {
      state, elements, URL, clearPersonalCalendarSnapshots() {}, getActiveCenterId: () => 'center',
      invalidateViewRequests() {}, getCurrentUser: () => ({ uid: 'user', isAnonymous: true }),
      transitionAuthLifecycle: event => calls.push(event), closeResidentEntryGate: () => calls.push('gate'),
      forgetResidentDevice: async () => calls.push('forget'),
      clearAdminAuthorizationState: () => { state.adminRole = ''; calls.push('clear-admin'); },
      loadStoredResidentSignature: () => 'AA', renderResidentAccess() {}, renderMode() {},
      window: { location: { href: 'https://example.test/?invite=secret&adminInvite=secret',
        assign: url => calls.push(['assign', url]) },
      history: { replaceState: (_, __, url) => calls.push(['replace', url]) } }
    });
    await h.handleForgetDevice();
    assert.equal(state.residentAuthTransition, '');
    assert.equal(state.residentReady, false);
    assert.equal(state.selectedParticipant, null);
    if (privileged) {
      assert.deepEqual(calls, ['SIGN_OUT_START', 'forget', 'clear-admin', ['assign', '/?view=participant&access=friendly']]);
    } else {
      assert.deepEqual(calls, ['gate', ['replace', '/?view=participant&access=friendly']]);
      assert.equal(state.mode, 'participant');
      assert.equal(elements.residentSignatureInput.value, 'AA');
    }
  });
}
