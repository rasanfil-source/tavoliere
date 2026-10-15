import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/core/startup-timing.mjs', import.meta.url), 'utf8')
  .replaceAll('export ', '');

test('startup milestones are opt-in, navigation-relative and emitted once per document', () => {
  for (const enabled of [false, true]) {
    const measures = [], logs = [];
    const context = vm.createContext({ URLSearchParams,
      window: { location: { search: enabled ? '?diagnostics=startup&token=private' : '?token=private' } },
      performance: { now: () => 1250, measure: (name, options) => measures.push({ name, ...options }) },
      console: { info: (...args) => logs.push(args) }
    });
    vm.runInContext(source, context);
    context.markStartupStage('calendar-ready');
    context.markStartupStage('calendar-ready');
    assert.deepEqual(measures, enabled ? [{ name: 'tat:calendar-ready', start: 0, end: 1250 }] : []);
    assert.equal(logs.length, enabled ? 1 : 0);
    assert.doesNotMatch(JSON.stringify({ measures, logs }), /private/);
  }
});

test('unavailable or failing performance APIs do not interrupt startup', () => {
  for (const performance of [undefined, { now: () => 1, measure: () => { throw Error('unsupported'); } }]) {
    const context = vm.createContext({ URLSearchParams, performance,
      window: { location: { search: '?diagnostics=startup' } }
    });
    vm.runInContext(source, context);
    assert.doesNotThrow(() => context.markStartupStage('calendar-ready'));
  }
});
