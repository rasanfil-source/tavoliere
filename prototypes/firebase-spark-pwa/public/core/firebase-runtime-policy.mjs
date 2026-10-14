// WebKit can hold Firestore streaming responses until the next 30s ping.
// https://github.com/firebase/firebase-js-sdk/issues/9789
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
