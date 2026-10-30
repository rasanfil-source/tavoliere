// Misure locali attivabili esplicitamente. Le etichette identificano fasi fisse, senza identità, credenziali, URL o dati Firestore. Nulla viene inviato o salvato.
const startupStages = new Set();
const PAINT_DIAGNOSTIC_TYPES = ['paint', 'largest-contentful-paint'];

export function observeStartupPaintMetrics() {
  if (typeof window === 'undefined'
      || new URLSearchParams(window.location.search).get('diagnostics') !== 'startup'
      || typeof PerformanceObserver !== 'function') return;

  PAINT_DIAGNOSTIC_TYPES.forEach((type) => {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const stage = type === 'paint' ? entry.name : 'largest-contentful-paint';
          const time = Math.round(entry.startTime);
          try { performance.measure(`tat:${stage}`, { start: 0, end: entry.startTime }); } catch {}
          console.info('[tat-startup]', stage, time, 'ms from navigation');
        });
      });
      observer.observe({ type, buffered: true });
    } catch { /* Le metriche paint variano tra i browser e restano facoltative. */ }
  });
}

// Una misura per documento a partire dalla navigazione. Indica la disponibilità del DOM, non il completamento del disegno sullo schermo.
export function markStartupStage(stage) {
  if (typeof window === 'undefined'
      || new URLSearchParams(window.location.search).get('diagnostics') !== 'startup'
      || !globalThis.performance?.now || startupStages.has(stage)) return;
  try {
    const end = performance.now();
    performance.measure(`tat:${stage}`, { start: 0, end });
    startupStages.add(stage);
    console.info('[tat-startup]', stage, Math.round(end), 'ms from navigation');
  } catch { /* La diagnostica non deve interrompere l'avvio. */ }
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
