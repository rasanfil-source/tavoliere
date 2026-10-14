// Local, synthetic comparison of actual orchestration source against a Git ref.
// No production access, browser instrumentation or resident diagnostics.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { residentReopenHarness, reopenSources } from '../tests/helpers/resident-reopen.mjs';

const ref = process.argv[2] || '56d9aa8';
if (!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(ref)) throw new Error('Invalid Git ref');
const path = 'prototypes/firebase-spark-pwa/public/';
const previous = file => execFileSync('git', ['show', `${ref}:${path}${file}`], { encoding: 'utf8' });
const before = { app: previous('app.js'), participant: previous('participant-data.js') };
const trials = 7;
const ioDelayMs = 60;
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const samples = { before: [], after: [] };
const readCounts = {};
for (let trial = 0; trial < trials; trial++) {
  // Alternate order to reduce bias from JIT/host load. No timing threshold is a test.
  for (const label of trial % 2 ? ['after', 'before'] : ['before', 'after']) {
    const h = residentReopenHarness({ sources: label === 'before' ? before : reopenSources,
      read: async (name, value) => { if (name !== 'extras') await delay(ioDelayMs); return value; } });
    await h.run();
    const usable = h.events.find(event => event.name === 'usable');
    assert.ok(usable, 'calendar reached publication');
    assert.equal(h.state.participantWeek.flatMap(day => day.meals).length, 21);
    assert.equal(h.state.participantWeek[0].meals[1].effect, 'PRESENT');
    samples[label].push(usable.ms);
    readCounts[label] = h.events.filter(event => ['session', 'profile', 'settings',
      'mealTypes', 'mealWindows', 'overrides', 'rule'].includes(event.name)).length;
  }
}

function dateBenchmark(source) {
  let constructions = 0;
  const instrumentedIntl = { DateTimeFormat: function (...args) {
    constructions++;
    return new Intl.DateTimeFormat(...args);
  } };
  const { getDateInTimeZone } = new Function('Intl', source.replace(/^export /gm, '')
    + '\nreturn { getDateInTimeZone };')(instrumentedIntl);
  const instants = Array.from({ length: 1000 }, (_, i) => new Date(Date.UTC(2026, 9, 14, 21, i)));
  const start = performance.now();
  const results = instants.map(instant => getDateInTimeZone('Europe/Rome', instant).getTime());
  return { ms: performance.now() - start, constructions, results };
}
const dateBefore = dateBenchmark(previous('date-utils.mjs'));
const dateAfter = dateBenchmark(readFileSync(path + 'date-utils.mjs', 'utf8'));
assert.deepEqual(dateAfter.results, dateBefore.results, 'same dates including crossing midnight');
const oldBuild = JSON.parse(execFileSync('git', ['show',
  `${ref}:prototypes/firebase-spark-pwa/dist/build-manifest.json`], { encoding: 'utf8' }));
const newBuild = JSON.parse(readFileSync('prototypes/firebase-spark-pwa/dist/build-manifest.json', 'utf8'));
const residentSize = manifest => ({ files: manifest.resident.length,
  bytes: manifest.resident.reduce((sum, file) => sum + manifest.outputs[file].bytes, 0) });
console.log(JSON.stringify({
  baseline: ref, node: process.version, platform: process.platform,
  kind: 'Synthetic I/O in Node; DOM, WebKit, Auth network and Firestore transport are not measured',
  trials, ioDelayMs,
  publicationMs: { before: samples.before.map(n => +n.toFixed(2)), after: samples.after.map(n => +n.toFixed(2)),
    medianBefore: +median(samples.before).toFixed(2), medianAfter: +median(samples.after).toFixed(2) },
  logicalReads: readCounts,
  compiledResident: { before: residentSize(oldBuild), after: residentSize(newBuild) },
  isolatedDateHelper1000Calls: {
    beforeMs: +dateBefore.ms.toFixed(2), afterMs: +dateAfter.ms.toFixed(2),
    beforeConstructors: dateBefore.constructions, afterConstructors: dateAfter.constructions
  }
}, null, 2));
