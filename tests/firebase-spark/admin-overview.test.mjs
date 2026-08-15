import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildAdminOverview } from '../../prototypes/firebase-spark-pwa/public/domain/admin-overview.mjs';

const appSource = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url),
  'utf8'
);

test('la panoramica riassume persone, inviti e ruolo senza nuove letture', () => {
  const now = new Date('2026-08-10T12:00:00Z');
  const overview = buildAdminOverview({
    role: 'OWNER',
    participants: [
      { status: 'ACTIVE' },
      { status: 'ACTIVE' },
      { status: 'SUSPENDED' }
    ],
    invitations: [
      { status: 'ACTIVE', expiresAt: new Date('2026-08-11T12:00:00Z') },
      { status: 'ACTIVE', expiresAt: new Date('2026-08-09T12:00:00Z') },
      { status: 'REVOKED', expiresAt: new Date('2026-08-11T12:00:00Z') }
    ],
    coverage: { through: '2031-08-10', remainingDays: 1825 },
    canViewOperationalLinks: true,
    operationalLinks: {
      publicTokenId: 'public_active_token',
      kitchenTokenId: 'kitchen_active_token',
      publicStatus: 'ACTIVE',
      kitchenStatus: 'ACTIVE'
    },
    now
  });

  assert.equal(overview.roleLabel, 'Responsabile del centro');
  assert.equal(overview.activePeople, 2);
  assert.equal(overview.suspendedPeople, 1);
  assert.equal(overview.activeInvitations, 1);
  assert.match(overview.calendar.label, /2031/);
  assert.equal(overview.calendar.needsAttention, false);
  assert.equal(overview.links, 'Disponibili');
});

test('la panoramica segnala calendario e collegamenti non gestibili', () => {
  const overview = buildAdminOverview({ role: 'MANAGER' });

  assert.equal(overview.roleLabel, 'Vice amministratore');
  assert.deepEqual(overview.calendar, { label: 'Da preparare', needsAttention: true });
  assert.equal(overview.links, 'Gestiti dal responsabile');
});

test('target persone coerente con index.html', () => {
  const result = buildAdminOverview({ role: 'MANAGER' });
  assert.equal(result.checklist.items[0].target, 'admin-person-editor');
});

test('target accesso coerente con index.html', () => {
  const result = buildAdminOverview({ role: 'OWNER', canViewOperationalLinks: true, operationalLinks: {} });
  assert.equal(result.checklist.items.find(({ id }) => id === 'publicLink').target, 'admin-access-section');
  assert.equal(result.checklist.items.find(({ id }) => id === 'kitchenLink').target, 'admin-access-section');
});

test('i collegamenti completano la checklist solo quando sono attivi', () => {
  const result = buildAdminOverview({
    role: 'OWNER',
    participants: [{ status: 'ACTIVE' }],
    coverage: { through: '2026-09-01', remainingDays: 20 },
    canViewOperationalLinks: true,
    hasCollaborator: true,
    operationalLinks: {
      publicTokenId: 'public_valid_token',
      kitchenTokenId: 'kitchen_revoked_token',
      publicStatus: 'ACTIVE',
      kitchenStatus: 'REVOKED'
    }
  });

  assert.equal(result.checklist.items.find(({ id }) => id === 'publicLink').done, true);
  assert.equal(result.checklist.items.find(({ id }) => id === 'kitchenLink').done, false);
  assert.equal(result.checklist.complete, false);
});

test('un suggerimento facoltativo non blocca il completamento', () => {
  const result = buildAdminOverview({
    role: 'OWNER',
    participants: [{ status: 'ACTIVE' }],
    coverage: { through: '2026-09-01', remainingDays: 20 },
    hasCollaborator: false
  });

  assert.equal(result.checklist.items.find(({ id }) => id === 'collaborator').required, false);
  assert.equal(result.checklist.complete, true);
});

test('il calendario è pronto con almeno sette giorni disponibili', () => {
  const ready = buildAdminOverview({ coverage: { through: '2026-08-19', remainingDays: 7 } });
  const short = buildAdminOverview({ coverage: { through: '2026-08-18', remainingDays: 6 } });

  assert.equal(ready.checklist.items.find(({ id }) => id === 'calendar').done, true);
  assert.equal(short.checklist.items.find(({ id }) => id === 'calendar').done, false);
});

test('calendario utilizzabile sotto 45 giorni resta completato ma mostra l avviso', () => {
  const result = buildAdminOverview({
    role: 'OWNER',
    canManageCalendar: true,
    coverage: { through: '2026-09-01', remainingDays: 20 }
  });
  assert.equal(result.calendar.needsAttention, true);
  assert.equal(result.checklist.items.find(({ id }) => id === 'calendar').done, true);
});

test('il vice nominato via spunta sostituisce il suggerimento di collaboratore', () => {
  const result = buildAdminOverview({
    role: 'OWNER',
    canAssignVice: true,
    hasCollaborator: true,
    administrators: [],
    participants: [{ status: 'ACTIVE', viceAdminRole: true }]
  });
  assert.equal(result.checklist.items.find(({ id }) => id === 'collaborator'), undefined);
});

test('il renderer accetta indicatori facoltativi non presenti nella scheda', () => {
  for (const elementName of [
    'adminOverviewActivePeople',
    'adminOverviewSuspendedPeople',
    'adminOverviewInvitations',
    'adminOverviewLinks'
  ]) {
    assert.match(appSource, new RegExp(`if \\(elements\\.${elementName}\\) \\{`));
  }
});
