import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { functions } from '../helpers/app-functions.mjs';

const publicRoot = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const [html, css] = await Promise.all([
  readFile(new URL('index.html', publicRoot), 'utf8'),
  readFile(new URL('styles.css', publicRoot), 'utf8')
]);

test('refresh controls remain icon-only and retain a fixed mobile-safe width', () => {
  const controls = [...html.matchAll(/<button class="status-refresh-button"[\s\S]*?<\/button>/g)].map(match => match[0]);
  assert.equal(controls.length, 4);
  controls.forEach(control => {
    assert.match(control, /<span aria-hidden="true">↻<\/span>/);
    assert.doesNotMatch(control, /<strong\b/);
  });
  assert.match(css, /\.status-refresh-button\s*\{[\s\S]*?display: grid;[\s\S]*?width: 44px;[\s\S]*?height: 44px;[\s\S]*?place-items: center;/);
});

test('refresh icon becomes marked only for a recoverable communication state', () => {
  const makeElement = () => ({ textContent: '', dataset: {} });
  const elements = {
    participantStatus: makeElement(),
    weekStatus: makeElement(),
    summaryStatus: makeElement()
  };
  const state = {
    mode: 'week',
    mealRecoveryRunning: false,
    singleMealTracker: { values: () => [] }
  };
  const { setParticipantStatus, renderPendingMealStatus } = functions(
    ['setParticipantStatus', 'renderPendingMealStatus'],
    { elements, state, t: key => key }
  );

  setParticipantStatus('Aggiornato', 'current');
  assert.equal(elements.weekStatus.dataset.recoveryRequired, undefined);

  state.singleMealTracker.values = () => [{ isCurrent: () => true, waiting: true }];
  renderPendingMealStatus();
  assert.equal(elements.weekStatus.dataset.recoveryRequired, 'true');

  setParticipantStatus('Aggiornato', 'current');
  assert.equal(elements.weekStatus.dataset.recoveryRequired, undefined);
  assert.match(css, /\[data-freshness=previous\] ~ \.status-refresh-button span,[\s\S]*?\[data-recovery-required=true\] ~ \.status-refresh-button span/);
});
