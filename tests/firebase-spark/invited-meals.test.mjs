import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const publicDir = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const index = readFileSync(new URL('index.html', publicDir), 'utf8');
const app = readFileSync(new URL('app.js', publicDir), 'utf8');
const daily = readFileSync(new URL('daily-operations.js', publicDir), 'utf8');
const rules = readFileSync(new URL('../../prototypes/firebase-spark-pwa/firestore.rules', import.meta.url), 'utf8');

test('Agenda centro raccoglie gli invitati occasionali per ciascun pasto', () => {
  assert.match(index, /data-week-invited-section/);
  assert.match(index, /data-week-invited-meal="breakfast"/);
  assert.match(index, /data-week-invited-meal="lunch"/);
  assert.match(index, /data-week-invited-meal="dinner"/);
  assert.match(index, /data-week-invited-save/);
  assert.match(app, /saveInvitedMeals/);
  assert.match(app, /handleWeekInvitedSave/);
});

test('gli invitati giornalieri sono normalizzati e conservati nella cache locale', () => {
  assert.match(daily, /export async function saveInvitedMeals/);
  assert.match(daily, /function normalizeInvitedMeals/);
  assert.match(daily, /Math\.min\(999, Math\.max\(0/);
  assert.match(daily, /invitedMeals: normalizeInvitedMeals\(data\.invitedMeals\)/);
});

test('Firestore limita invitati e campi dei pasti ammessi', () => {
  assert.match(rules, /hasOnly\(\['centerId', 'dateId', 'sickPeople', 'dietAssignments', 'invitedMeals', 'updatedAt'\]\)/);
  assert.match(rules, /invitedMeals'[\s\S]*breakfast[\s\S]*lunch[\s\S]*dinner/);
  assert.match(rules, /get\('invitedMeals', \{\}\)\.get\('dinner', 0\) <= 999/);
});
