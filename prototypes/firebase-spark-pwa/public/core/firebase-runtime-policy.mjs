// La politica di trasporto considera il buffering delle risposte Firestore in WebKit, che può durare fino al successivo segnale di mantenimento della connessione.
export function firestoreSettingsForBrowser(browser = {}) {
  const ua = String(browser.userAgent || '');
  const isIOS = /iPad|iPhone|iPod/i.test(ua)
    || (browser.platform === 'MacIntel' && Number(browser.maxTouchPoints) > 1);
  const isMacSafari = /Macintosh/.test(ua) && /Safari/.test(ua)
    && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua);
  return isIOS || isMacSafari
    ? { experimentalForceLongPolling: true, useFetchStreams: false }
    : {};
}
