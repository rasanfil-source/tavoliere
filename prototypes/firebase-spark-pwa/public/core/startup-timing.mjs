// Opt-in, local-only timings. Labels must be fixed stage names, never identity
// values, credentials, URLs or Firestore payloads. Nothing is sent or stored.
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
