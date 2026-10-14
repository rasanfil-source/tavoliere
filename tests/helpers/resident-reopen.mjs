import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { formatDateId } from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
export const reopenSources = {
  app: readFileSync(new URL('app.js', root), 'utf8'),
  participant: readFileSync(new URL('participant-data.js', root), 'utf8')
};
const extract = (source, name) => {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`));
  if (!match) throw new Error(`Missing function: ${name}`);
  return match[0];
};

// Execute real restoration/orchestration/publication functions with controlled
// I/O. This is neither a browser benchmark nor an emulation of Safari transport.
export function residentReopenHarness({ sources = reopenSources, read = async (_, value) => value,
  mode = 'week', profile = { participantId: 'person', signature: 'AA' } } = {}) {
  const events = [];
  const start = performance.now();
  const record = (name) => events.push({ name, ms: performance.now() - start });
  const user = { uid: 'restored-user', isAnonymous: true };
  const monthStart = new Date(2026, 9, 1, 12);
  const weekStart = new Date(2026, 9, 12, 12);
  const state = { mode, friendlyAccess: true, residentReady: false, residentRestorePending: true,
    participantRequestVersion: 0, summaryDayOffset: 0, pendingMealKeys: new Set(),
    participantWeek: [], participantMonth: [], centerContactSettings: { timezone: 'Europe/Rome' },
    weekStartDate: weekStart, monthDate: monthStart };
  const addCalendarDays = (date, n) => { const value = new Date(date); value.setDate(value.getDate() + n); return value; };
  const io = async (name, value) => { record(name); return read(name, value); };
  let authReady, sessionReady, settingsReady;
  const ensurePersonalSession = () => sessionReady ||= io('session', user);
  const loadParticipantWeek = async (_, startDate, count, options) => {
    if (!options.requireServer) throw new Error('Calendar requires server confirmation');
    await Promise.all(['mealTypes', 'mealWindows', 'overrides', 'rule'].map(name => io(name)));
    const days = Array.from({ length: count }, (_, index) => ({
      date: formatDateId(addCalendarDays(startDate, index)), label: `Day ${index}`, isToday: false,
      meals: ['breakfast', 'lunch', 'dinner'].map((mealTypeId, mealIndex) => ({
        mealTypeId, mealDate: formatDateId(addCalendarDays(startDate, index)),
        effect: (index + mealIndex) % 2 ? 'PRESENT' : 'ABSENT', isOpen: true,
        closesAt: '2050-01-01T12:00:00Z'
      }))
    }));
    Object.defineProperty(days, 'serverConfirmed', { value: true });
    return days;
  };
  const dependencies = {
    state, console: { error: (...args) => record(`error:${args[1] || ''}`) },
    participantCalendarRevision: 0, getCurrentUser: () => user, getActiveCenterId: () => 'center',
    getLocale: () => 'it', formatDateId, addCalendarDays,
    startOfMonth: date => new Date(date.getFullYear(), date.getMonth(), 1, 12),
    daysInMonth: date => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
    formatCalendarWeekLabel: () => { record('empty-week-label'); return ''; },
    getCenterToday: () => weekStart, getSelectedDay: () => null,
    waitForAuthReady: () => authReady ||= io('auth', user),
    getStrongAuthenticatedUser: () => null, getAuthorizedAdministratorUser: async () => null,
    loadStoredResidentSignature: () => 'AA', loadStoredResidentParticipantId: () => 'person',
    loadStoredResidentToken: () => ({ tokenId: 'token', expiresAt: '2050-01-01' }),
    ensurePersonalSession, ensureStoredResidentSession: ensurePersonalSession,
    loadPublicParticipantById: () => io('profile', profile),
    normalizeResidentSignature: value => value, rememberResidentIdentity: () => record('identity'),
    clearStoredResidentIdentity: () => record('clear-identity'), clearCurrentSession() {},
    signOutCurrentUser: async () => record('signout'),
    shouldBlockResidentEntryRestore: () => false, isResidentEntryGateClosed: () => false,
    hasStrongAdministratorIdentity: () => false, canUseWeekWithoutParticipant: () => false,
    renderResidentAccess() {}, renderMode() {}, renderCalendarPlaceholder() {},
    loadCenterCalendarSettings: () => settingsReady ||= io('settings', { timezone: 'Europe/Rome' }),
    applyResidentPreferences: value => value, anchorCalendarToCenterToday: () => false,
    loadParticipantWeek,
    loadParticipantMonthData: (id, date, options) => loadParticipantWeek(id, date, 31, options),
    prefetchNextParticipantMonth: () => record('prefetch-month'),
    savePersonalCalendarSnapshot: () => record('snapshot'),
    renderParticipantMeals: () => record('usable'), hideStartupSplash: () => record('hide'),
    refreshParticipantExtras: async () => { record('extras'); await read('extras'); },
    refreshMealRemindersAfterCalendar: async () => {}, formatRefreshLabel: () => '', setParticipantStatus() {},
    isCenterAccessRevokedError: error => error.code === 'permission-denied',
    isConnectionAvailable: () => false, isRecoverableSessionError: error => error.code === 'unavailable',
    shouldPreserveResidentViewAfterRefreshError: () => true, friendlyErrorMessage: () => '', t: key => key
  };
  const code = [extract(sources.participant, 'restoreFriendlyResidentSession'),
    ...['beginParticipantRequest', 'isCurrentParticipantRequest', 'currentPersonalCalendarScope',
      'preparePersonalCalendarRead', 'loadCurrentParticipantWeek', 'loadCurrentParticipantCalendar',
      'refreshParticipant'].map(name => extract(sources.app, name))].join('\n');
  const { refreshParticipant } = new Function(...Object.keys(dependencies),
    code + '\nreturn { refreshParticipant };')(...Object.values(dependencies));
  return { state, user, events, run: () => refreshParticipant('avvio'),
    names: () => events.map(event => event.name) };
}
