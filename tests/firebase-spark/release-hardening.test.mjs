import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const publicDir = path.join(root, 'prototypes/firebase-spark-pwa/public');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const app = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const adminCenter = fs.readFileSync(path.join(publicDir, 'admin-center.js'), 'utf8');
const participantData = fs.readFileSync(path.join(publicDir, 'participant-data.js'), 'utf8');
const kitchenData = fs.readFileSync(path.join(publicDir, 'kitchen-data.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(publicDir, 'bootstrap-demo.js'), 'utf8');
const accessLinks = fs.readFileSync(path.join(publicDir, 'access-links.js'), 'utf8');
const rules = read('prototypes/firebase-spark-pwa/firestore.rules');
const operations = read('docs/OPERATIONS.md');

test('il responsabile puo revocare un amministratore attivo con audit', () => {
  assert.match(adminCenter, /export async function revokeCenterAdministrator/);
  assert.match(adminCenter, /access\.role !== 'OWNER'/);
  assert.match(adminCenter, /status: 'REVOKED'/);
  assert.match(adminCenter, /AUDIT_ACTIONS\.REVOKE_ADMIN/);
  assert.match(rules, /'revokedBy', 'revokedAt', 'updatedAt'/);
});

test('Cambio gestore mostra inviti e amministratori con azioni di revoca', () => {
  assert.match(index, /data-admin-invitation-management/);
  assert.match(index, /data-admin-invitation-list/);
  assert.match(index, /data-admin-account-management/);
  assert.match(index, /data-admin-account-list/);
  assert.match(app, /handleAdminInvitationListClick/);
  assert.match(app, /handleAdminAccountListClick/);
});

test('l esportazione verifica la capability specifica nella funzione dati', () => {
  assert.match(participantData, /hasCapability\(role, CAPABILITIES\.EXPORT_CENTER_DATA\)/);
  assert.match(participantData, /admin\.status !== 'ACTIVE'/);
});

test('gli accessi pubblici e cucina non usano token demo come fallback', () => {
  assert.doesNotMatch(participantData, /PUBLIC_DEMO_TOKEN_ID|public_demo/);
  assert.doesNotMatch(kitchenData, /KITCHEN_DEMO_TOKEN_ID|kitchen_demo/);
  assert.match(participantData, /if \(!tokenId\)[\s\S]*collegamento per residenti/);
  assert.match(kitchenData, /if \(!tokenId\)[\s\S]*collegamento cucina/);
});

test('il bootstrap revoca gli eventuali token legacy sostituiti', () => {
  assert.match(bootstrap, /LEGACY_OPERATIONAL_TOKENS/);
  assert.match(bootstrap, /legacyTokenId[\s\S]*status: 'REVOKED'/);
  assert.match(accessLinks, /LEGACY_OPERATIONAL_TOKENS/);
  assert.match(accessLinks, /legacyTokenId[\s\S]*status: 'REVOKED'/);
  assert.match(accessLinks, /!LEGACY_OPERATIONAL_TOKENS\.has\(normalized\)/);
});

test('ogni sessione operativa ricontrolla il token nelle regole', () => {
  const hasSession = rules.match(/function hasSession\(centerId\) \{[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(hasSession, /tokenIsUsable/);
  assert.match(hasSession, /accessSessions/);
});

test('il limite della revoca per singolo dispositivo e documentato', () => {
  assert.match(operations, /Telefono smarrito o dispositivo non più disponibile/);
  assert.match(operations, /sospendere temporaneamente la persona/);
  assert.match(operations, /blocca tutti i suoi dispositivi/);
});

test('telefono e disattivazione centro hanno comportamento trasparente e difensivo', () => {
  assert.match(app, /href="tel:\$\{escapeHtml\(phone\)\}"/);
  assert.match(app, />Disattiva<\/button>/);
  assert.match(app, /I dati resteranno conservati/);
  assert.match(operations, /l'azione non è presentata come cancellazione definitiva/);
});

test('la spunta Attiva usa una transazione dedicata e conserva la revisione', () => {
  assert.match(participantData, /export async function setAdminParticipantActiveStatus/);
  assert.match(participantData, /runTransaction\(db/);
  assert.match(participantData, /transaction\.update\(participantRef, \{ status, revision/);
  assert.match(participantData, /deleteParticipantAccessCredentials\(centerId, normalizedId\)/);
  assert.match(app, /const nextActive = toggle\.checked/);
  assert.match(app, /setAdminParticipantActiveStatus\([\s\S]*participant\.revision/);
});
