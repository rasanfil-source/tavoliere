import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as roles from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';

const token = 'a'.repeat(64);
const key = 'tavolaComune.pendingCenterInvitation';
function browser(explicit = true) {
  const storage = () => {
    const data = new Map([[key, token]]);
    return { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  };
  const location = new URL(`https://example.test/?view=admin&center=center${explicit ? '&invite=' + token : ''}#panel`);
  return { location, sessionStorage: storage(), localStorage: storage(), history: {
    replaceState: (_, __, url) => { location.href = new URL(url, location).href; }
  } };
}

for (const explicit of [true, false]) {
  for (const status of ['USED', 'REVOKED', 'EXPIRED']) {
    test(`invalid ${status} center invitation is removed from URL and both stores (${explicit})`, async () => {
      const window = browser(explicit);
      const h = await loadBrowserModule('admin-center.js', {
        ...roles, db: {}, window, getActiveCenterId: () => 'center',
        doc: (_, ...parts) => parts.join('/'),
        getDoc: async path => ({ exists: () => path.startsWith('centerInvitations/'),
          data: () => ({ status: status === 'EXPIRED' ? 'ACTIVE' : status,
            expiresAt: { toDate: () => new Date('2000-01-01') } }) })
      }, ['loadAdminCenterAccess', 'getAdminInvitationId']);
      const access = await h.loadAdminCenterAccess({ uid: 'user', email: 'user@example.test' });
      assert.equal(access.invitationError, true);
      assert.equal(h.getAdminInvitationId(), '');
      assert.equal(window.sessionStorage.getItem(key), undefined);
      assert.equal(window.localStorage.getItem(key), undefined);
      assert.equal(window.location.searchParams.get('center'), 'center');
      assert.equal(window.location.hash, '#panel');
    });
  }
}

function emailFlow() {
  const state = {};
  const elements = Object.fromEntries(['adminPasswordLabel', 'adminPassword', 'adminEmailCreate',
    'adminEmailSignIn', 'adminPasswordReset', 'adminExistingAccount', 'adminEmailStatus'].map(k => [k, {}]));
  elements.adminPassword.value = token;
  elements.adminPassword.focus = () => {};
  const h = functions(['useExistingAccountForCenterInvitation', 'renderExistingAccountForCenterInvitation'], {
    state, elements, getAdminInvitationId: () => token, t: key => key
  });
  return { h, state, elements };
}

test('existing email account can enter its own password without losing invitation', () => {
  const { h, state, elements } = emailFlow();
  h.useExistingAccountForCenterInvitation();
  assert.equal(state.centerInvitationEmailSignIn, token);
  assert.equal(elements.adminPassword.value, '');
  assert.equal(elements.adminPassword.readOnly, false);
  assert.equal(elements.adminEmailSignIn.hidden, false);
  assert.equal(elements.adminPasswordReset.hidden, false);
  elements.adminPassword.value = 'personal-password';
  h.renderExistingAccountForCenterInvitation();
  assert.equal(elements.adminPassword.value, 'personal-password');
});

test('abandoning an invitation restores normal sign in without changing route or center', () => {
  const window = browser();
  let rendered = false;
  const state = { centerInvitationEmailSignIn: token };
  const elements = { adminPassword: { value: token } };
  const h = functions(['cancelPendingCenterInvitation'], {
    window, state, elements, CENTER_INVITATION_STORAGE_KEY: key, setSignedOutState: () => { rendered = true; }
  });
  h.cancelPendingCenterInvitation();
  assert.equal(window.location.searchParams.has('invite'), false);
  assert.equal(window.location.searchParams.get('view'), 'admin');
  assert.equal(window.sessionStorage.getItem(key), undefined);
  assert.equal(window.localStorage.getItem(key), undefined);
  assert.equal(elements.adminPassword.value, '');
  assert.equal(rendered, true);
});

test('an existing account with a different password reaches personal sign in after creation fails', async () => {
  const { state, elements } = emailFlow();
  elements.adminEmail = { value: 'user@example.test' };
  let signIns = 0;
  const h = functions(['handleAdministratorEmailCreation', 'useExistingAccountForCenterInvitation',
    'renderExistingAccountForCenterInvitation'], {
    state, elements, getAdminInvitationId: () => token, getAdminRoleInvitationId: () => '',
    t: key => key, setAdministratorEmailButtonsDisabled: () => {},
    createAdministratorWithEmail: async () => { throw { code: 'auth/email-already-in-use' }; },
    signInAdministratorWithEmail: async () => { signIns++; throw { code: 'auth/invalid-credential' }; }
  });
  await h.handleAdministratorEmailCreation();
  assert.equal(signIns, 1);
  assert.equal(elements.adminPassword.readOnly, false);
  assert.equal(elements.adminPassword.value, '');
  assert.equal(elements.adminEmailSignIn.hidden, false);
  assert.equal(state.centerInvitationEmailSignIn, token);
});

test('network failure validating invitation preserves it for retry', async () => {
  const window = browser();
  const h = await loadBrowserModule('admin-center.js', {
    ...roles, db: {}, window, getActiveCenterId: () => 'center', doc: () => '',
    getDoc: async () => { throw new Error('offline'); }
  }, ['loadAdminCenterAccess']);
  await assert.rejects(h.loadAdminCenterAccess({ uid: 'user' }), /offline/);
  assert.equal(window.sessionStorage.getItem(key), token);
  assert.equal(window.location.searchParams.get('invite'), token);
});
