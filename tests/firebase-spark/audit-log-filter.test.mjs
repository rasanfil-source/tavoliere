import assert from 'node:assert/strict';
import test from 'node:test';
import { functions } from '../helpers/app-functions.mjs';

test('il filtro registro trova nome mostrato, etichetta storica e identificativo tecnico', () => {
  const event = { actorUid: 'uid-test', actorLabel: 'MR', actorParticipantId: 'person-test',
    createdAt: { toDate: () => new Date('2026-10-16T12:00:00') } };
  const state = { adminAuditEvents: [event], adminAccounts: [],
    adminParticipants: [{ participantId: 'person-test', displayName: 'Mario Rossi' }] };
  const elements = { adminAuditDateFilter: { value: '' }, adminAuditUserFilter: { value: '' },
    adminAuditTableWrap: {}, adminAuditMore: {}, adminAuditStatus: {} };
  let shown;
  const app = functions(['renderFilteredAuditEvents', 'resolveAuditActorLabel'], {
    state, elements, getLocale: () => 'it', formatDateId: () => '2026-10-16',
    renderAuditEvents: events => { shown = events; }, t: key => key
  });
  for (const search of ['Mario', 'ROSSI', 'MR', 'uid-test', '']) {
    elements.adminAuditUserFilter.value = search;
    app.renderFilteredAuditEvents();
    assert.deepEqual(shown, [event], search);
  }
  elements.adminAuditUserFilter.value = 'inesistente';
  app.renderFilteredAuditEvents();
  assert.deepEqual(shown, []);
  elements.adminAuditUserFilter.value = 'Mario';
  elements.adminAuditDateFilter.value = '2026-10-15';
  app.renderFilteredAuditEvents();
  assert.deepEqual(shown, [], 'Il filtro data resta applicato');
  elements.adminAuditDateFilter.value = '';
  state.adminParticipants = [];
  elements.adminAuditUserFilter.value = 'mr';
  app.renderFilteredAuditEvents();
  assert.deepEqual(shown, [event], 'Etichetta utilizzabile anche dopo la rimozione della persona');
});
