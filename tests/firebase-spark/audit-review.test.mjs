import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as roles from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';
import { formatDateId } from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as revisions from '../../prototypes/firebase-spark-pwa/public/core/revision.mjs';

test('operational link cache miss loads the domain and resolves both link types', async () => {
  const h = functions(['resolveAccessLinkUrl'], {
    getCachedAccessLinkUrl: () => '', getActiveCenterId: () => 'center',
    loadDomainModule: async name => {
      assert.equal(name, 'accessLinks');
      return { loadOperationalLinks: async options => {
        assert.equal(options.forceRefresh, true);
        return { publicTokenId: 'public', kitchenTokenId: 'kitchen' };
      } };
    },
    buildOperationalLink: (role, token) => `${role}/${token}`
  });
  assert.equal(await h.resolveAccessLinkUrl('pasti'), 'participant/public');
  assert.equal(await h.resolveAccessLinkUrl('cucina'), 'kitchen/kitchen');
});

test('notes written in advance survive on their meal day and expire afterwards', () => {
  let today = '2026-10-17';
  const h = functions(['filterKitchenNoteForToday'], {
    formatDateId: value => value, getCenterToday: () => today
  });
  const note = { mealDate: '2026-10-18', messages: [{ text: 'Senza sale', createdAt: '2026-10-17T10:00:00Z' }] };
  assert.equal(h.filterKitchenNoteForToday(note).text, 'Senza sale');
  today = '2026-10-18';
  assert.equal(h.filterKitchenNoteForToday(note).text, 'Senza sale');
  assert.equal(h.filterKitchenNoteForToday({ mealDate: today, text: 'Nota precedente', updatedAt: '2026-10-16' }).text, 'Nota precedente');
  today = '2026-10-19';
  assert.equal(h.filterKitchenNoteForToday(note), null);
});

test('suspension deletes personal credentials without deleting a shared access token', async () => {
  const deleted = [];
  const h = await loadBrowserModule('admin-participant-data.js', {
    ...revisions,
    getDoc: async () => ({ exists: () => true, data: () => ({ status: 'DISABLED', revision: 1 }) }),
    runTransaction: async (_, action) => action({
      get: async () => ({ exists: () => true, data: () => ({ status: 'DISABLED', revision: 1 }) }),
      delete: ref => deleted.push(ref)
    }),
    db: {}, collection: (_, ...parts) => parts.join('/'), query: collection => collection, where: () => '',
    doc: (_, ...parts) => parts.join('/'),
    getDocs: async collection => ({ docs: !collection.endsWith('/accessSessions') ? [] : ['PUBLIC', 'PERSONAL'].map(scope => ({
      ref: `session-${scope}`, data: () => ({ scope, tokenId: `token-${scope}` })
    })) }),
    writeBatch: () => ({ delete: ref => deleted.push(ref), commit: async () => {} }),
    commitWithRetry: action => action()
  }, ['deleteParticipantAccessCredentials']);
  await h.deleteParticipantAccessCredentials('center', 'person');
  assert.deepEqual(deleted, ['session-PUBLIC', 'centers/center/linkTokens/token-PERSONAL', 'session-PERSONAL']);
});

test('calendar coverage counts civil days in the center timezone across DST', async () => {
  const h = await loadBrowserModule('admin-participant-data.js', {
    db: {}, getActiveCenterId: () => 'center', collection: () => '', query: () => '', orderBy: () => '', limit: () => '',
    getDocs: async () => ({ empty: false, docs: [{ data: () => ({ mealDate: '2026-10-26' }) }] }),
    loadCenterContactSettings: async () => ({ timezone: 'Europe/Rome' }), formatDateId,
    getDateInTimeZone: zone => { assert.equal(zone, 'Europe/Rome'); return new Date(2026, 9, 24, 12); }
  }, ['loadMealWindowCoverage']);
  assert.deepEqual(await h.loadMealWindowCoverage(), { through: '2026-10-26', remainingDays: 2 });
});

test('an explicit administrator invitation takes precedence over an active membership', async () => {
  const invitationId = 'a'.repeat(64);
  const h = await loadBrowserModule('admin-center.js', {
    ...roles, db: {}, getActiveCenterId: () => 'old-center',
    window: { location: { search: `?adminInvite=${invitationId}` }, sessionStorage: { getItem: () => '' }, localStorage: { getItem: () => '' } },
    doc: (_, ...parts) => parts.join('/'),
    getDoc: async path => ({ exists: () => true, data: () => path.startsWith('adminInvitations/')
      ? { status: 'ACTIVE', role: 'ADMIN', centerId: 'new-center', participantId: 'successor', expiresAt: { toDate: () => new Date('2099-01-01') } }
      : { status: 'ACTIVE', role: 'OWNER' } })
  }, ['loadAdminCenterAccess']);
  const access = await h.loadAdminCenterAccess({ uid: 'owner' });
  assert.equal(access.invitationPending, true);
  assert.equal(access.centerId, 'new-center');
});

test('month navigation reports a month update', () => {
  let source;
  const h = functions(['shiftMonth', 'formatRefreshLabel'], {
    state: { monthDate: new Date(2026, 9, 1) },
    setWeekStartFromDate: (_, value) => { source = value; },
    formatLastUpdateTime: () => '', t: key => key
  });
  h.shiftMonth(1);
  assert.equal(h.formatRefreshLabel(source), 'status.monthUpdated');
});

for (const status of ['USED', 'TRANSFERRED', 'REVOKED', 'EXPIRED']) {
  test(`a stale ${status} invitation cannot block an active administrator`, async () => {
    const h = await loadBrowserModule('admin-center.js', {
      synchronizeAdministratorDeletionProtection: async () => {},
      ...roles, db: {}, getActiveCenterId: () => 'center',
      window: { location: { search: `?adminInvite=${'a'.repeat(64)}` },
        sessionStorage: { getItem: () => '' }, localStorage: { getItem: () => '' } },
      doc: (_, ...parts) => parts.join('/'),
      getDoc: async path => ({ exists: () => true, data: () => {
        if (path.startsWith('adminInvitations/')) return { status: status === 'EXPIRED' ? 'ACTIVE' : status,
          role: 'ADMIN', centerId: 'center', expiresAt: { toDate: () => new Date('2000-01-01') } };
        if (path.startsWith('adminProfiles/')) return { status: 'ACTIVE', role: 'OWNER', centerId: 'center', centerIds: ['center'], email: 'owner@example.com' };
        return { status: 'ACTIVE', role: 'OWNER', name: 'Center' };
      } })
    }, ['loadAdminCenterAccess']);
    const access = await h.loadAdminCenterAccess({ uid: 'owner', email: 'owner@example.com' });
    assert.equal(access.active, true);
    assert.notEqual(access.invitationPending, true);
    assert.notEqual(access.invitationError, true);
  });
}

test('ownership transfer updates the administrator Person in the same commit', async () => {
  const writes = new Map();
  let committed = false;
  const h = await loadBrowserModule('admin-center.js', {
    ...roles, db: {}, getActiveCenterId: () => 'center',
    doc: (_, ...parts) => parts.join('/'), serverTimestamp: () => 1,
    getDoc: async path => ({ exists: () => true, data: () => {
      if (path.endsWith('/admins/owner')) return { status: 'ACTIVE', role: 'OWNER' };
      if (path.endsWith('/admins/successor')) return { status: 'ACTIVE', role: 'ADMIN', participantId: 'new-person', invitationId: 'a'.repeat(64) };
      if (path.startsWith('adminInvitations/')) return { centerId: 'center', role: 'ADMIN', status: 'USED', consumedBy: 'successor', acceptedEmail: 'next@example.com' };
      return { status: 'ACTIVE', displayName: 'Next', signature: 'NX' };
    } }),
    writeBatch: () => ({ set: (path, data) => writes.set(path, data), commit: async () => { committed = true; } }),
    appendAuditEvent: () => {}, AUDIT_ACTIONS: { TRANSFER_OWNERSHIP: 'TRANSFER_OWNERSHIP' }
  }, ['transferCenterOwnership']);
  await h.transferCenterOwnership('successor', {}, { uid: 'owner' });
  assert.equal(committed, true);
  assert.equal(writes.get('centers/center').administratorParticipantId, 'new-person');
  assert.equal(writes.get('centers/center/admins/successor').role, 'OWNER');
});
