// Opt-in, local-only timings. Labels must be fixed stage names, never identity
// values, credentials, URLs or Firestore payloads. Nothing is sent or stored.
const startupStages = new Set();

// One milestone per document, measured from navigation start, not from the
// start of a late async caller. This is DOM readiness, not a paint measurement.
export function markStartupStage(stage) {
  if (typeof window === 'undefined'
      || new URLSearchParams(window.location.search).get('diagnostics') !== 'startup'
      || !globalThis.performance?.now || startupStages.has(stage)) return;
  try {
    const end = performance.now();
    performance.measure(`tat:${stage}`, { start: 0, end });
    startupStages.add(stage);
    console.info('[tat-startup]', stage, Math.round(end), 'ms from navigation');
  } catch { /* Diagnostics must never interrupt startup. */ }
}

export async function measureStartupStep(stage, operation) {
  const enabled = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('diagnostics') === 'startup';
  const timer = globalThis.performance;
  if (!enabled || !timer?.now) return operation();
  const start = timer.now();
  try {
    return await operation();
  } finally {
    const end = timer.now();
    try { timer.measure(`tat:${stage}`, { start, end }); } catch {}
    console.info('[tat-startup]', stage, Math.round(end - start), 'ms');
  }
}
