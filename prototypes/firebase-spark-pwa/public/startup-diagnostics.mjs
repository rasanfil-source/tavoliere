// Solo ?perf=1: report locale privo di URL, identificativi, credenziali o dati pasti.
const diagnostic = globalThis.window?.__startupPerf;
if (diagnostic) {
  const longTasks = [], paints = {};
  const observers = [];
  for (const type of ['paint', 'largest-contentful-paint', 'longtask']) {
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (type === 'longtask') longTasks.push(entry.duration);
          else paints[type === 'paint' ? entry.name : 'largest-contentful-paint'] = entry.startTime;
        }
      });
      observer.observe({ type, buffered: true }); observers.push(observer);
    } catch { /* Safari può non esporre longtask o LCP. */ }
  }
  diagnostic.report = () => {
    const resources = performance.getEntriesByType('resource');
    const scripts = resources.filter(item => /\.(?:m?js)(?:\?|$)/.test(new URL(item.name).pathname));
    const firestore = resources.filter(item => new URL(item.name).hostname === 'firestore.googleapis.com');
    return {
      schema: 1, marksMs: { ...diagnostic.marks }, paintsMs: { ...paints },
      appEvaluationMs: diagnostic.marks['app-initialized'] - diagnostic.marks['app-evaluation-start'] || null,
      scriptResources: scripts.length, scriptTransferBytes: scripts.reduce((sum, item) => sum + item.transferSize, 0),
      firestoreTransportRequests: firestore.length,
      longTasks: { supported: PerformanceObserver.supportedEntryTypes?.includes('longtask') === true,
        count: longTasks.length, totalMs: longTasks.reduce((sum, value) => sum + value, 0) },
      serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
      note: 'Splash nascosto non significa calendario pronto. Tempi locali; richieste di trasporto non equivalgono a letture Firestore. Byte da cache possono essere zero. Valutazione app esclude download, parse e dipendenze.'
    };
  };
  const mount = () => {
    const panel = document.createElement('details');
    panel.dataset.startupDiagnostics = '';
    panel.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:10010;max-width:90vw;max-height:60vh;overflow:auto;background:#fff;color:#172b3a;border:1px solid;padding:8px;font:12px monospace';
    const summary = document.createElement('summary'); summary.textContent = 'Diagnostica avvio (locale)';
    const text = document.createElement('pre'); text.style.whiteSpace = 'pre-wrap';
    const update = document.createElement('button'); update.textContent = 'Aggiorna';
    update.onclick = () => { text.textContent = JSON.stringify(diagnostic.report(), null, 2); };
    const save = document.createElement('button'); save.textContent = 'Esporta JSON';
    save.onclick = () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(diagnostic.report(), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'avvio-app.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const close = document.createElement('button'); close.textContent = 'Chiudi';
    close.onclick = () => {
      observers.forEach(observer => observer.disconnect()); panel.remove();
      try { localStorage.removeItem('tavolaComune.startupDiagnosticsUntil'); } catch {}
      delete window.__startupPerf;
    };
    panel.append(summary, update, save, close, text);
    panel.addEventListener('toggle', () => { if (panel.open) update.click(); });
    document.body.append(panel);
  };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });
}
