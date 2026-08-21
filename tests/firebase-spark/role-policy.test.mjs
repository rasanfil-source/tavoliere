import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPABILITIES,
  CENTER_ROLES,
  getRoleCapabilities,
  hasCapability,
  normalizeCenterRole,
  roleLabel
} from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';

test('normalizza soltanto i ruoli riconosciuti', () => {
  assert.equal(normalizeCenterRole(' owner '), CENTER_ROLES.OWNER);
  assert.equal(normalizeCenterRole('manager'), CENTER_ROLES.MANAGER);
  assert.equal(normalizeCenterRole('partecipante'), '');
});

test('il responsabile conserva tutti i poteri del centro', () => {
  const capabilities = getRoleCapabilities(CENTER_ROLES.OWNER);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_CENTER_SETTINGS), true);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_ADMINS), true);
  assert.equal(capabilities.has(CAPABILITIES.TRANSFER_OWNERSHIP), true);
  assert.equal(capabilities.has(CAPABILITIES.DELETE_PARTICIPANTS), true);
});

test('l amministratore gestisce il centro ma non puo sostituire il responsabile', () => {
  const capabilities = getRoleCapabilities(CENTER_ROLES.ADMIN);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_CENTER_SETTINGS), true);
  assert.equal(capabilities.has(CAPABILITIES.ASSIGN_VICE), true);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_ADMINS), false);
  assert.equal(capabilities.has(CAPABILITIES.TRANSFER_OWNERSHIP), false);
  assert.equal(capabilities.has(CAPABILITIES.VIEW_OPERATIONAL_LINKS), true);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_DAILY_OPERATIONS), true);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_MASS), true);
  assert.equal(capabilities.has(CAPABILITIES.DELETE_PARTICIPANTS), true);
  assert.equal(capabilities.has(CAPABILITIES.ASSIGN_LITURGY), true);
});

test('il vice usa Persone Link e Aspetto ma non le schede riservate', () => {
  const capabilities = getRoleCapabilities(CENTER_ROLES.MANAGER);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_PARTICIPANTS), true);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_DAILY_OPERATIONS), true);
  assert.equal(capabilities.has(CAPABILITIES.DELETE_PARTICIPANTS), true);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_ADAPTATIONS), true);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_CENTER_SETTINGS), false);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_OPERATIONAL_LINKS), false);
  assert.equal(capabilities.has(CAPABILITIES.VIEW_OPERATIONAL_LINKS), true);
  assert.equal(capabilities.has(CAPABILITIES.MANAGE_ADMINS), false);
  assert.equal(capabilities.has(CAPABILITIES.TRANSFER_OWNERSHIP), false);
});

test('il vice gestisce la Messa mentre l incaricato liturgico conserva il solo permesso specifico', () => {
  assert.equal(hasCapability(CENTER_ROLES.MANAGER, CAPABILITIES.MANAGE_MASS), true);
  assert.equal(hasCapability(CENTER_ROLES.MANAGER, CAPABILITIES.MANAGE_MASS, { massPermission: true }), true);
  assert.equal(hasCapability('', CAPABILITIES.MANAGE_MASS, { liturgicalRole: true }), true);
  assert.equal(hasCapability('', CAPABILITIES.MANAGE_DAILY_OPERATIONS, { liturgicalRole: true }), false);
});

test('la spunta Vice amministratore non concede privilegi senza sessione autorizzata', () => {
  assert.equal(hasCapability('', CAPABILITIES.MANAGE_DAILY_OPERATIONS, { viceAdminRole: true }), false);
});

test('la gestione della piattaforma resta distinta dal ruolo nel centro', () => {
  assert.equal(hasCapability(CENTER_ROLES.OWNER, CAPABILITIES.MANAGE_PLATFORM_CENTERS), false);
  assert.equal(hasCapability('', CAPABILITIES.MANAGE_PLATFORM_CENTERS, { platformOwner: true }), true);
});

test('le etichette descrivono la responsabilita senza esporre i codici tecnici', () => {
  assert.equal(roleLabel(CENTER_ROLES.OWNER), 'Responsabile del centro');
  assert.equal(roleLabel(CENTER_ROLES.ADMIN), 'Amministratore');
  assert.equal(roleLabel(CENTER_ROLES.MANAGER), 'Vice amministratore');
  assert.equal(roleLabel(''), 'Partecipante');
});
