import { t } from '../i18n/i18n.mjs?v=20260815q';

const AUTH_MESSAGES = Object.freeze({
  'auth/invalid-credential': 'errors.auth.invalidCredentials',
  'auth/invalid-email': 'errors.auth.invalidEmail',
  'auth/email-already-in-use': 'errors.auth.emailInUse',
  'auth/email-not-verified': 'errors.auth.emailNotVerified',
  'auth/network-request-failed': 'errors.network.generic',
  'auth/too-many-requests': 'errors.auth.tooManyRequests',
  'auth/user-disabled': 'errors.auth.userDisabled',
  'auth/user-not-found': 'errors.auth.invalidCredentials',
  'auth/weak-password': 'errors.auth.weakPassword',
  'auth/wrong-password': 'errors.auth.invalidCredentials'
});

function normalizedCode(error) {
  return String(error?.code || '').trim().toLowerCase();
}

function normalizedMessage(error) {
  return String(error?.message || '').trim().toLowerCase();
}

const RECOVERABLE_SESSION_CODES = new Set([
  'aborted',
  'auth/internal-error',
  'auth/network-request-failed',
  'auth/too-many-requests',
  'cancelled',
  'deadline-exceeded',
  'firestore/aborted',
  'firestore/cancelled',
  'firestore/deadline-exceeded',
  'firestore/internal',
  'firestore/permission-denied',
  'firestore/resource-exhausted',
  'firestore/unavailable',
  'internal',
  'permission-denied',
  'resource-exhausted',
  'unavailable'
]);

export function isRecoverableSessionError(error) {
  const code = normalizedCode(error);
  const message = normalizedMessage(error);
  return RECOVERABLE_SESSION_CODES.has(code)
    || message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('offline')
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('connessione')
    || message.includes('rete');
}

function withActionFallback(message, fallback) {
  const action = String(fallback || '').trim();
  return action ? `${message} ${action}` : message;
}

export function classifyApplicationError(error) {
  const code = normalizedCode(error);
  const message = normalizedMessage(error);

  if (code.startsWith('auth/')) return 'authentication';
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return 'permission';
  if (code === 'aborted' || code === 'firestore/aborted') return 'conflict';
  if (code === 'deadline-exceeded' || code === 'firestore/deadline-exceeded') return 'timeout';
  if (
    code === 'unavailable'
    || code === 'firestore/unavailable'
    || message.includes('offline')
    || message.includes('network')
    || message.includes('rete')
  ) return 'offline';
  return 'unknown';
}

export function toUserMessage(error, fallback = '') {
  const code = normalizedCode(error);
  if (AUTH_MESSAGES[code]) return t(AUTH_MESSAGES[code]);

  const defaultFallback = fallback || t('errors.generic');

  switch (classifyApplicationError(error)) {
    case 'permission':
      return withActionFallback(t('errors.permission'), fallback);
    case 'conflict':
      return withActionFallback(t('errors.conflict'), fallback);
    case 'timeout':
      return withActionFallback(t('errors.timeout'), fallback);
    case 'offline':
      return withActionFallback(t('errors.offline'), fallback);
    default:
      {
        const message = String(error?.message || '').trim();
        return message && !message.startsWith('Firebase:') ? message : defaultFallback;
      }
  }
}
